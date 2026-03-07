import { FormEvent, useState } from 'react';

type Props = {
  onDonate: (amount: number) => Promise<void>;
};

export function DonatePage({ onDonate }: Props) {
  const [amount, setAmount] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onDonate(Number(amount));
    setAmount('');
  };

  return (
    <section className="panel">
      <h2>Donate to Community Emergency Fund</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Amount</span>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <button type="submit">Donate</button>
      </form>
    </section>
  );
}
