import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Menu from './components/Menu';
import LoyaltyCard from './components/LoyaltyCard';
import Gallery from './components/Gallery';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { AuthProvider, useAuth } from './components/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { analyticsService } from './src/analytics';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin" />;
};

const AppContent: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view when route changes
    const pageName = location.pathname === '/' ? 'home' : location.pathname.substring(1);
    analyticsService.trackPageView(pageName);
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={
        <>
          <Header />
          <Hero />
          <About />
          <Menu />
          <LoyaltyCard />
          <Gallery />
          <Contact />
          <Footer />
        </>
      } />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <I18nProvider>
        <Router>
          <AppContent />
        </Router>
      </I18nProvider>
    </AuthProvider>
  );
};

export default App;
