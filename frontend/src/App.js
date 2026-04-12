import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AssetUpload } from './components/AssetUpload';
import { ScriptGenerator } from './components/ScriptGenerator';
import { CreateContent } from './components/CreateContent';
import { Gallery } from './components/Gallery';
import { Login } from './components/auth/Login';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { VerifyEmail } from './components/auth/VerifyEmail';
import { Pricing } from './components/Pricing';
import { BetaAgreementModal } from './components/BetaAgreementModal';
import './App.css';

// Wraps all authenticated routes — shows agreement modal until user accepts.
const ProtectedApp = () => {
  const { user, loading, acceptAgreement } = useAuth();

  if (loading) return null;

  // Not logged in — redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but hasn't accepted the beta agreement yet
  if (user.has_agreed === false) {
    return <BetaAgreementModal onAccepted={acceptAgreement} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<AssetUpload />} />
        <Route path="/scripts" element={<ScriptGenerator />} />
        <Route path="/create" element={<CreateContent />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
