import './App.css';

import { useState } from 'react';

import { Navbar } from '../Navbar/Navbar';
import { ProtectedRoute } from '../ProtectedRoute/ProtectedRoute';
import { authService } from '../../services/authService';
import { donationService } from '../../services/donationService';
import { fundingService } from '../../services/fundingService';
import { sessionStore } from '../../state/sessionStore';
import { AdminPage } from '../../pages/admin/AdminPage';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { DonatePage } from '../../pages/donate/DonatePage';
import { LoginPage } from '../../pages/login/LoginPage';
import { RequestFundingPage } from '../../pages/request-funding/RequestFundingPage';
import { SignupPage } from '../../pages/signup/SignupPage';
import { SurveyPage } from '../../pages/survey/SurveyPage';
import { AppRoute, Session, SurveyData } from '../../types/models';

export function App() {
  const [session, setSession] = useState<Session | null>(sessionStore.sessionState.currentSession);
  const [route, setRoute] = useState<AppRoute>(sessionStore.sessionState.currentRoute);
  const [notice, setNotice] = useState('Prototype mode: all data is in-memory and resets on refresh.');

  const navigate = (nextRoute: AppRoute) => {
    sessionStore.sessionState.currentRoute = nextRoute;
    setRoute(nextRoute);
  };

  const refreshSession = () => {
    setSession(sessionStore.sessionState.currentSession);
  };

  const handleLogin = (email: string, password: string) => {
    try {
      const nextSession = authService.login(email, password);
      setSession(nextSession);
      navigate(nextSession.user.role === 'admin' ? 'admin' : 'dashboard');
      setNotice('Logged in successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Login failed.');
    }
  };

  const handleSignup = (email: string, password: string) => {
    try {
      authService.signup(email, password);
      refreshSession();
      navigate('survey');
      setNotice('Account created. Please finish first-time onboarding.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Signup failed.');
    }
  };

  const handleSurveySubmit = (surveyData: SurveyData) => {
    if (!sessionStore.sessionState.currentSession) {
      setNotice('No active session. Please login again.');
      navigate('login');
      return;
    }

    sessionStore.sessionState.currentSession = {
      ...sessionStore.sessionState.currentSession,
      surveyData,
      user: {
        ...sessionStore.sessionState.currentSession.user,
        isFirstSignup: false
      }
    };

    refreshSession();
    navigate('dashboard');
    setNotice('Onboarding survey submitted and attached to this session.');
  };

  const handleDonate = async (amount: number) => {
    if (!session) {
      setNotice('Please login first.');
      return;
    }

    await donationService.donate(session.user.id, amount);
    setNotice('Thank you for contributing to the community emergency fund.');
  };

  const handleRequestFunding = (input: { requestedAmount: number; reason: string; urgency: 'low' | 'medium' | 'high' }) => {
    if (!session) {
      setNotice('Please login first.');
      return;
    }

    fundingService.createRequest({
      userId: session.user.id,
      requestedAmount: input.requestedAmount,
      reason: input.reason,
      urgency: input.urgency
    });

    setNotice('Funding request submitted successfully.');
  };

  const handleApprove = async (requestId: string, userId: string) => {
    const requesterSession = sessionStore.users.find((user) => user.id === userId);
    if (!requesterSession) {
      setNotice('Could not find user for payout.');
      return;
    }

    const payoutPointer = sessionStore.sessionState.currentSession?.surveyData?.paymentPointer || '$example.wallet/alice';
    await fundingService.approve(requestId, payoutPointer);
    setNotice(`Request ${requestId} approved and payout triggered.`);
    setRoute('admin');
  };

  const handleReject = (requestId: string) => {
    fundingService.reject(requestId);
    setNotice(`Request ${requestId} rejected.`);
    setRoute('admin');
  };

  const handleLogout = () => {
    authService.logout();
    refreshSession();
    navigate('login');
    setNotice('Logged out.');
  };

  return (
    <main className="app-shell">
      <section className="portal">
        <header className="portal-header">
          <h1>Community Emergency Fund Prototype</h1>
          <p>Open Payments-powered donation and emergency relief flow with in-memory role-based controls.</p>
        </header>

        <Navbar session={session} currentRoute={route} onNavigate={navigate} onLogout={handleLogout} />

        {route === 'login' && <LoginPage onLogin={handleLogin} onGoToSignup={() => navigate('signup')} />}
        {route === 'signup' && <SignupPage onSignup={handleSignup} onGoToLogin={() => navigate('login')} />}
        {route === 'survey' && (
          <ProtectedRoute session={session} allow={['user']}>
            <SurveyPage onSubmit={handleSurveySubmit} />
          </ProtectedRoute>
        )}
        {route === 'dashboard' && (
          <ProtectedRoute session={session} allow={['user']}>
            {session ? <DashboardPage session={session} onNavigate={navigate} /> : null}
          </ProtectedRoute>
        )}
        {route === 'donate' && (
          <ProtectedRoute session={session} allow={['user', 'admin']}>
            <DonatePage onDonate={handleDonate} />
          </ProtectedRoute>
        )}
        {route === 'request-funding' && (
          <ProtectedRoute session={session} allow={['user', 'admin']}>
            <RequestFundingPage onRequestFunding={handleRequestFunding} />
          </ProtectedRoute>
        )}
        {route === 'admin' && (
          <ProtectedRoute session={session} allow={['admin']}>
            {session ? (
              <AdminPage
                session={session}
                users={sessionStore.users}
                donationLogs={sessionStore.donationLogs}
                fundingRequests={fundingService.getRequests()}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : null}
          </ProtectedRoute>
        )}

        <p className="status idle">{notice}</p>
      </section>
    </main>
  );
}
