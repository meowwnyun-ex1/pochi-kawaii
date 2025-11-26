import {
  Home,
  Plus,
  Sparkles,
  Palette,
  Heart,
  Wand2,
  Menu,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AvatarImage from '@/components/AvatarImage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
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

  const handleMenuClick = (item: (typeof styleItems)[0]) => {
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

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 h-full bg-white/95 backdrop-blur-xl border-r border-pink-200/50 shadow-2xl transition-transform duration-300 z-50 w-72 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b border-pink-200/50 bg-gradient-to-r from-pink-50/50 to-rose-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-pink-100 rounded-xl transition-all duration-200 hover:scale-105 flex-shrink-0"
                  aria-label="Close sidebar">
                  <Menu className="h-5 w-5 text-pink-600" />
                </button>
                <button
                  onClick={() => {}}
                  className="flex items-center space-x-3 hover:opacity-90 transition-opacity group">
                  <div className="relative">
                    <AvatarImage size="small" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-pink-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h1 className="text-base font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent group-hover:from-pink-600 group-hover:via-rose-600 group-hover:to-pink-700 transition-all">
                      {t('sidebar:appName')}
                    </h1>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-pink-600">{t('sidebar:appSubtitle')}</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={handleHome}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-200 group border border-transparent hover:border-pink-200">
              <Home className="h-5 w-5 text-pink-400 group-hover:text-pink-600 flex-shrink-0 transition-colors" />
              <span className="text-sm text-gray-700 group-hover:text-pink-700 font-semibold">
                {t('sidebar:home')}
              </span>
            </button>

            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-200 group border border-transparent hover:border-pink-200">
              <Plus className="h-5 w-5 text-pink-400 group-hover:text-pink-600 flex-shrink-0 transition-colors" />
              <span className="text-sm text-gray-700 group-hover:text-pink-700 font-semibold">
                {t('sidebar:newChat')}
              </span>
            </button>

            <div className="pt-4 pb-2">
              <h3 className="px-4 text-xs font-bold text-pink-600 uppercase tracking-wider">
                {t('sidebar:newStyle')}
              </h3>
            </div>

            {styleItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleMenuClick(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-200 group border border-transparent hover:border-pink-200">
                  <Icon className="h-5 w-5 text-pink-400 group-hover:text-pink-600 flex-shrink-0 transition-colors" />
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="text-sm text-gray-700 group-hover:text-pink-700 font-semibold truncate">
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-pink-200/50 p-4 bg-gradient-to-r from-pink-50/50 to-rose-50/30">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-300 to-rose-400 rounded-full flex items-center justify-center shadow-md">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-pink-700">{t('sidebar:userAnonymous')}</p>
                <p className="text-xs text-pink-500">{t('sidebar:userPlan')}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
