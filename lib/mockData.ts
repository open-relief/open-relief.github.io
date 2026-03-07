// Mock data for Open Relief Platform

export type Campaign = {
  id: string;
  title: string;
  disaster: string;
  location: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  status: "active" | "completed" | "paused";
  createdAt: string;
  beneficiaries: number;
  urgency: "critical" | "high" | "medium";
};

export type Donor = {
  id: string;
  name: string;
  email: string;
  totalDonated: number;
  donations: Donation[];
};

export type Donation = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "refunded";
};

export type Recipient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  verified: boolean;
  applications: Application[];
};

export type Application = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  requestedAmount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "paid";
  appliedAt: string;
  paidAt?: string;
};

export type PayoutRequest = {
  id: string;
  recipientId: string;
  recipientName: string;
  campaignId: string;
  campaignTitle: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "paid";
  submittedAt: string;
  location: string;
};

export const campaigns: Campaign[] = [];

export const payoutRequests: PayoutRequest[] = [];

export const donations: Donation[] = [];

export const adminStats = {
  totalCampaigns: 0,
  activeCampaigns: 0,
  totalRaised: 0,
  totalBeneficiaries: 0,
  pendingPayouts: 0,
  totalPaidOut: 0,
  totalDonors: 0,
  totalRecipients: 0,
};

export const recipientApplications: Application[] = [];
