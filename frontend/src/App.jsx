import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Parties from './pages/Parties';
import CreateParty from './pages/CreateParty';
import PartyDetails from './pages/PartyDetails';
import PartyDashboard from './pages/PartyDashboard';
import WhatsAppSettings from './pages/WhatsAppSettings';
import PaymentSuccess from './pages/PaymentSuccess';
import NotFound from './pages/NotFound';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return user ? <Navigate to="/dashboard" /> : children;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="parties" element={<Parties />} />
        <Route path="parties/new" element={<CreateParty />} />
        <Route path="parties/:id" element={<PartyDetails />} />
        <Route path="parties/:id/dashboard" element={<PartyDashboard />} />
        <Route path="whatsapp" element={<WhatsAppSettings />} />
        <Route path="app/payment/success" element={<PaymentSuccess />} />
      </Route>
      {/* Rota 404 - catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
