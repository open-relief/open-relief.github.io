import './App.css';

import { useMemo, useState } from 'react';

type InterledgerClient = {
  setSelfAccount: (value: string) => void;
  setTargetAccount: (value: string) => void;
  sendPayment: (amount: number) => Promise<unknown>;
};

type PaymentStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

type StreamSendResponse = {
  id?: string;
  status?: string;
  deliveredAmount?: string | number;
  [key: string]: unknown;
};

function createStreamCompatibleInterledgerClient(): InterledgerClient {
  let selfAccount = '';
  let targetAccount = '';
  const streamEndpoint =
    import.meta.env.VITE_STREAM_SENDER_ENDPOINT ?? 'http://localhost:3000/stream/send';

  return {
    setSelfAccount: (value: string) => {
      selfAccount = value;
    },
    setTargetAccount: (value: string) => {
      targetAccount = value;
    },
    sendPayment: async (amount: number) => {
      if (!selfAccount) {
        throw new Error('Sender ILP account is required.');
      }
      if (!targetAccount) {
        throw new Error('Destination payment pointer is required.');
      }

      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senderAccount: selfAccount,
          destinationPaymentPointer: targetAccount,
          sourceAmount: String(Math.trunc(amount)),
          protocol: 'STREAM'
        })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `STREAM payment failed with HTTP ${response.status}.`);
      }

      const raw = (await response.json()) as StreamSendResponse;
      return {
        ...raw,
        senderAccount: selfAccount,
        destinationPaymentPointer: targetAccount,
        sourceAmount: String(Math.trunc(amount)),
        protocol: 'STREAM'
      };
    }
  };
}

export function App() {
  const interledgerClient = useMemo(() => createStreamCompatibleInterledgerClient(), []);

  const [selfIlp, setSelfIlp] = useState('$alice.example.com');
  const [targetIlp, setTargetIlp] = useState('$bob.example.com');
  const [amount, setAmount] = useState('100');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>({
    kind: 'idle',
    message: 'Enter ILP accounts and an amount, then click Send Payment.'
  });

  const handleSendPayment = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus({ kind: 'error', message: 'Amount must be a positive number.' });
      return;
    }

    setIsSending(true);
    setStatus({ kind: 'idle', message: 'Sending payment...' });

    try {
      interledgerClient.setSelfAccount(selfIlp.trim());
      interledgerClient.setTargetAccount(targetIlp.trim());
      const result = await interledgerClient.sendPayment(parsedAmount);

      setStatus({
        kind: 'success',
        message: `Payment sent successfully. Result: ${JSON.stringify(result)}`
      });
    } catch (error) {
      console.error('Payment failed', error);
      setStatus({
        kind: 'error',
        message: `Payment failed: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="payment-card">
        <h1>Interledger Payment Demo</h1>
        <p className="subtitle">Send a STREAM-compatible Interledger payment.</p>

        <label>
          Self ILP Address
          <input
            type="text"
            value={selfIlp}
            onChange={(event) => setSelfIlp(event.target.value)}
            placeholder="$alice.example.com"
          />
        </label>

        <label>
          Target ILP Address
          <input
            type="text"
            value={targetIlp}
            onChange={(event) => setTargetIlp(event.target.value)}
            placeholder="$bob.example.com"
          />
        </label>

        <label>
          Amount
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <button type="button" onClick={handleSendPayment} disabled={isSending}>
          {isSending ? 'Sending...' : 'Send Payment'}
        </button>

        <p className={`status ${status.kind}`}>{status.message}</p>
      </section>
    </main>
  );
}
