import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logger from '@/utils/logger';
import { useTranslation } from 'react-i18next';
class ErrorBoundaryClass extends Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "handleReset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                });
            }
        });
        Object.defineProperty(this, "handleReload", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                window.location.reload();
            }
        });
        Object.defineProperty(this, "handleGoHome", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                window.location.href = import.meta.env.VITE_BASE_PATH || '/';
            }
        });
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }
    componentDidCatch(error, errorInfo) {
        logger.error('ErrorBoundary caught an error', 'ErrorBoundary', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });
        this.setState({
            error,
            errorInfo,
        });
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return _jsx(ErrorFallback, { error: this.state.error, onReset: this.handleReset, onReload: this.handleReload, onGoHome: this.handleGoHome });
        }
        return this.props.children;
    }
}
const ErrorFallback = ({ error, onReset, onReload, onGoHome }) => {
    const { t } = useTranslation(['error']);
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center gradient-background p-4", children: _jsxs(Card, { className: "max-w-2xl w-full shadow-2xl border-2 border-pink-200 bg-white/80 backdrop-blur-sm rounded-3xl", children: [_jsxs(CardHeader, { className: "text-center pb-4", children: [_jsx("div", { className: "mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-200 rounded-full flex items-center justify-center shadow-lg", children: _jsx(AlertTriangle, { className: "h-10 w-10 text-pink-600" }) }), _jsx(CardTitle, { className: "text-2xl font-bold text-pink-700", children: t('title', { ns: 'error' }) })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsx("p", { className: "text-center text-gray-600", children: t('description', { ns: 'error' }) }), error && (_jsxs("details", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [_jsx("summary", { className: "cursor-pointer font-semibold text-gray-700 mb-2 hover:text-gray-900", children: t('details', { ns: 'error' }) }), _jsxs("div", { className: "mt-2 text-sm text-pink-700 font-mono bg-pink-50 p-3 rounded-lg border border-pink-200 overflow-auto max-h-48", children: [_jsxs("div", { className: "font-bold text-pink-800 mb-2", children: [error.name, ": ", error.message] }), error.stack && (_jsx("pre", { className: "text-xs whitespace-pre-wrap break-words", children: error.stack }))] })] })), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 justify-center", children: [_jsxs(Button, { onClick: onReset, variant: "default", className: "bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 hover:from-pink-500 hover:via-rose-500 hover:to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-2xl", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), t('reset', { ns: 'error' })] }), _jsxs(Button, { onClick: onReload, variant: "outline", className: "border-2 border-pink-300 text-pink-700 hover:bg-pink-50 hover:border-pink-400 transition-all rounded-xl", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), t('reload', { ns: 'error' })] }), _jsxs(Button, { onClick: onGoHome, variant: "outline", className: "border-2 border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 transition-all rounded-xl", children: [_jsx(Home, { className: "h-4 w-4 mr-2" }), t('goHome', { ns: 'error' })] })] }), _jsx("p", { className: "text-center text-xs text-gray-500 mt-4", children: t('report', { ns: 'error' }) })] })] }) }));
};
// HOC wrapper for functional components
export const ErrorBoundary = (props) => {
    return _jsx(ErrorBoundaryClass, { ...props });
};
export default ErrorBoundary;
