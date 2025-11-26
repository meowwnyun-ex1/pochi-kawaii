import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Construction, ArrowLeft } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import Sidebar from '@/components/Sidebar';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import FeedbackCarousel from '@/components/FeedbackCarousel';
import { useState } from 'react';

const Developing = () => {
  const navigate = useNavigate();
  const { language, config } = useLanguage();

  const developingTexts = (config?.developing_page as Record<string, Record<string, string>> | undefined) || {
    title: {
      th: 'กำลังพัฒนา',
      en: 'Under Development',
      jp: '開発中'
    },
    message: {
      th: 'ขออภัย ฟีเจอร์นี้อยู่ระหว่างการพัฒนา',
      en: 'Sorry, this feature is under development',
      jp: '申し訳ございません、この機能は開発中です'
    },
    description: {
      th: 'เรากำลังพัฒนาฟีเจอร์นี้ให้ดียิ่งขึ้น กรุณารอติดตามในเร็วๆ นี้',
      en: 'We are working to make this feature better. Please stay tuned',
      jp: 'この機能をより良くするために作業中です。お楽しみに'
    },
    backButton: {
      th: 'กลับหน้าหลัก',
      en: 'Back to Home',
      jp: 'ホームに戻る'
    }
  };

  const lang = language as 'th' | 'en' | 'jp';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 overflow-hidden pb-12">
      <AnnouncementPopup />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <FeedbackCarousel />
      <div className="flex-1 flex items-center justify-center p-4 pt-16">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border-2 border-gray-200/50 p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center">
                <Construction className="h-12 w-12 text-orange-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            {developingTexts.title[lang]}
          </h1>

          <p className="text-gray-600 mb-2">
            {developingTexts.message[lang]}
          </p>

          <p className="text-sm text-gray-500 mb-8">
            {developingTexts.description[lang]}
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 via-purple-500 to-indigo-500 hover:from-sky-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
            <ArrowLeft className="h-5 w-5" />
            <span>{developingTexts.backButton[lang]}</span>
          </button>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default Developing;
