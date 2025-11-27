import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Home, Plus, Sparkles, Palette, Heart, Wand2, Menu, User, } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AvatarImage from '@/components/AvatarImage';
const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { t } = useTranslation(['sidebar']);
    const styleItems = [
        {
            icon: Sparkles,
            label: t('sidebar:styleClassic'),
            action: 'developing',
        },
        {
            icon: Palette,
            label: t('sidebar:styleAnime'),
            action: 'developing',
        },
        {
            icon: Heart,
            label: t('sidebar:styleCute'),
            action: 'developing',
        },
        {
            icon: Wand2,
            label: t('sidebar:styleFantasy'),
            action: 'developing',
        },
    ];
    const handleMenuClick = (item) => {
        if (item.action === 'developing') {
            navigate('/developing');
            onClose();
        }
    };
    const handleNewChat = () => {
        window.location.reload();
        onClose();
    };
    const handleHome = () => {
        navigate('/');
        onClose();
    };
    return (_jsxs(_Fragment, { children: [isOpen && _jsx("div", { className: "fixed inset-0 bg-black/50 z-40 lg:hidden", onClick: onClose }), _jsx("aside", { className: `fixed left-0 top-0 h-full bg-white/95 backdrop-blur-xl border-r border-pink-200/50 shadow-2xl transition-transform duration-300 z-50 w-72 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`, children: _jsxs("div", { className: "flex flex-col h-full", children: [_jsx("div", { className: "px-4 py-2 border-b border-pink-200/50 bg-gradient-to-r from-pink-50/50 to-rose-50/50", children: _jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: onClose, className: "p-2.5 hover:bg-pink-100 rounded-xl transition-all duration-200 hover:scale-105 flex-shrink-0", "aria-label": "Close sidebar", children: _jsx(Menu, { className: "h-5 w-5 text-pink-600" }) }), _jsxs("button", { onClick: () => { }, className: "flex items-center space-x-3 hover:opacity-90 transition-opacity group", children: [_jsxs("div", { className: "relative", children: [_jsx(AvatarImage, { size: "small" }), _jsx("div", { className: "absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-pink-500 rounded-full border-2 border-white" })] }), _jsxs("div", { children: [_jsx("h1", { className: "text-base font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent group-hover:from-pink-600 group-hover:via-rose-600 group-hover:to-pink-700 transition-all", children: t('sidebar:appName') }), _jsx("div", { className: "flex items-center gap-2 text-xs", children: _jsx("span", { className: "text-pink-600", children: t('sidebar:appSubtitle') }) })] })] })] }) }) }), _jsxs("nav", { className: "flex-1 p-4 space-y-2 overflow-y-auto", children: [_jsxs("button", { onClick: handleHome, className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-200 group border border-transparent hover:border-pink-200", children: [_jsx(Home, { className: "h-5 w-5 text-pink-400 group-hover:text-pink-600 flex-shrink-0 transition-colors" }), _jsx("span", { className: "text-sm text-gray-700 group-hover:text-pink-700 font-semibold", children: t('sidebar:home') })] }), _jsxs("button", { onClick: handleNewChat, className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-200 group border border-transparent hover:border-pink-200", children: [_jsx(Plus, { className: "h-5 w-5 text-pink-400 group-hover:text-pink-600 flex-shrink-0 transition-colors" }), _jsx("span", { className: "text-sm text-gray-700 group-hover:text-pink-700 font-semibold", children: t('sidebar:newChat') })] }), _jsx("div", { className: "pt-4 pb-2", children: _jsx("h3", { className: "px-4 text-xs font-bold text-pink-600 uppercase tracking-wider", children: t('sidebar:newStyle') }) }), styleItems.map((item, index) => {
                                    const Icon = item.icon;
                                    return (_jsxs("button", { onClick: () => handleMenuClick(item), className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-200 group border border-transparent hover:border-pink-200", children: [_jsx(Icon, { className: "h-5 w-5 text-pink-400 group-hover:text-pink-600 flex-shrink-0 transition-colors" }), _jsx("div", { className: "flex items-center justify-between flex-1 min-w-0", children: _jsx("span", { className: "text-sm text-gray-700 group-hover:text-pink-700 font-semibold truncate", children: item.label }) })] }, index));
                                })] }), _jsx("div", { className: "border-t border-pink-200/50 p-4 bg-gradient-to-r from-pink-50/50 to-rose-50/30", children: _jsxs("div", { className: "flex items-center gap-3 px-2", children: [_jsx("div", { className: "w-10 h-10 bg-gradient-to-br from-pink-300 to-rose-400 rounded-full flex items-center justify-center shadow-md", children: _jsx(User, { className: "h-5 w-5 text-white" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-semibold text-pink-700", children: t('sidebar:userAnonymous') }), _jsx("p", { className: "text-xs text-pink-500", children: t('sidebar:userPlan') })] })] }) })] }) })] }));
};
export default Sidebar;
