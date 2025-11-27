import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const AdminLogin = ({ onLoginSuccess }: AdminLoginProps) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) throw new Error('Invalid password');

      const data = await response.json();
      const token = data.access_token;

      localStorage.setItem('admin_token', token);
      setPassword('');

      showToast.success(t('admin:loginSuccess'), {
        duration: 2500,
        icon: '✅',
      });

      onLoginSuccess(token);
    } catch (error) {
      showToast.error(t('admin:invalidPassword'), { icon: '❌' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-full">
      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100/50 overflow-hidden">
          <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-5 text-gray-800 border-b border-gray-100">
            <div className="relative flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <img
                  src={`${import.meta.env.VITE_BASE_PATH || '/pochi-kawaii'}/logo.svg`}
                  alt="Logo"
                  className="h-7 w-7"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold mb-0.5">{t('admin:panelTitle')}</h1>
                <p className="text-gray-600 text-xs font-medium">{t('admin:loginTitle')}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password"
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-500" />
                  {t('admin:passwordLabel')}
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('admin:passwordPlaceholder')}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400 transition-all shadow-sm"
                  disabled={isLoading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !password}
                className="relative w-full group overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-blue-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative px-5 py-2.5 flex items-center justify-center gap-2 text-white font-semibold text-sm">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('admin:loggingIn')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      <span>{t('admin:loginButton')}</span>
                    </>
                  )}
                </div>
              </button>
            </form>

            <button
              onClick={() => (window.location.href = '/')}
              className="relative mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-all duration-300 text-xs text-gray-700 font-semibold shadow-sm hover:shadow-md">
              <ArrowLeft className="h-4 w-4" />
              <span>{t('admin:backToHome')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

