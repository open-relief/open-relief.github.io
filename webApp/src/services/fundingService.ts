import { sessionStore } from '../state/sessionStore';
import { FundingRequest } from '../types/models';

async function triggerPayout(paymentPointer: string, amount: number) {
  return {
    status: 'ok',
    message: `Triggered payout of ${amount} to ${paymentPointer}`
  };
}

export const fundingService = {
  createRequest(input: Omit<FundingRequest, 'id' | 'timestamp' | 'status'>) {
    const request: FundingRequest = {
      ...input,
      id: sessionStore.randomId('funding'),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    sessionStore.fundingRequests.unshift(request);
    return request;
  },

  getRequests() {
    return sessionStore.fundingRequests;
  },

  async approve(requestId: string, paymentPointer: string) {
    const request = sessionStore.fundingRequests.find((item) => item.id === requestId);
    if (!request) {
      throw new Error('Request not found.');
    }

    request.status = 'approved';
    await triggerPayout(paymentPointer, request.requestedAmount);
    return request;
  },

  reject(requestId: string) {
    const request = sessionStore.fundingRequests.find((item) => item.id === requestId);
    if (!request) {
      throw new Error('Request not found.');
    }
    request.status = 'rejected';
    return request;
  }
};

export { triggerPayout };
