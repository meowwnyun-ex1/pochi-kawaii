import { useState, useEffect } from 'react';
import AdminPanel from '@/components/AdminPanel';
import AdminLogin from '@/components/AdminLogin';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import Sidebar from '@/components/Sidebar';
import FeedbackCarousel from '@/components/FeedbackCarousel';

const Admin = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Clear any existing token on mount
    localStorage.removeItem('admin_token');
    setAuthToken(null);
    setIsLoggedIn(false);
  }, []);

  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsLoggedIn(false);
  };

  return (
    <div className="flex flex-col h-screen gradient-background overflow-hidden pb-12">
      <AnnouncementPopup />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <FeedbackCarousel />
      <div className="flex-1 pt-16 overflow-y-auto">
        {isLoggedIn && authToken ? (
          <AdminPanel authToken={authToken} onLogout={handleLogout} />
        ) : (
          <AdminLogin onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
      <AppFooter showCarousel={false} />
    </div>
  );
};

export default Admin;
