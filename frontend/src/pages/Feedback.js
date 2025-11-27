import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import Sidebar from '@/components/Sidebar';
import FeedbackCarousel from '@/components/FeedbackCarousel';
import FeedbackForm from '@/components/FeedbackForm';
const Feedback = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "flex flex-col h-screen gradient-background overflow-hidden pb-12", children: [_jsx(AnnouncementPopup, {}), _jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx(AppHeader, { onMenuClick: () => setSidebarOpen(!sidebarOpen) }), _jsx(FeedbackCarousel, {}), _jsx(FeedbackForm, {}), _jsx(AppFooter, {})] }));
};
export default Feedback;
