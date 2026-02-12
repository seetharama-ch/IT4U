import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import TicketList from './components/TicketList';
import CreateTicket from './components/CreateTicket';
import TicketDetails from './components/TicketDetails';
import Login from './components/Login';
import KnowledgeBase from './components/KnowledgeBase';
import UserList from './components/UserList';
import ReportsPage from './components/ReportsPage';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import EmailAuditDashboard from './components/EmailAuditDashboard';
import NotFound from './components/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LogProvider } from './context/LogContext';
import SessionManager from './utils/SessionManager';
import SessionExpiryModal from './components/SessionExpiryModal';

import Header from './components/Header';
import Footer from './components/Footer';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return user ? children : null;
};

const RoleRedirector = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'EMPLOYEE': return <Navigate to="/app/employee" replace />;
    case 'MANAGER': return <Navigate to="/app/manager" replace />;
    case 'IT_SUPPORT': return <Navigate to="/app/it-support" replace />;
    case 'ADMIN': return <Navigate to="/app/admin" replace />;
    default: return <Navigate to="/app/employee" replace />;
  }
};

const AppLayout = () => {
  return (
    <div className="app-background">
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300 flex flex-col">
        <Header />
        <main className="flex-grow p-4">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </div>
  );
};

import { debugLog } from './utils/debug';

const RouteLogger = () => {
  const location = useLocation();

  React.useEffect(() => {
    debugLog(`Route Changed: ${location.pathname}${location.search}`);
  }, [location]);

  return null;
};

function AppContent() {
  useLocation(); // Verify we vary ? No need if RouteLogger does it.

  // We need to use RouteLogger inside a component that is child of Router.
  // AppContent IS child of BrowserRouter.

  const { user, loading, logout } = useAuth();
  const [sessionWarning, setSessionWarning] = React.useState({
    isVisible: false,
    remainingSeconds: 120
  });

  // Session Manager Integration
  React.useEffect(() => {
    if (!user) {
      // User not logged in, stop session manager
      SessionManager.stop();
      return;
    }

    // User is logged in, start session tracking
    const handleWarning = ({ type, remainingSeconds }) => {
      if (type === 'SHOW') {
        setSessionWarning({ isVisible: true, remainingSeconds });
      } else if (type === 'HIDE') {
        setSessionWarning({ isVisible: false, remainingSeconds: 120 });
      }
    };

    const handleAutoLogout = () => {
      console.log('[App] Auto-logout triggered by SessionManager');
      logout();
    };

    SessionManager.start(handleWarning, handleAutoLogout);

    return () => {
      SessionManager.stop();
    };
  }, [user, logout]);

  const handleStayLoggedIn = async () => {
    try {
      await SessionManager.extendSession();
      setSessionWarning({ isVisible: false, remainingSeconds: 120 });
    } catch (error) {
      console.error('[App] Session extension failed:', error);
      // Session likely expired, logout
      logout();
    }
  };

  const handleLogoutFromModal = () => {
    logout();
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Main App Structure */}
        <Route path="/app" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<RoleRedirector />} />

          {/* Role Dashboards */}
          <Route path="employee" element={<TicketList />} />
          <Route path="manager" element={<TicketList />} />
          <Route path="it-support" element={<TicketList />} />
          <Route path="admin" element={
            <ErrorBoundary>
              <TicketList />
            </ErrorBoundary>
          } />

          {/* Features */}
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={
            <ErrorBoundary>
              <TicketDetails />
            </ErrorBoundary>
          } />
          <Route path="kb" element={<KnowledgeBase />} />



          {/* Admin Tools */}
          <Route path="admin/users" element={
            <ErrorBoundary>
              <UserList />
            </ErrorBoundary>
          } />
          <Route path="admin/diagnostics" element={<DiagnosticsPanel />} />
          <Route path="admin/reports" element={<ReportsPage />} />
          <Route path="admin/email-audit" element={<EmailAuditDashboard />} />
        </Route>

        {/* Redirects/Canonical Routes */}
        {/* Redirects/Canonical Routes */}
        <Route
          path="/create"
          element={
            <PrivateRoute>
              <Navigate to="/app/tickets/new" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/new-ticket"
          element={
            <PrivateRoute>
              <Navigate to="/app/tickets/new" replace />
            </PrivateRoute>
          }
        />

        {/* Legacy Redirect for direct links - Moved to Root */}
        <Route path="/tickets/:id" element={<Navigate to="/app/tickets/:id" replace />} />


        {/* Roots & Fallbacks */}
        <Route path="/" element={<PrivateRoute><RoleRedirector /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <RouteLogger />
      <SessionExpiryModal
        isVisible={sessionWarning.isVisible}
        remainingSeconds={sessionWarning.remainingSeconds}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleLogoutFromModal}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LogProvider>
            <AppContent />
            <Toaster position="top-right" />
          </LogProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
