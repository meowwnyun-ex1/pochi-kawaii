import { useState } from 'react';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import Sidebar from '@/components/Sidebar';
import ImageGenerator from '@/components/ImageGenerator';
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  const { t, loading } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen gradient-background">
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            role="status"
            aria-label={t('common.loading') || 'Loading...'}
          />
          <p className="text-pink-600 font-medium">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen gradient-background overflow-hidden pb-12">
      <AnnouncementPopup />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex min-h-0 relative pt-16">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative z-0 flex-1 overflow-y-auto">
            <ImageGenerator />
          </div>
        </div>
      </div>

      <AppFooter showCarousel={false} />
    </div>
  );
};

export default Index;
