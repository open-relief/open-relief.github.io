import { FormEvent, useState } from 'react';

import { FormInput } from '../../components/FormInput/FormInput';

type Props = {
  onSignup: (email: string, password: string) => void;
  onGoToLogin: () => void;
};

export function SignupPage({ onSignup, onGoToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSignup(email, password);
  };

  return (
    <section className="panel">
      <h2>Sign Up</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <FormInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <FormInput
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit">Continue to onboarding survey</button>
      </form>
      <button className="secondary" onClick={onGoToLogin}>Back to login</button>
    </section>
  );
}
