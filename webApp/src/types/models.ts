export type Role = 'admin' | 'user';

export type User = {
  id: string;
  email: string;
  password: string;
  role: Role;
  isFirstSignup: boolean;
};

export type SurveyData = {
  householdSize: number;
  incomePerCapita: number;
  location: string;
  paymentPointer: string;
  notes?: string;
};

export type FundingRequest = {
  id: string;
  userId: string;
  requestedAmount: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type DonationLog = {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
};

export type Session = {
  user: User;
  surveyData?: SurveyData;
};

export type AppRoute =
  | 'login'
  | 'signup'
  | 'survey'
  | 'dashboard'
  | 'donate'
  | 'request-funding'
  | 'admin';
