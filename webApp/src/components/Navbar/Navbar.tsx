import { AppRoute, Session } from '../../types/models';

type Props = {
  session: Session | null;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
};

export function Navbar({ session, currentRoute, onNavigate, onLogout }: Props) {
  if (!session) {
    return null;
  }

  const routes: Array<{ key: AppRoute; label: string }> =
    session.user.role === 'admin'
      ? [{ key: 'admin', label: 'Admin Dashboard' }]
      : [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'donate', label: 'Donate' },
          { key: 'request-funding', label: 'Request Funding' }
        ];

  return (
    <nav className="top-nav">
      {routes.map((route) => (
        <button key={route.key} className={currentRoute === route.key ? 'active' : ''} onClick={() => onNavigate(route.key)}>
          {route.label}
        </button>
      ))}
      <button onClick={onLogout}>Logout</button>
    </nav>
  );
}
