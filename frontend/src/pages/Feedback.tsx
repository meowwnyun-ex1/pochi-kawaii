import { useState } from 'react';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import Sidebar from '@/components/Sidebar';
import FeedbackCarousel from '@/components/FeedbackCarousel';
import FeedbackForm from '@/components/FeedbackForm';

const Feedback = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 overflow-hidden pb-12">
      <AnnouncementPopup />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <FeedbackCarousel />
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-y-auto pb-4 pt-4">
        <FeedbackForm />
      </div>
      <AppFooter />
    </div>
  );
};

export default Feedback;
