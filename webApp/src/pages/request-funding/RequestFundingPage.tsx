import { FormEvent, useState } from 'react';

type Props = {
  onRequestFunding: (input: { requestedAmount: number; reason: string; urgency: 'low' | 'medium' | 'high' }) => void;
};

export function RequestFundingPage({ onRequestFunding }: Props) {
  const [requestedAmount, setRequestedAmount] = useState('');
  const [reasonForRequest, setReasonForRequest] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onRequestFunding({
      requestedAmount: Number(requestedAmount),
      reason: reasonForRequest,
      urgency: urgencyLevel
    });
    setRequestedAmount('');
    setReasonForRequest('');
    setUrgencyLevel('medium');
  };

  return (
    <section className="panel">
      <h2>Request Emergency Funding</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Requested Amount</span>
          <input type="number" min="1" value={requestedAmount} onChange={(event) => setRequestedAmount(event.target.value)} required />
        </label>
        <label className="field">
          <span>Reason for Request</span>
          <textarea rows={4} value={reasonForRequest} onChange={(event) => setReasonForRequest(event.target.value)} required />
        </label>
        <label className="field">
          <span>Urgency Level</span>
          <select value={urgencyLevel} onChange={(event) => setUrgencyLevel(event.target.value as 'low' | 'medium' | 'high')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <button type="submit">Submit funding request</button>
      </form>
    </section>
  );
}
