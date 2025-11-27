import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Trash2, LogOut, X, AlertTriangle } from 'lucide-react';
import AvatarImage from '@/components/AvatarImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/utils/toast';
import AnnouncementManager from '@/components/AnnouncementManager';
import { useLanguage } from '@/contexts/LanguageContext';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const AdminPanel = ({ authToken, onLogout }) => {
    const { t, language } = useLanguage();
    const [feedback, setFeedback] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState({
        show: false,
        id: 0,
        text: '',
    });
    useEffect(() => {
        if (authToken) {
            loadFeedback(authToken);
        }
    }, [authToken]);
    const loadFeedback = async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/feedback`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok)
                throw new Error('Failed to load feedback');
            const data = await response.json();
            setFeedback(data.feedback || []);
        }
        catch (error) {
            showToast.error(t('common:connectionError') || 'Connection error!', { icon: '⚠️' });
        }
    };
    const deleteFeedback = async (id) => {
        if (!authToken)
            return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/feedback/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!response.ok)
                throw new Error('Failed to delete feedback');
            showToast.success(t('admin:deleteSuccess'), {
                duration: 2000,
                icon: '🗑️',
            });
            loadFeedback(authToken);
            setDeleteConfirm({ show: false, id: 0, text: '' });
        }
        catch (error) {
            showToast.error(t('admin:deleteError'), { icon: '❌' });
        }
    };
    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/admin/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authToken}` },
            });
        }
        catch (error) {
            if (import.meta.env.DEV) {
                console.error('Logout error:', error);
            }
        }
        localStorage.removeItem('admin_token');
        setFeedback([]);
        showToast.success(t('admin:logoutSuccess'), {
            duration: 2000,
            icon: '👋',
        });
        onLogout();
    };
    return (_jsxs("div", { className: "pt-4 pb-6", children: [_jsxs("div", { className: "max-w-7xl mx-auto px-6 space-y-2", children: [_jsx("div", { className: "bg-white/90 backdrop-blur-xl rounded-xl shadow-md border border-gray-100/50 p-3", children: _jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx(AvatarImage, { size: "medium" }), _jsx("div", { className: "absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-300 rounded-full border-2 border-white flex items-center justify-center", children: _jsx("div", { className: "w-1.5 h-1.5 bg-white rounded-full" }) })] }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 bg-clip-text text-transparent flex items-center gap-2", children: t('admin:panelTitle') }), _jsx("p", { className: "text-gray-600 mt-0.5 text-xs", children: t('admin:manageFeedback') })] })] }), _jsxs(Button, { onClick: handleLogout, variant: "outline", className: "text-rose-500 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all rounded-lg px-3 py-1.5 text-xs", children: [_jsx(LogOut, { className: "h-3.5 w-3.5 mr-1.5" }), t('admin:logout')] })] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: [_jsx(Card, { className: "border-0 shadow-md bg-gradient-to-br from-blue-50/50 to-indigo-50/30 hover:shadow-lg transition-all duration-300", children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "space-y-0.5", children: [_jsx("p", { className: "text-xs font-medium text-gray-600", children: t('admin:totalFeedback') }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: feedback.length })] }), _jsx("div", { className: "bg-gradient-to-br from-blue-200/70 to-indigo-200/70 p-2.5 rounded-xl shadow-sm", children: _jsx("span", { className: "text-white text-xl", children: "\uD83D\uDCDD" }) })] }) }) }), _jsx(Card, { className: "border-0 shadow-md bg-gradient-to-br from-emerald-50/50 to-green-50/30 hover:shadow-lg transition-all duration-300", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "space-y-0.5", children: [_jsx("p", { className: "text-xs font-medium text-gray-600", children: t('admin:displayed') }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: feedback.length })] }), _jsx("div", { className: "bg-gradient-to-br from-emerald-300 to-green-400 p-2.5 rounded-xl shadow-sm", children: _jsx("span", { className: "text-white text-xl", children: "\u2705" }) })] }) }) })] }), authToken && (_jsx("div", { className: "mb-3", children: _jsx(AnnouncementManager, { token: authToken }) })), _jsxs(Card, { className: "border-0 shadow-md bg-white/90 backdrop-blur-xl", children: [_jsx(CardHeader, { className: "border-b border-gray-100/50 pb-3 pt-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(CardTitle, { className: "text-base font-bold text-gray-800", children: t('admin:feedbackList') }), _jsxs(Button, { onClick: () => authToken && loadFeedback(authToken), variant: "outline", size: "sm", className: "border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-all text-xs px-2 py-1", children: [_jsx("span", { className: "mr-1.5", children: "\uD83D\uDD04" }), t('admin:refresh')] })] }) }), _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-50 border-b border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-2.5 font-semibold text-gray-700 text-xs", children: "ID" }), _jsx("th", { className: "text-left p-2.5 font-semibold text-gray-700 text-xs", children: t('admin:name') }), _jsx("th", { className: "text-left p-2.5 font-semibold text-gray-700 text-xs", children: t('admin:feedback') }), _jsx("th", { className: "text-left p-2.5 font-semibold text-gray-700 text-xs", children: "IP" }), _jsx("th", { className: "text-left p-2.5 font-semibold text-gray-700 text-xs", children: t('admin:time') }), _jsx("th", { className: "text-left p-2.5 font-semibold text-gray-700 text-xs", children: t('admin:management') })] }) }), _jsx("tbody", { children: feedback.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "text-center p-8", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDCED" }) }), _jsx("p", { className: "text-gray-500 font-medium text-xs", children: t('admin:noFeedback') })] }) }) })) : (feedback.map((item, index) => (_jsxs("tr", { className: `border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`, children: [_jsx("td", { className: "p-2.5 font-mono text-xs font-semibold text-gray-700", children: item.id }), _jsx("td", { className: "p-2.5", children: _jsx("span", { className: "font-semibold text-gray-800 text-xs", children: item.name }) }), _jsx("td", { className: "p-2.5 max-w-md", children: _jsx("p", { className: "text-xs text-gray-700 line-clamp-2 leading-relaxed", children: item.text }) }), _jsx("td", { className: "p-2.5 font-mono text-xs text-gray-600 bg-gray-50 rounded px-2 py-0.5 inline-block", children: item.ip_address }), _jsx("td", { className: "p-2.5 text-xs text-gray-600", children: new Date(item.timestamp).toLocaleString(language) }), _jsx("td", { className: "p-2.5", children: _jsx(Button, { onClick: () => setDeleteConfirm({
                                                                    show: true,
                                                                    id: item.id,
                                                                    text: item.text,
                                                                }), variant: "outline", size: "sm", className: "text-rose-500 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all text-xs px-2 py-1", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }) })] }, item.id)))) })] }) }) })] })] }), deleteConfirm.show && (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200", children: _jsx("div", { className: "bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in duration-200 border border-gray-100", children: _jsxs("div", { className: "p-5", children: [_jsxs("div", { className: "flex items-start gap-3 mb-5", children: [_jsx("div", { className: "flex-shrink-0 w-10 h-10 bg-gradient-to-br from-rose-100 to-rose-200 rounded-full flex items-center justify-center shadow-sm", children: _jsx(AlertTriangle, { className: "h-5 w-5 text-rose-600" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-base font-bold text-gray-900 mb-1.5", children: t('admin:deleteConfirm') }), _jsxs("p", { className: "text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-200", children: ["\"", deleteConfirm.text.substring(0, 100), deleteConfirm.text.length > 100 ? '...' : '', "\""] })] }), _jsx("button", { onClick: () => setDeleteConfirm({ show: false, id: 0, text: '' }), className: "flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-all", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex gap-2.5", children: [_jsx(Button, { onClick: () => setDeleteConfirm({ show: false, id: 0, text: '' }), variant: "outline", className: "flex-1 border rounded-lg py-2 text-sm", children: t('common:cancel') || 'Cancel' }), _jsx(Button, { onClick: () => deleteFeedback(deleteConfirm.id), className: "flex-1 bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-semibold rounded-lg py-2 shadow-sm hover:shadow-md transition-all text-sm", children: t('admin:deleteButton') })] })] }) }) }))] }));
};
export default AdminPanel;
