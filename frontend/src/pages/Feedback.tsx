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
    <div className="flex flex-col h-screen gradient-background overflow-hidden pb-12">
      <AnnouncementPopup />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <FeedbackCarousel />
      <FeedbackForm />
      <AppFooter />
    </div>
  );
};

export default Feedback;
