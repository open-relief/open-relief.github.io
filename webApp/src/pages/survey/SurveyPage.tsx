import { FormEvent, useState } from 'react';

import { FormInput } from '../../components/FormInput/FormInput';
import { SurveyData } from '../../types/models';

type Props = {
  onSubmit: (surveyData: SurveyData) => void;
};

export function SurveyPage({ onSubmit }: Props) {
  const [householdSize, setHouseholdSize] = useState('');
  const [incomePerCapita, setIncomePerCapita] = useState('');
  const [location, setLocation] = useState('');
  const [paymentPointer, setPaymentPointer] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      householdSize: Number(householdSize),
      incomePerCapita: Number(incomePerCapita),
      location,
      paymentPointer,
      notes
    });
  };

  return (
    <section className="panel">
      <h2>First-Time Onboarding Survey</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <FormInput label="Household size" type="number" min="1" value={householdSize} onChange={(e) => setHouseholdSize(e.target.value)} required />
        <FormInput
          label="Income per capita"
          type="number"
          min="0"
          value={incomePerCapita}
          onChange={(e) => setIncomePerCapita(e.target.value)}
          required
        />
        <FormInput label="Location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <FormInput
          label="Wallet payment pointer"
          type="text"
          value={paymentPointer}
          onChange={(e) => setPaymentPointer(e.target.value)}
          placeholder="$wallet.example.com"
          required
        />
        <FormInput label="Optional notes" multiline rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="submit">Submit survey</button>
      </form>
    </section>
  );
}
