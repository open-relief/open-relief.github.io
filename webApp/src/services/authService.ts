import { sessionStore } from '../state/sessionStore';
import { Session, User } from '../types/models';

function findUserByEmail(email: string) {
  return sessionStore.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export const authService = {
  signup(email: string, password: string): Session {
    const existing = findUserByEmail(email);
    if (existing) {
      throw new Error('User already exists. Please log in instead.');
    }

    const user: User = {
      id: sessionStore.randomId('user'),
      email,
      password,
      role: 'user',
      isFirstSignup: true
    };

    sessionStore.users.push(user);
    const session: Session = { user };
    sessionStore.sessionState.currentSession = session;
    sessionStore.sessionState.currentRoute = 'survey';

    return session;
  },

  login(email: string, password: string): Session {
    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.');
    }

    const session: Session = { user };
    sessionStore.sessionState.currentSession = session;
    sessionStore.sessionState.currentRoute = user.role === 'admin' ? 'admin' : 'dashboard';

    return session;
  },

  logout() {
    sessionStore.sessionState.currentSession = null;
    sessionStore.sessionState.currentRoute = 'login';
  }
};
