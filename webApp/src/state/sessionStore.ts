import { AppRoute, DonationLog, FundingRequest, Session, User } from '../types/models';

type SessionState = {
  currentSession: Session | null;
  currentRoute: AppRoute;
};

const users: User[] = [
  {
    id: 'admin-1',
    email: 'avon2ramesh@gmail.com',
    password: 'admin',
    role: 'admin',
    isFirstSignup: false
  }
];

const fundingRequests: FundingRequest[] = [];
const donationLogs: DonationLog[] = [];

const sessionState: SessionState = {
  currentSession: null,
  currentRoute: 'login'
};

const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const sessionStore = {
  users,
  fundingRequests,
  donationLogs,
  sessionState,
  randomId
};
