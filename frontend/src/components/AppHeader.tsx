import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AvatarImage from '@/components/AvatarImage';
import { useLanguage } from '@/contexts/LanguageContext';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/pochi-kawaii';

const AppHeader = ({ onMenuClick }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthUrl = API_BASE_URL 
          ? `${API_BASE_URL}/health`
          : `${BASE_PATH}/health`;
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'healthy') {
            setStatus('healthy');
          } else {
            setStatus('unhealthy');
          }
        } else {
          setStatus('unhealthy');
        }
      } catch (error) {
        setStatus('unhealthy');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      case 'checking':
        return 'bg-yellow-500';
      default:
        return 'bg-pink-500';
    }
  };

  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-pink-200/50 shadow-lg flex-shrink-0 fixed top-0 left-0 right-0 z-30">
        <div className="w-full px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onMenuClick && (
                <button
                  onClick={onMenuClick}
                  className="p-2.5 hover:bg-pink-100 rounded-xl transition-all duration-200 hover:scale-105"
                  aria-label={t('header:toggleMenu')}>
                  <Menu className="h-5 w-5 text-pink-600" />
                </button>
              )}
              <button onClick={() => navigate('/')} className="flex items-center space-x-3 hover:opacity-90 transition-opacity group">
              <div className="relative">
              <AvatarImage size="small" />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor()} rounded-full border-2 border-white transition-colors duration-300`}></div>
              </div>
              <div>
                <h1 className="text-base font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent group-hover:from-pink-600 group-hover:via-rose-600 group-hover:to-pink-700 transition-all">
                  {t('header:appName')}
                </h1>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">{t('header:appSubtitle')}</span>
                </div>
              </div>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={() => navigate('/feedback')}
                className="relative group overflow-hidden rounded-xl px-4 py-2 font-semibold text-sm transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 animate-gradient-x" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 blur-sm" />
                </div>
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                </div>
                <div className="relative flex items-center gap-2 text-white">
                  <span className="text-base">📮</span>
                  <span>{t('header:feedbackButton')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
    </header>
  );
};

export default AppHeader;
