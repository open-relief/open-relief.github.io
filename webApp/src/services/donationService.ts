import { sessionStore } from '../state/sessionStore';

async function sendDonation(amount: number) {
  return {
    status: 'ok',
    message: `Donation request submitted for ${amount}.`
  };
}

export const donationService = {
  async donate(userId: string, amount: number) {
    await sendDonation(amount);
    sessionStore.donationLogs.unshift({
      id: sessionStore.randomId('donation'),
      userId,
      amount,
      timestamp: new Date().toISOString()
    });
  }
};

export { sendDonation };
