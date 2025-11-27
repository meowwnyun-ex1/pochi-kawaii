import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [authToken, setAuthToken] = useState(null);
    useEffect(() => {
        // Clear any existing token on mount
        localStorage.removeItem('admin_token');
        setAuthToken(null);
        setIsLoggedIn(false);
    }, []);
    const handleLoginSuccess = (token) => {
        setAuthToken(token);
        setIsLoggedIn(true);
    };
    const handleLogout = () => {
        setAuthToken(null);
        setIsLoggedIn(false);
    };
    return (_jsxs("div", { className: "flex flex-col h-screen gradient-background overflow-hidden pb-12", children: [_jsx(AnnouncementPopup, {}), _jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx(AppHeader, { onMenuClick: () => setSidebarOpen(!sidebarOpen) }), _jsx(FeedbackCarousel, {}), _jsx("div", { className: "flex-1 pt-16 overflow-y-auto", children: isLoggedIn && authToken ? (_jsx(AdminPanel, { authToken: authToken, onLogout: handleLogout })) : (_jsx(AdminLogin, { onLoginSuccess: handleLoginSuccess })) }), _jsx(AppFooter, { showCarousel: false })] }));
};
export default Admin;
