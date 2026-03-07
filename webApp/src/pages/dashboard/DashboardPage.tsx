import { Session } from '../../types/models';

type Props = {
  session: Session;
  onNavigate: (route: 'donate' | 'request-funding') => void;
};

export function DashboardPage({ session, onNavigate }: Props) {
  return (
    <section className="panel">
      <h2>User Dashboard</h2>
      <p>Welcome, {session.user.email}</p>
      <div className="row-actions">
        <button onClick={() => onNavigate('donate')}>Donate</button>
        <button onClick={() => onNavigate('request-funding')}>Request Funding</button>
      </div>
      <article className="request-card">
        <h3>Profile Data (from onboarding survey)</h3>
        {session.surveyData ? (
          <ul className="metrics-list">
            <li>Household Size: {session.surveyData.householdSize}</li>
            <li>Income per Capita: {session.surveyData.incomePerCapita}</li>
            <li>Location: {session.surveyData.location}</li>
            <li>Payment Pointer: {session.surveyData.paymentPointer}</li>
            <li>Notes: {session.surveyData.notes || '—'}</li>
          </ul>
        ) : (
          <p>No survey data in this active session.</p>
        )}
      </article>
    </section>
  );
}
