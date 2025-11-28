import { useState, useEffect, useMemo } from 'react';
import { Lock, Trash2, LogOut, X, AlertTriangle, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AvatarImage from '@/components/AvatarImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/utils/toast';
import AnnouncementManager from '@/components/AnnouncementManager';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdminFeedback {
  id: number;
  text: string;
  name: string;
  ip_address: string;
  timestamp: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AdminPanel = () => {
  const { t, language } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; text: string }>({
    show: false,
    id: 0,
    text: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    localStorage.removeItem('admin_token');
    setAuthToken(null);
    setIsLoggedIn(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) throw new Error(t('admin:invalidPassword'));

      const data = await response.json();
      const token = data.access_token;

      localStorage.setItem('admin_token', token);
      setAuthToken(token);
      setIsLoggedIn(true);
      setPassword('');

      showToast.success(t('admin:loginSuccess'), {
        duration: 2500,
        icon: '✅',
      });

      loadFeedback(token);
    } catch (error) {
      showToast.error(t('admin:invalidPassword'), { icon: '❌' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeedback = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t('admin:loadFailed'));

      const data = await response.json();
      setFeedback(data.feedback ? data.feedback : []);
    } catch (error) {
      showToast.error(t('common:connectionError'), { icon: '⚠️' });
    }
  };

  const deleteFeedback = async (id: number) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error(t('admin:deleteError'));

      showToast.success(t('admin:deleteSuccess'), {
        duration: 2000,
        icon: '🗑️',
      });
      loadFeedback(authToken);
      setDeleteConfirm({ show: false, id: 0, text: '' });
    } catch (error) {
      showToast.error(t('admin:deleteError'), { icon: '❌' });
    }
  };

  const handleLogout = async () => {
    if (!authToken) return;

    try {
      await fetch(`${API_BASE_URL}/api/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem('admin_token');
    setAuthToken(null);
    setIsLoggedIn(false);
    setFeedback([]);
    showToast.success(t('admin:logoutSuccess'), {
      duration: 2000,
      icon: '👋',
    });
  };

  const filteredFeedback = useMemo(() => {
    if (!searchQuery.trim()) return feedback;
    const query = searchQuery.toLowerCase();
    return feedback.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.text.toLowerCase().includes(query) ||
        item.ip_address.toLowerCase().includes(query) ||
        item.id.toString().includes(query)
    );
  }, [feedback, searchQuery]);

  const paginatedFeedback = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFeedback.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFeedback, currentPage]);

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  if (!isLoggedIn) {
    return (
      <div className="w-full flex items-center justify-center p-4 relative min-h-screen">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 bg-pink-200/5 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-20 right-20 w-96 h-96 bg-rose-200/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-100/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '2s' }}
          />
        </div>

        <div className="relative w-full max-w-md mx-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
            <div className="relative bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 p-5 text-gray-800 border-b border-gray-100">
              <div className="relative flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <img src={`${import.meta.env.VITE_BASE_PATH}/logo.svg`} alt={t('common:appName')} className="h-7 w-7" onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold mb-0.5">
                    {t('admin:panelTitle')}
                  </h1>
                  <p className="text-gray-600 text-xs font-medium">
                    {t('admin:loginTitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="admin-password"
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                    <Lock className="h-3.5 w-3.5 text-pink-500" />
                    {t('admin:passwordLabel')}
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('admin:passwordPlaceholder')}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-400/50 focus:border-pink-400 transition-all shadow-sm"
                    disabled={isLoading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="relative w-full group overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400" />
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-300 via-rose-300 to-pink-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                onClick={() => {
                  const basePath = import.meta.env.VITE_BASE_PATH;
                  window.location.href = basePath ? basePath : '/';
                }}
                className="relative mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-all duration-300 text-xs text-gray-700 font-semibold shadow-sm hover:shadow-md">
                <ArrowLeft className="h-4 w-4" />
                <span>{t('admin:backToHome')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center p-4 relative min-h-screen">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-pink-200/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-rose-200/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-100/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative w-full max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-md border border-gray-100/50 p-3 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AvatarImage size="medium" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-300 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                  {t('admin:panelTitle')}
                </h1>
                <p className="text-gray-600 mt-0.5 text-xs">
                  {t('admin:manageFeedback')}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-rose-500 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all rounded-lg px-3 py-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              {t('admin:logout')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
            <div className="relative bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 p-5 text-gray-800 border-b border-gray-100">
              <h2 className="text-xl font-bold">
                {t('admin:manageAnnouncements')}
              </h2>
            </div>
            <div className="p-5 max-h-[750px] overflow-y-auto">
              {authToken && <AnnouncementManager token={authToken} />}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
            <CardHeader className="border-b border-gray-100/50 pb-3 pt-3 bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-xl font-bold text-gray-800">
                  {t('admin:feedbackList')}
                </CardTitle>
                <Button
                  onClick={() => authToken && loadFeedback(authToken)}
                  variant="outline"
                  size="sm"
                  className="border border-gray-200 hover:border-pink-300 hover:bg-pink-50 rounded-lg transition-all text-xs px-2 py-1">
                  <span className="mr-1.5">🔄</span>
                  {t('admin:refresh')}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t('admin:searchPlaceholder')}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 transition-all"
                />
              </div>
              {searchQuery && (
                <p className="text-xs text-gray-500 mt-2">
                  {t('admin:searchResults')}: {filteredFeedback.length} {t('common:items')}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[700px]">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 via-pink-50/30 to-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left p-2.5 font-semibold text-gray-700 text-xs">ID</th>
                      <th className="text-left p-2.5 font-semibold text-gray-700 text-xs">
                        {t('admin:name')}
                      </th>
                      <th className="text-left p-2.5 font-semibold text-gray-700 text-xs">
                        {t('admin:feedback')}
                      </th>
                      <th className="text-left p-2.5 font-semibold text-gray-700 text-xs">IP</th>
                      <th className="text-left p-2.5 font-semibold text-gray-700 text-xs">
                        {t('admin:time')}
                      </th>
                      <th className="text-left p-2.5 font-semibold text-gray-700 text-xs">
                        {t('admin:management')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFeedback.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-2xl">📭</span>
                            </div>
                            <p className="text-gray-500 font-medium text-xs">
                              {searchQuery ? t('admin:noSearchResults') : t('admin:noFeedback')}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedFeedback.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-pink-50/30 hover:to-rose-50/30 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}>
                          <td className="p-2.5 font-mono text-xs font-semibold text-gray-700">
                            {item.id}
                          </td>
                          <td className="p-2.5">
                            <span className="font-semibold text-gray-800 text-xs">{item.name}</span>
                          </td>
                          <td className="p-2.5 max-w-md">
                            <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                              {item.text}
                            </p>
                          </td>
                          <td className="p-2.5 font-mono text-xs text-gray-600 bg-gray-50 rounded px-2 py-0.5 inline-block">
                            {item.ip_address}
                          </td>
                          <td className="p-2.5 text-xs text-gray-600">
                            {new Date(item.timestamp).toLocaleString(language)}
                          </td>
                          <td className="p-2.5">
                            <Button
                              onClick={() =>
                                setDeleteConfirm({
                                  show: true,
                                  id: item.id,
                                  text: item.text,
                                })
                              }
                              variant="outline"
                              size="sm"
                              className="text-rose-500 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all text-xs px-2 py-1">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50/50">
                  <div className="text-xs text-gray-600">
                    {t('admin:showing')} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredFeedback.length)} {t('admin:of')} {filteredFeedback.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="border border-gray-200 hover:border-pink-300 hover:bg-pink-50 rounded-lg transition-all text-xs px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ChevronLeft className="h-3.5 w-3.5" />
                      {t('admin:previous')}
                    </Button>
                    <span className="text-xs text-gray-600 font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="border border-gray-200 hover:border-pink-300 hover:bg-pink-50 rounded-lg transition-all text-xs px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                      {t('admin:next')}
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </div>

      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in duration-200 border border-gray-100">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-5">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-rose-100 to-rose-200 rounded-full flex items-center justify-center shadow-sm">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1.5">
                    {t('admin:deleteConfirm')}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    "{deleteConfirm.text.substring(0, 100)}
                    {deleteConfirm.text.length > 100 ? '...' : ''}"
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ show: false, id: 0, text: '' })}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-2.5">
                <Button
                  onClick={() => setDeleteConfirm({ show: false, id: 0, text: '' })}
                  variant="outline"
                  className="flex-1 border rounded-lg py-2 text-sm">
                  {t('common:cancel')}
                </Button>
                <Button
                  onClick={() => deleteFeedback(deleteConfirm.id)}
                  className="flex-1 bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-semibold rounded-lg py-2 shadow-sm hover:shadow-md transition-all text-sm">
                  {t('admin:deleteButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

