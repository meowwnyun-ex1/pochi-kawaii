import { jsx as _jsx } from "react/jsx-runtime";
const AppFooter = ({ showCarousel = false }) => {
    const copyrightText = '© 2025 Pochi! Kawaii ne~ | Developed by Thammaphon Chittasuwanna (SDM)';
    return (_jsx("footer", { className: "fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-r from-pink-50/90 to-rose-50/90 backdrop-blur-sm border-t border-pink-200/50 shadow-sm", children: _jsx("div", { className: "px-6 py-2", children: _jsx("div", { className: "text-center text-xs text-pink-700 font-medium", children: _jsx("p", { children: copyrightText }) }) }) }));
};
export default AppFooter;
