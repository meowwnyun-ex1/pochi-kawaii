import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        return (_jsx("div", { className: "flex items-center justify-center h-screen gradient-background", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4", role: "status", "aria-label": t('common.loading') || 'Loading...' }), _jsx("p", { className: "text-pink-600 font-medium", children: t('common.loading') || 'Loading...' })] }) }));
    }
    return (_jsxs("div", { className: "flex flex-col h-screen gradient-background overflow-hidden pb-12", children: [_jsx(AnnouncementPopup, {}), _jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx(AppHeader, { onMenuClick: () => setSidebarOpen(!sidebarOpen) }), _jsx("div", { className: "flex-1 flex min-h-0 relative pt-16", children: _jsx("div", { className: "flex-1 flex flex-col min-w-0", children: _jsx("div", { className: "relative z-0 flex-1 overflow-y-auto", children: _jsx(ImageGenerator, {}) }) }) }), _jsx(AppFooter, { showCarousel: false })] }));
};
export default Index;
