import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useRef, useEffect } from 'react';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
const LanguageSwitcher = () => {
    const { language, setLanguage } = useLanguage();
    const { t } = useTranslation(['language']);
    const [isOpen, setIsOpen] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const dropdownRef = useRef(null);
    const languages = [
        { code: 'th', flag: '🇹🇭', fallback: 'th' },
        { code: 'en', flag: '🇬🇧', fallback: 'en' },
        { code: 'jp', flag: '🇯🇵', fallback: 'jp' },
        { code: 'id', flag: '🇮🇩', fallback: 'id' },
        { code: 'zh', flag: '🇨🇳', fallback: 'zh' },
        { code: 'ko', flag: '🇰🇷', fallback: 'ko' },
        { code: 'vi', flag: '🇻🇳', fallback: 'vi' },
        { code: 'es', flag: '🇪🇸', fallback: 'es' },
        { code: 'fil', flag: '🇵🇭', fallback: 'fil' },
        { code: 'hi', flag: '🇮🇳', fallback: 'hi' },
    ];
    const currentLang = languages.find((lang) => lang.code === language) || languages[0];
    const currentLangName = t(`languages.${currentLang.code}`, { ns: 'language' }) || currentLang.code.toUpperCase();
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleLanguageChange = (langCode) => {
        const selectedLang = languages.find((l) => l.code === langCode);
        if (!selectedLang)
            return;
        setIsChanging(true);
        setLanguage(langCode);
        setIsOpen(false);
        const langName = t(`languages.${langCode}`, { ns: 'language' }) || langCode.toUpperCase();
        const toastMessage = `✅ ${t('changedTo', { language: langName, ns: 'language' })}`;
        showToast.success(toastMessage, {
            duration: 2000,
            icon: selectedLang.flag,
        });
        setTimeout(() => setIsChanging(false), 500);
    };
    return (_jsxs("div", { className: "relative", ref: dropdownRef, children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), disabled: isChanging, "aria-label": `${t('changeLanguage', { ns: 'language' })}. ${t('currentLanguage', {
                    ns: 'language',
                })}: ${currentLangName}`, "aria-expanded": isOpen, "aria-haspopup": "true", className: `
          relative flex items-center gap-2 px-2.5 py-1.5 
          bg-white border-2 border-gray-200 rounded-xl
          hover:bg-gradient-to-r hover:from-sky-50 hover:to-indigo-50 hover:border-sky-300
          transition-all duration-200 shadow-md hover:shadow-lg
          focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
          ${isChanging ? 'opacity-70 cursor-wait' : ''}
          ${isOpen ? 'ring-2 ring-sky-500 ring-offset-2 border-sky-400' : ''}
        `, children: [_jsx("span", { className: "text-xl", role: "img", "aria-label": currentLangName, title: currentLangName, children: currentLang.flag || currentLang.fallback || '🌐' }), _jsx("svg", { className: `w-3 h-3 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })] }), isOpen && (_jsxs("div", { className: "absolute top-full mt-2 right-0 w-56 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm", role: "menu", "aria-orientation": "vertical", children: [_jsx("div", { className: "max-h-80 overflow-y-auto", children: languages.map((lang) => (_jsxs("button", { onClick: () => handleLanguageChange(lang.code), role: "menuitem", "aria-label": t('switchTo', {
                                language: t(`languages.${lang.code}`, { ns: 'language' }) || lang.code.toUpperCase(),
                                ns: 'language',
                            }), className: `
                  w-full flex items-center gap-3 px-4 py-3
                  transition-all duration-200
                  ${language === lang.code
                                ? 'bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-700 font-semibold border-l-4 border-sky-500'
                                : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-sky-50/30 text-gray-700 hover:text-sky-700'}
                `, children: [_jsx("span", { className: "text-xl", role: "img", "aria-label": t(`languages.${lang.code}`, { ns: 'language' }) || lang.code.toUpperCase(), children: lang.flag || lang.fallback || '🌐' }), _jsx("span", { className: "flex-1 text-left text-sm font-medium", children: t(`languages.${lang.code}`, { ns: 'language' }) || lang.code.toUpperCase() }), language === lang.code && (_jsx(Check, { className: "h-4 w-4 text-sky-600", "aria-hidden": "true" }))] }, lang.code))) }), _jsx("div", { className: "px-4 py-3 bg-gradient-to-r from-sky-50/50 to-indigo-50/50 text-xs text-gray-600 text-center border-t-2 border-gray-200 font-medium", children: t('aiNote', { ns: 'language' }) })] }))] }));
};
export default LanguageSwitcher;
