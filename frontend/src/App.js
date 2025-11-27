import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import Admin from '@/pages/Admin';
import Feedback from '@/pages/Feedback';
import Developing from '@/pages/Developing';
const App = () => {
    // Provide safe defaults for environment variables
    const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/pochi-kawaii';
    const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/admin';
    return (_jsxs(_Fragment, { children: [_jsx(Toaster, { position: "top-right", expand: true, richColors: true, closeButton: true, toastOptions: { style: { marginTop: '60px' } } }), _jsx(BrowserRouter, { basename: BASE_PATH, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Index, {}) }), _jsx(Route, { path: "/feedback", element: _jsx(Feedback, {}) }), _jsx(Route, { path: "/developing", element: _jsx(Developing, {}) }), _jsx(Route, { path: ADMIN_PATH, element: _jsx(Admin, {}) }), _jsx(Route, { path: "*", element: _jsx(Index, {}) })] }) })] }));
};
export default App;
