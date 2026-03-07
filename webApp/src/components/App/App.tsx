import './App.css';

import { useMemo, useState } from 'react';

type InterledgerClient = {
  setSelfAccount: (value: string) => void;
  setTargetAccount: (value: string) => void;
  setStreamEndpoint: (value: string) => void;
  setAuthToken: (value: string) => void;
  sendPayment: (amount: number) => Promise<unknown>;
};

type PaymentStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

type StreamPaymentRequest = {
  senderAccount: string;
  destinationPaymentPointer: string;
  sourceAmount: string;
  protocol: 'STREAM';
};

function normalizeEndpoint(value: string): string {
  return value.trim();
}

function createInterledgerClient(): InterledgerClient {
  let selfAccount = '';
  let targetAccount = '';
  let streamEndpoint = normalizeEndpoint(import.meta.env.VITE_STREAM_SENDER_ENDPOINT ?? '');
  let authToken = (import.meta.env.VITE_INTERLEDGER_API_TOKEN ?? '').trim();

  return {
    setSelfAccount: (value: string) => {
      selfAccount = value;
    },
    setTargetAccount: (value: string) => {
      targetAccount = value;
    },
    setStreamEndpoint: (value: string) => {
      streamEndpoint = normalizeEndpoint(value);
    },
    setAuthToken: (value: string) => {
      authToken = value.trim();
    },
    sendPayment: async (amount: number) => {
      if (!selfAccount) {
        throw new Error('Sender ILP account is required.');
      }
      if (!targetAccount) {
        throw new Error('Destination payment pointer is required.');
      }
      if (!streamEndpoint) {
        throw new Error('Interledger STREAM endpoint is required.');
      }

      const payload: StreamPaymentRequest = {
        senderAccount: selfAccount,
        destinationPaymentPointer: targetAccount,
        sourceAmount: String(Math.trunc(amount)),
        protocol: 'STREAM'
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(responseText || `STREAM payment failed with HTTP ${response.status}.`);
      }

      if (!responseText) {
        return {
          senderAccount: selfAccount,
          destinationPaymentPointer: targetAccount,
          sourceAmount: String(Math.trunc(amount)),
          protocol: 'STREAM',
          status: 'ok'
        };
      }

      try {
        return JSON.parse(responseText);
      } catch {
        return responseText;
      }
    }
  };
}

export function App() {
  const interledgerClient = useMemo(() => createInterledgerClient(), []);

  const [streamEndpoint, setStreamEndpoint] = useState(import.meta.env.VITE_STREAM_SENDER_ENDPOINT ?? '');
  const [apiToken, setApiToken] = useState(import.meta.env.VITE_INTERLEDGER_API_TOKEN ?? '');
  const [selfIlp, setSelfIlp] = useState('$alice.example.com');
  const [targetIlp, setTargetIlp] = useState('$bob.example.com');
  const [amount, setAmount] = useState('100');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>({
    kind: 'idle',
    message: 'Set your STREAM endpoint, ILP accounts, and amount, then click Send Payment.'
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
      interledgerClient.setStreamEndpoint(streamEndpoint);
      interledgerClient.setAuthToken(apiToken);
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
        <p className="subtitle">Send a STREAM-compatible Interledger payment request.</p>

        <label>
          STREAM Sender Endpoint
          <input
            type="url"
            value={streamEndpoint}
            onChange={(event) => setStreamEndpoint(event.target.value)}
            placeholder="http://localhost:3000/stream/send"
          />
        </label>

        <label>
          Bearer Token (optional)
          <input
            type="password"
            value={apiToken}
            onChange={(event) => setApiToken(event.target.value)}
            placeholder="Paste API token if required"
            autoComplete="off"
          />
        </label>

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
