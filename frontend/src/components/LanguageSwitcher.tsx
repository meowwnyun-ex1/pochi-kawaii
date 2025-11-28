import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useRef, useEffect } from 'react';
import { showToast } from '@/utils/toast';

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [pendingLangChange, setPendingLangChange] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const foundLang = languages.find((lang) => lang.code === language);
  const currentLang = foundLang ? foundLang : languages[0];
  const langName = t(`language:languages.${currentLang.code}`);
  const currentLangName = langName ? langName : currentLang.code;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (pendingLangChange && language === pendingLangChange) {
      const toastMessage = t('language:changed_success');
      showToast.success(toastMessage, {
        duration: 2000,
      });
      setPendingLangChange(null);
      setIsChanging(false);
    }
  }, [language, pendingLangChange, t]);

  const handleLanguageChange = (langCode: string) => {
    const selectedLang = languages.find((l) => l.code === langCode);
    if (!selectedLang) return;

    if (language === langCode) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    setPendingLangChange(langCode);
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        aria-label={`${t('language:changeLanguage')}. ${t('language:currentLanguage')}: ${currentLangName}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`
          relative flex items-center gap-2 px-2.5 py-1.5 
          bg-white border-2 border-gray-200 rounded-xl
          hover:bg-gradient-to-r hover:from-sky-50 hover:to-indigo-50 hover:border-sky-300
          transition-all duration-200 shadow-md hover:shadow-lg
          focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
          ${isChanging ? 'opacity-70 cursor-wait' : ''}
          ${isOpen ? 'ring-2 ring-sky-500 ring-offset-2 border-sky-400' : ''}
        `}>
        <span className="text-xl" role="img" aria-label={currentLangName} title={currentLangName}>
          {currentLang.flag ?? currentLang.fallback ?? '🌐'}
        </span>
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-2 right-0 w-56 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm"
          role="menu"
          aria-orientation="vertical">
          <div className="max-h-80 overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                role="menuitem"
                aria-label={t('language:switchTo', {
                  language: (() => {
                    const name = t(`language:languages.${lang.code}`);
                    return name ? name : lang.code;
                  })(),
                })}
                className={`
                  w-full flex items-center gap-3 px-4 py-3
                  transition-all duration-200
                  ${
                    language === lang.code
                      ? 'bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-700 font-semibold border-l-4 border-sky-500'
                      : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-sky-50/30 text-gray-700 hover:text-sky-700'
                  }
                `}>
                <span
                  className="text-xl"
                  role="img"
                  aria-label={(() => {
                    const name = t(`language:languages.${lang.code}`);
                    return name ? name : lang.code;
                  })()}>
                  {lang.flag ?? lang.fallback ?? '🌐'}
                </span>
                <span className="flex-1 text-left text-sm font-medium">
                  {(() => {
                    const name = t(`language:languages.${lang.code}`);
                    return name ? name : lang.code;
                  })()}
                </span>
                {language === lang.code && (
                  <Check className="h-4 w-4 text-sky-600" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
          <div className="px-4 py-3 bg-gradient-to-r from-sky-50/50 to-indigo-50/50 text-xs text-gray-600 text-center border-t-2 border-gray-200 font-medium">
            {t('language:aiNote')}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
