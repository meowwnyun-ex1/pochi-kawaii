import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/index.css';
import '@/i18n';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(LanguageProvider, { children: _jsx(App, {}) }) }) }));
