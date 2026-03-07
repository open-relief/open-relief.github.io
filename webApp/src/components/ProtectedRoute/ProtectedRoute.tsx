import { ReactNode } from 'react';

import { Session } from '../../types/models';

type Props = {
  session: Session | null;
  allow: Array<'admin' | 'user'>;
  children: ReactNode;
};

export function ProtectedRoute({ session, allow, children }: Props) {
  if (!session) {
    return <p className="status error">You must login first.</p>;
  }

  if (!allow.includes(session.user.role)) {
    return <p className="status error">You are not authorized to view this page.</p>;
  }

  return <>{children}</>;
}
