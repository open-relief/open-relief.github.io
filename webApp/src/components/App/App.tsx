import './App.css';

import { FormEvent, useMemo, useState } from 'react';

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

type Page = 'home' | 'request' | 'status' | 'admin';

type AidRequestStatus = 'pending' | 'approved' | 'rejected' | 'paid';

type AidRequest = {
  id: string;
  requesterName: string;
  contact: string;
  location: string;
  wallet: string;
  requestedAmount: number;
  reason: string;
  status: AidRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  payoutResult?: string;
};

type AdminSettings = {
  fundWallet: string;
  streamEndpoint: string;
  apiToken: string;
};

type StreamPaymentRequest = {
  senderAccount: string;
  destinationPaymentPointer: string;
  sourceAmount: string;
  protocol: 'STREAM';
};

type RequestFormState = {
  requesterName: string;
  contact: string;
  location: string;
  wallet: string;
  requestedAmount: string;
  reason: string;
};

const REQUESTS_STORAGE_KEY = 'hackomania-emergency-requests';
const SETTINGS_STORAGE_KEY = 'hackomania-admin-settings';
const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123';

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeRequestId(): string {
  return `REQ-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeEndpoint(value: string): string {
  return value.trim();
}

function explainNetworkFailure(streamEndpoint: string): string {
  const hints = [
    `Could not reach STREAM endpoint: ${streamEndpoint}`,
    'Make sure a backend server is running at this URL.',
    'Ensure CORS allows requests from this website origin.'
  ];

  if (window.location.protocol === 'https:' && streamEndpoint.startsWith('http://')) {
    hints.push('Your site is HTTPS but endpoint is HTTP. Use an HTTPS endpoint to avoid browser blocking.');
  }

  return hints.join(' ');
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

      try {
        new URL(streamEndpoint);
      } catch {
        throw new Error('STREAM endpoint must be a valid URL, e.g. https://api.example.com/stream/send');
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

      let response: Response;
      try {
        response = await fetch(streamEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      } catch {
        throw new Error(explainNetworkFailure(streamEndpoint));
      }

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

  const [page, setPage] = useState<Page>('home');

  const [requests, setRequests] = useState<AidRequest[]>(() =>
    readStoredJson<AidRequest[]>(REQUESTS_STORAGE_KEY, [])
  );

  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() =>
    readStoredJson<AdminSettings>(SETTINGS_STORAGE_KEY, {
      fundWallet: '',
      streamEndpoint: import.meta.env.VITE_STREAM_SENDER_ENDPOINT ?? '',
      apiToken: import.meta.env.VITE_INTERLEDGER_API_TOKEN ?? ''
    })
  );

  const [requestForm, setRequestForm] = useState<RequestFormState>({
    requesterName: '',
    contact: '',
    location: '',
    wallet: '',
    requestedAmount: '50',
    reason: ''
  });

  const [lookupId, setLookupId] = useState('');
  const [latestRequestId, setLatestRequestId] = useState('');

  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [payingRequestId, setPayingRequestId] = useState('');

  const [requestNotice, setRequestNotice] = useState<PaymentStatus>({
    kind: 'idle',
    message: 'Fill the form to request emergency support.'
  });

  const [adminNotice, setAdminNotice] = useState<PaymentStatus>({
    kind: 'idle',
    message: 'Admin actions and payout events will appear here.'
  });

  const totals = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((request) => request.status === 'pending').length,
      approved: requests.filter((request) => request.status === 'approved').length,
      paid: requests.filter((request) => request.status === 'paid').length
    };
  }, [requests]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [requests]);

  const matchedRequest = useMemo(() => {
    const needle = lookupId.trim().toLowerCase();
    if (!needle) {
      return null;
    }
    return requests.find((request) => request.id.toLowerCase() === needle) ?? null;
  }, [lookupId, requests]);

  const saveRequests = (nextRequests: AidRequest[]) => {
    setRequests(nextRequests);
    writeStoredJson(REQUESTS_STORAGE_KEY, nextRequests);
  };

  const saveAdminSettings = (nextSettings: AdminSettings) => {
    setAdminSettings(nextSettings);
    writeStoredJson(SETTINGS_STORAGE_KEY, nextSettings);
  };

  const handleSubmitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(requestForm.requestedAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setRequestNotice({ kind: 'error', message: 'Requested amount must be a positive number.' });
      return;
    }

    if (!requestForm.wallet.trim()) {
      setRequestNotice({ kind: 'error', message: 'Wallet / payment pointer is required.' });
      return;
    }

    const newRequest: AidRequest = {
      id: makeRequestId(),
      requesterName: requestForm.requesterName.trim(),
      contact: requestForm.contact.trim(),
      location: requestForm.location.trim(),
      wallet: requestForm.wallet.trim(),
      requestedAmount: Math.trunc(parsedAmount),
      reason: requestForm.reason.trim(),
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    const nextRequests = [newRequest, ...requests];
    saveRequests(nextRequests);

    setLatestRequestId(newRequest.id);
    setLookupId(newRequest.id);
    setRequestForm({
      requesterName: '',
      contact: '',
      location: '',
      wallet: '',
      requestedAmount: '50',
      reason: ''
    });

    setRequestNotice({
      kind: 'success',
      message: `Request submitted. Save your Request ID: ${newRequest.id}`
    });
  };

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (adminPasswordInput === DEFAULT_ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
      setAdminNotice({ kind: 'success', message: 'Admin login successful.' });
      return;
    }
    setAdminNotice({ kind: 'error', message: 'Invalid admin password.' });
  };

  const updateRequestStatus = (requestId: string, nextStatus: AidRequestStatus) => {
    const nextRequests = requests.map((request) => {
      if (request.id !== requestId) {
        return request;
      }
      return {
        ...request,
        status: nextStatus,
        reviewedAt: new Date().toISOString()
      };
    });

    saveRequests(nextRequests);

    setAdminNotice({
      kind: 'success',
      message: `Request ${requestId} marked as ${nextStatus}.`
    });
  };

  const handlePayout = async (request: AidRequest) => {
    if (!adminSettings.fundWallet.trim()) {
      setAdminNotice({ kind: 'error', message: 'Set the emergency fund wallet in Admin Settings first.' });
      return;
    }

    if (!adminSettings.streamEndpoint.trim()) {
      setAdminNotice({ kind: 'error', message: 'Set the STREAM sender endpoint in Admin Settings first.' });
      return;
    }

    setPayingRequestId(request.id);
    setAdminNotice({ kind: 'idle', message: `Sending payout for ${request.id}...` });

    try {
      interledgerClient.setStreamEndpoint(adminSettings.streamEndpoint);
      interledgerClient.setAuthToken(adminSettings.apiToken);
      interledgerClient.setSelfAccount(adminSettings.fundWallet);
      interledgerClient.setTargetAccount(request.wallet);
      const result = await interledgerClient.sendPayment(request.requestedAmount);

      const nextRequests: AidRequest[] = requests.map((current) => {
        if (current.id !== request.id) {
          return current;
        }
        return {
          ...current,
          status: 'paid' as AidRequestStatus,
          reviewedAt: new Date().toISOString(),
          payoutResult: JSON.stringify(result)
        };
      });

      saveRequests(nextRequests);

      setAdminNotice({
        kind: 'success',
        message: `Payout sent for ${request.id}.`
      });
    } catch (error) {
      console.error('Payment failed', error);
      setAdminNotice({
        kind: 'error',
        message: `Payout failed: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setPayingRequestId('');
    }
  };

  return (
    <main className="app-shell">
      <section className="portal">
        <header className="portal-header">
          <h1>Community Emergency Fund</h1>
          <p>Community-powered requests and admin-managed instant payouts via Interledger.</p>
        </header>

        <nav className="top-nav">
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>
            Home
          </button>
          <button className={page === 'request' ? 'active' : ''} onClick={() => setPage('request')}>
            Request Aid
          </button>
          <button className={page === 'status' ? 'active' : ''} onClick={() => setPage('status')}>
            Check Status
          </button>
          <button className={page === 'admin' ? 'active' : ''} onClick={() => setPage('admin')}>
            Admin Panel
          </button>
        </nav>

        {page === 'home' && (
          <section className="panel grid-panel">
            <article className="info-card">
              <h2>How It Works</h2>
              <p>
                Residents submit emergency requests, admins review evidence, and approved requests are paid instantly from
                the fund wallet.
              </p>
            </article>
            <article className="info-card">
              <h2>Live Summary</h2>
              <ul className="metrics-list">
                <li>Total Requests: {totals.total}</li>
                <li>Pending Review: {totals.pending}</li>
                <li>Approved: {totals.approved}</li>
                <li>Paid: {totals.paid}</li>
              </ul>
            </article>
            <article className="info-card">
              <h2>Transparency Rule</h2>
              <p>Every request keeps a visible status trail: submitted, reviewed, approved or rejected, and paid.</p>
            </article>
          </section>
        )}

        {page === 'request' && (
          <section className="panel">
            <h2>Request Emergency Support</h2>
            <p className="subtitle">Submit your details so admins can review and approve payouts quickly.</p>

            <form className="form-grid" onSubmit={handleSubmitRequest}>
              <label>
                Full Name
                <input
                  type="text"
                  value={requestForm.requesterName}
                  onChange={(event) => setRequestForm({ ...requestForm, requesterName: event.target.value })}
                  required
                />
              </label>

              <label>
                Contact
                <input
                  type="text"
                  value={requestForm.contact}
                  onChange={(event) => setRequestForm({ ...requestForm, contact: event.target.value })}
                  placeholder="Phone or email"
                  required
                />
              </label>

              <label>
                Location
                <input
                  type="text"
                  value={requestForm.location}
                  onChange={(event) => setRequestForm({ ...requestForm, location: event.target.value })}
                  placeholder="City / district"
                  required
                />
              </label>

              <label>
                Wallet / Payment Pointer
                <input
                  type="text"
                  value={requestForm.wallet}
                  onChange={(event) => setRequestForm({ ...requestForm, wallet: event.target.value })}
                  placeholder="$you.example.com"
                  required
                />
              </label>

              <label>
                Requested Amount
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={requestForm.requestedAmount}
                  onChange={(event) => setRequestForm({ ...requestForm, requestedAmount: event.target.value })}
                  required
                />
              </label>

              <label>
                Reason
                <textarea
                  value={requestForm.reason}
                  onChange={(event) => setRequestForm({ ...requestForm, reason: event.target.value })}
                  rows={4}
                  placeholder="Describe your emergency situation"
                  required
                />
              </label>

              <button type="submit">Submit Request</button>
            </form>

            <p className={`status ${requestNotice.kind}`}>{requestNotice.message}</p>
            {latestRequestId && <p className="request-id">Latest Request ID: {latestRequestId}</p>}
          </section>
        )}

        {page === 'status' && (
          <section className="panel">
            <h2>Check Request Status</h2>
            <p className="subtitle">Enter your Request ID to track review and payout progress.</p>

            <label>
              Request ID
              <input
                type="text"
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                placeholder="REQ-..."
              />
            </label>

            {!lookupId.trim() && <p className="status idle">Enter a request ID to view details.</p>}

            {lookupId.trim() && !matchedRequest && <p className="status error">No request found for that ID.</p>}

            {matchedRequest && (
              <article className="request-card">
                <h3>{matchedRequest.id}</h3>
                <p>
                  <strong>Name:</strong> {matchedRequest.requesterName}
                </p>
                <p>
                  <strong>Location:</strong> {matchedRequest.location}
                </p>
                <p>
                  <strong>Wallet:</strong> {matchedRequest.wallet}
                </p>
                <p>
                  <strong>Amount:</strong> {matchedRequest.requestedAmount}
                </p>
                <p>
                  <strong>Status:</strong> <span className={`badge ${matchedRequest.status}`}>{matchedRequest.status}</span>
                </p>
              </article>
            )}
          </section>
        )}

        {page === 'admin' && (
          <section className="panel">
            <h2>Admin Panel</h2>

            {!isAdminAuthenticated && (
              <form className="admin-login" onSubmit={handleAdminLogin}>
                <label>
                  Admin Password
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(event) => setAdminPasswordInput(event.target.value)}
                    placeholder="Enter admin password"
                    required
                  />
                </label>
                <button type="submit">Login</button>
              </form>
            )}

            {isAdminAuthenticated && (
              <>
                <section className="admin-settings">
                  <h3>Fund & API Settings</h3>
                  <div className="form-grid">
                    <label>
                      Fund Wallet (Admin)
                      <input
                        type="text"
                        value={adminSettings.fundWallet}
                        onChange={(event) =>
                          saveAdminSettings({
                            ...adminSettings,
                            fundWallet: event.target.value
                          })
                        }
                        placeholder="$community-fund.example.com"
                      />
                    </label>

                    <label>
                      STREAM Sender Endpoint
                      <input
                        type="url"
                        value={adminSettings.streamEndpoint}
                        onChange={(event) =>
                          saveAdminSettings({
                            ...adminSettings,
                            streamEndpoint: event.target.value
                          })
                        }
                        placeholder="http://localhost:3000/stream/send"
                      />
                    </label>

                    <label>
                      Bearer Token (optional)
                      <input
                        type="password"
                        value={adminSettings.apiToken}
                        onChange={(event) =>
                          saveAdminSettings({
                            ...adminSettings,
                            apiToken: event.target.value
                          })
                        }
                        autoComplete="off"
                      />
                    </label>
                  </div>
                </section>

                <section className="admin-queue">
                  <h3>Request Queue</h3>
                  {sortedRequests.length === 0 && <p className="status idle">No requests yet.</p>}

                  {sortedRequests.map((request) => (
                    <article className="request-card" key={request.id}>
                      <h4>{request.id}</h4>
                      <p>
                        <strong>{request.requesterName}</strong> requested <strong>{request.requestedAmount}</strong>
                      </p>
                      <p>{request.reason}</p>
                      <p>
                        Wallet: <code>{request.wallet}</code>
                      </p>
                      <p>
                        Status: <span className={`badge ${request.status}`}>{request.status}</span>
                      </p>

                      <div className="row-actions">
                        {request.status === 'pending' && (
                          <>
                            <button type="button" onClick={() => updateRequestStatus(request.id, 'approved')}>
                              Approve
                            </button>
                            <button type="button" className="danger" onClick={() => updateRequestStatus(request.id, 'rejected')}>
                              Reject
                            </button>
                          </>
                        )}

                        {request.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handlePayout(request)}
                            disabled={payingRequestId === request.id}
                          >
                            {payingRequestId === request.id ? 'Paying...' : 'Pay Out Now'}
                          </button>
                        )}
                      </div>

                      {request.payoutResult && (
                        <details>
                          <summary>Payout Result</summary>
                          <pre>{request.payoutResult}</pre>
                        </details>
                      )}
                    </article>
                  ))}
                </section>
              </>
            )}

            <p className={`status ${adminNotice.kind}`}>{adminNotice.message}</p>
          </section>
        )}
      </section>
    </main>
  );
}
