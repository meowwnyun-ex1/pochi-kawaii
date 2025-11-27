import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/contexts/LanguageContext';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const AdminLogin = ({ onLoginSuccess }) => {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (!response.ok)
                throw new Error('Invalid password');
            const data = await response.json();
            const token = data.access_token;
            localStorage.setItem('admin_token', token);
            setPassword('');
            showToast.success(t('admin:loginSuccess'), {
                duration: 2500,
                icon: '✅',
            });
            onLoginSuccess(token);
        }
        catch (error) {
            showToast.error(t('admin:invalidPassword'), { icon: '❌' });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { className: "flex items-center justify-center p-4 min-h-full", children: _jsx("div", { className: "relative w-full max-w-md", children: _jsxs("div", { className: "bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100/50 overflow-hidden", children: [_jsx("div", { className: "relative bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-5 text-gray-800 border-b border-gray-100", children: _jsxs("div", { className: "relative flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-white rounded-xl shadow-sm", children: _jsx("img", { src: `${import.meta.env.VITE_BASE_PATH || '/pochi-kawaii'}/logo.svg`, alt: "Logo", className: "h-7 w-7", onError: (e) => {
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                        } }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold mb-0.5", children: t('admin:panelTitle') }), _jsx("p", { className: "text-gray-600 text-xs font-medium", children: t('admin:loginTitle') })] })] }) }), _jsxs("div", { className: "p-5 space-y-4", children: [_jsxs("form", { onSubmit: handleLogin, className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: "admin-password", className: "flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5", children: [_jsx(Lock, { className: "h-3.5 w-3.5 text-blue-500" }), t('admin:passwordLabel')] }), _jsx("input", { id: "admin-password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: t('admin:passwordPlaceholder'), className: "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400 transition-all shadow-sm", disabled: isLoading, required: true })] }), _jsxs("button", { type: "submit", disabled: isLoading || !password, className: "relative w-full group overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-blue-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" }), _jsx("div", { className: "relative px-5 py-2.5 flex items-center justify-center gap-2 text-white font-semibold text-sm", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: t('admin:loggingIn') })] })) : (_jsxs(_Fragment, { children: [_jsx(Lock, { className: "h-4 w-4 group-hover:translate-x-1 transition-transform" }), _jsx("span", { children: t('admin:loginButton') })] })) })] })] }), _jsxs("button", { onClick: () => (window.location.href = '/'), className: "relative mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-all duration-300 text-xs text-gray-700 font-semibold shadow-sm hover:shadow-md", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), _jsx("span", { children: t('admin:backToHome') })] })] })] }) }) }));
};
export default AdminLogin;
