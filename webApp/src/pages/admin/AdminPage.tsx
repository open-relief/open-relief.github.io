import { DonationLog, FundingRequest, Session, User } from '../../types/models';

type Props = {
  session: Session;
  users: User[];
  donationLogs: DonationLog[];
  fundingRequests: FundingRequest[];
  onApprove: (requestId: string, userId: string) => Promise<void>;
  onReject: (requestId: string) => void;
};

export function AdminPage({ session, users, donationLogs, fundingRequests, onApprove, onReject }: Props) {
  if (session.user.role !== 'admin') {
    return <p className="status error">Admin access only.</p>;
  }

  const emailByUserId = (userId: string) => users.find((user) => user.id === userId)?.email || userId;

  return (
    <section className="panel">
      <h2>Admin Dashboard</h2>

      <article className="request-card">
        <h3>Donation Activity</h3>
        {donationLogs.length === 0 ? (
          <p>No donations yet.</p>
        ) : (
          <ul className="metrics-list">
            {donationLogs.map((donation) => (
              <li key={donation.id}>
                {emailByUserId(donation.userId)} donated {donation.amount} at {new Date(donation.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="request-card">
        <h3>Funding Requests</h3>
        {fundingRequests.length === 0 ? (
          <p>No funding requests yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Requested Amount</th>
                <th>Reason</th>
                <th>Urgency</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fundingRequests.map((request) => (
                <tr key={request.id}>
                  <td>{emailByUserId(request.userId)}</td>
                  <td>{request.requestedAmount}</td>
                  <td>{request.reason}</td>
                  <td>{request.urgency}</td>
                  <td>{new Date(request.timestamp).toLocaleString()}</td>
                  <td>
                    {request.status === 'pending' ? (
                      <div className="row-actions">
                        <button onClick={() => onApprove(request.id, request.userId)}>Approve</button>
                        <button className="danger" onClick={() => onReject(request.id)}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`badge ${request.status}`}>{request.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
