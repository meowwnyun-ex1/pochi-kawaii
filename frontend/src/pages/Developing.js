import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const developingTexts = config?.developing_page || {
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
    const lang = language;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "flex flex-col h-screen gradient-background overflow-hidden pb-12", children: [_jsx(AnnouncementPopup, {}), _jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx(AppHeader, { onMenuClick: () => setSidebarOpen(!sidebarOpen) }), _jsx(FeedbackCarousel, {}), _jsx("div", { className: "flex-1 flex items-center justify-center p-4 pt-16", children: _jsxs("div", { className: "max-w-md w-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-2 border-pink-100 p-8 text-center", children: [_jsx("div", { className: "flex justify-center mb-6", children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-24 h-24 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center", children: _jsx(Construction, { className: "h-12 w-12 text-pink-500" }) }), _jsx("div", { className: "absolute -top-1 -right-1 w-6 h-6 bg-pink-500 rounded-full animate-pulse" })] }) }), _jsx("h1", { className: "text-2xl font-bold text-pink-700 mb-3", children: developingTexts.title[lang] }), _jsx("p", { className: "text-pink-600 mb-2", children: developingTexts.message[lang] }), _jsx("p", { className: "text-sm text-pink-500 mb-8", children: developingTexts.description[lang] }), _jsxs("button", { onClick: () => navigate('/'), className: "w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 hover:from-pink-500 hover:via-rose-500 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-lg", children: [_jsx(ArrowLeft, { className: "h-5 w-5" }), _jsx("span", { children: developingTexts.backButton[lang] })] })] }) }), _jsx(AppFooter, {})] }));
};
export default Developing;
