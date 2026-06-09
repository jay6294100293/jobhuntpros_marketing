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
import { Landing } from './components/Landing';
import { LogoCreator } from './components/LogoCreator';
import LegalDocs from './components/LegalDocs';
import { BrandProfiles } from './components/BrandProfiles';
import { TutorialStudio } from './components/TutorialStudio';
import './App.css';

// Wraps all authenticated routes — shows landing page or app depending on auth.
const ProtectedApp = () => {
  const { user, loading, acceptAgreement } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-8">
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '14px 24px' }}>
        <img src="/logo.png" alt="LaunchBusiness AI" style={{ height: 72 }} />
      </div>
      <div className="flex items-center gap-2">
        {[0, 150, 300].map((delay, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );

  // Not logged in — show landing page
  if (!user) return <Landing />;

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
        <Route path="/logo" element={<LogoCreator />} />
        <Route path="/legal" element={<LegalDocs />} />
        <Route path="/brands" element={<BrandProfiles />} />
        <Route path="/tutorial" element={<TutorialStudio />} />
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
          <Route path="/register" element={<Login register />} />
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
