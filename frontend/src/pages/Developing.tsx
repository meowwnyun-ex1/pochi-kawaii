import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import Sidebar from '@/components/Sidebar';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import FeedbackCarousel from '@/components/FeedbackCarousel';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const Developing = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-pink-50 via-rose-50/30 to-pink-50/20 overflow-hidden pb-12">
      <AnnouncementPopup />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <FeedbackCarousel />
      <div className="flex-1 flex items-center justify-center p-4 pt-16">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border-2 border-gray-200/50 p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center">
                <Construction className="h-12 w-12 text-pink-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-pink-500 rounded-full animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">{t('developing:title')}</h1>

          <p className="text-gray-600 mb-2">{t('developing:message')}</p>

          <p className="text-sm text-gray-500 mb-8">{t('developing:description')}</p>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:via-rose-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
            <ArrowLeft className="h-5 w-5" />
            <span>{t('developing:back_button')}</span>
          </button>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default Developing;
