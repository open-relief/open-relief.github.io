import express from 'express'
import { ENFORCE_CALLBACK_HASH } from '../src/config.js'
import { transfers, fundRequests, persistFundRequests } from '../src/store.js'
import {
  createClient,
  getDonationRecipientConfig,
  donationRecipientIsConfigured,
  pollOutgoingPayment,
  cleanupTempKeyFile
} from '../src/payments.js'
import {
  calculateInteractionHashCandidates,
  safeEqualText,
  requireGrantAccessToken,
  runStep,
  normalizeError,
  buildCallbackHtml,
  amountValueToBigInt,
  formatAmountForHumans
} from '../src/helpers.js'

async function handleTransferCallback(req, res) {
  const transferId = String(req.query.transferId || '')
  const interactRef = String(req.query.interact_ref || '')
  const receivedHash = String(req.query.hash || '')

  if (!transferId || !interactRef) {
    return res.status(400).send(buildCallbackHtml({
      title: 'Missing Callback Data',
      message: 'transferId and interact_ref are required query parameters.',
      isError: true
    }))
  }

  const transfer = transfers.get(transferId)
  if (!transfer) {
    return res.status(404).send(buildCallbackHtml({
      title: 'Transfer Not Found',
      message: `No pending transfer found for transferId=${transferId}.`,
      isError: true
    }))
  }

  if (transfer.status === 'completed') {
    return res.send(buildCallbackHtml({
      title: 'Transfer Already Completed',
      message: 'This transfer has already been completed.',
      details: `Outgoing payment id: ${transfer.outgoingPaymentId || 'n/a'}`
    }))
  }

  try {
    if (receivedHash) {
      const expectedHashes = calculateInteractionHashCandidates({
        clientNonce: transfer.clientNonce,
        interactNonce: transfer.interactNonce,
        interactRef,
        grantRequestUrl: transfer.grantRequestUrl || transfer.senderAuthServer
      })

      const hashMatched = expectedHashes.some((candidate) => safeEqualText(candidate, receivedHash))

      if (!hashMatched) {
        const mismatchMessage =
          `Callback hash verification failed. received=${receivedHash}; ` +
          `expected one of: ${expectedHashes.join(', ')}`

        if (ENFORCE_CALLBACK_HASH) throw new Error(mismatchMessage)
        console.warn(`[transfer-callback] ${mismatchMessage}`)
      }
    }

    transfer.status = 'finalizing'

    const { client } = await runStep('Recreate authenticated client', () =>
      createClient({
        senderWalletAddress: transfer.senderWalletAddress,
        keyId: transfer.keyId,
        privateKeyPath: transfer.privateKeyPath
      })
    )

    const finalizedGrant = await runStep('Continue outgoing-payment grant', () =>
      client.grant.continue(
        { url: transfer.continueUri, accessToken: transfer.continueAccessToken },
        { interact_ref: interactRef }
      )
    )

    const outgoingAccessToken = requireGrantAccessToken(finalizedGrant, 'outgoing-payment continuation grant')

    const outgoingPayment = await runStep('Create outgoing payment', () =>
      client.outgoingPayment.create(
        { url: transfer.senderResourceServer, accessToken: outgoingAccessToken },
        { walletAddress: transfer.senderWalletAddress, quoteId: transfer.quoteId }
      )
    )

    const outgoingStatus = await pollOutgoingPayment({
      client,
      outgoingPaymentId: outgoingPayment.id,
      accessToken: outgoingAccessToken
    })

    const sentValue = amountValueToBigInt(outgoingStatus.sentAmount)
    const debitValue = amountValueToBigInt(outgoingStatus.debitAmount)

    if (outgoingStatus.failed) {
      throw new Error(
        `Outgoing payment failed after creation. sent=${formatAmountForHumans(outgoingStatus.sentAmount)} debit=${formatAmountForHumans(outgoingStatus.debitAmount)}`
      )
    }

    if (sentValue === 0n) {
      transfer.status = 'pending-settlement'
      transfer.completedAt = new Date().toISOString()
      transfer.outgoingPaymentId = outgoingPayment.id
      transfer.outgoingSentAmount = outgoingStatus.sentAmount
      transfer.outgoingDebitAmount = outgoingStatus.debitAmount

      if (transfer.type === 'admin-payout' && transfer.requestId && fundRequests.has(transfer.requestId)) {
        const requestRecord = fundRequests.get(transfer.requestId)
        requestRecord.status = 'approved'
        requestRecord.updatedAt = transfer.completedAt
        requestRecord.payoutStatus = 'pending-settlement'
        requestRecord.payoutError = ''
        requestRecord.payoutTransferId = transfer.transferId
        requestRecord.payoutOutgoingPaymentId = outgoingPayment.id
        requestRecord.payoutRedirectUrl = null
        persistFundRequests()
      }

      cleanupTempKeyFile(transfer)

      const permissionHint = outgoingStatus._pollForbidden
        ? `\nStatus Poll Note: provider returned 403 when reading outgoing payment status. This usually means the grant needs read scope and should be fixed for new donations after this update.`
        : ''

      return res.send(buildCallbackHtml({
        title: 'Donation Created But Still Pending Settlement',
        message: 'The outgoing payment resource was created, but no funds have been sent yet. This can happen on test wallets while processing is pending.',
        details:
          `Transfer ID: ${transferId}\n` +
          `Outgoing Payment ID: ${outgoingPayment.id}\n` +
          `Sent: ${formatAmountForHumans(outgoingStatus.sentAmount)}\n` +
          `Expected Debit: ${formatAmountForHumans(outgoingStatus.debitAmount)}\n` +
          `Tip: refresh later, or check donor/recipient wallet UI for pending action.` +
          permissionHint
      }))
    }

    if (transfer.type === 'donation') {
      const donationRecipient = getDonationRecipientConfig()
      if (donationRecipientIsConfigured()) {
        try {
          const recipientBundle = await runStep('Create recipient client for incoming completion', () =>
            createClient({
              senderWalletAddress: donationRecipient.walletAddress,
              keyId: donationRecipient.keyId,
              privateKeyPath: donationRecipient.privateKeyInput
            })
          )

          const recipientClient = recipientBundle.client
          const recipientWallet = await runStep('Get recipient wallet for completion', () =>
            recipientClient.walletAddress.get({ url: donationRecipient.walletAddress })
          )

          const completeGrant = await runStep('Request recipient incoming complete grant', () =>
            recipientClient.grant.request(
              { url: recipientWallet.authServer },
              { access_token: { access: [{ type: 'incoming-payment', actions: ['complete'] }] } }
            )
          )

          const completeToken = requireGrantAccessToken(completeGrant, 'recipient incoming complete grant')

          await runStep('Complete recipient incoming payment', () =>
            recipientClient.incomingPayment.complete({
              url: transfer.incomingPaymentId,
              accessToken: completeToken
            })
          )

          if (recipientBundle.isTempKey) {
            cleanupTempKeyFile({
              privateKeyIsTemp: true,
              privateKeyPath: recipientBundle.resolvedPrivateKeyPath
            })
          }
        } catch (completeError) {
          console.warn('[transfer-callback] incoming completion skipped:', normalizeError(completeError))
        }
      }
    }

    transfer.status = 'completed'
    transfer.completedAt = new Date().toISOString()
    transfer.outgoingPaymentId = outgoingPayment.id
    transfer.outgoingSentAmount = outgoingStatus.sentAmount
    transfer.outgoingDebitAmount = outgoingStatus.debitAmount

    if (transfer.requestId && fundRequests.has(transfer.requestId)) {
      const requestRecord = fundRequests.get(transfer.requestId)
      requestRecord.status = 'funded'
      requestRecord.fundedAt = new Date().toISOString()
      requestRecord.updatedAt = requestRecord.fundedAt
      requestRecord.fundedTransferId = transfer.transferId

      if (transfer.type === 'admin-payout') {
        requestRecord.payoutStatus = 'completed'
        requestRecord.payoutError = ''
        requestRecord.payoutTransferId = transfer.transferId
        requestRecord.payoutOutgoingPaymentId = outgoingPayment.id
        requestRecord.payoutRedirectUrl = null
      }

      persistFundRequests()
    }

    cleanupTempKeyFile(transfer)

    return res.send(buildCallbackHtml({
      title: 'Transfer Completed',
      message: 'Outgoing payment was created and funds were sent.',
      details:
        `Transfer ID: ${transferId}\n` +
        `Outgoing Payment ID: ${outgoingPayment.id}\n` +
        `Sent: ${formatAmountForHumans(outgoingStatus.sentAmount)}\n` +
        `Debited: ${formatAmountForHumans(outgoingStatus.debitAmount)}\n` +
        `Progress: ${sentValue.toString()} of ${debitValue.toString()} minor units`
    }))
  } catch (error) {
    transfer.status = 'failed'
    transfer.error = normalizeError(error)
    console.error('[transfer-callback]', transfer.error)

    if (transfer.type === 'admin-payout' && transfer.requestId && fundRequests.has(transfer.requestId)) {
      const requestRecord = fundRequests.get(transfer.requestId)
      requestRecord.status = 'approved'
      requestRecord.updatedAt = new Date().toISOString()
      requestRecord.payoutStatus = 'failed'
      requestRecord.payoutError = transfer.error
      requestRecord.payoutTransferId = transfer.transferId
      requestRecord.payoutRedirectUrl = null
      persistFundRequests()
    }

    cleanupTempKeyFile(transfer)

    return res.status(500).send(buildCallbackHtml({
      title: 'Transfer Failed',
      message: 'The transfer could not be finalized.',
      details: transfer.error,
      isError: true
    }))
  }
}

const router = express.Router()
router.get('/api/transfer/callback', handleTransferCallback)
router.get('/api/donations/callback', handleTransferCallback)
router.get('/api/admin/payout/callback', handleTransferCallback)

export default router
