import { useState, useEffect } from 'react';
import { Lock, Trash2, LogOut, X, AlertTriangle, ArrowLeft } from 'lucide-react';
import AvatarImage from '@/components/AvatarImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/contexts/LanguageContext';
import AnnouncementManager from '@/components/AnnouncementManager';

interface AdminFeedback {
  id: number;
  text: string;
  name: string;
  ip_address: string;
  timestamp: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AdminPanel = () => {
  const { language, t, config } = useLanguage();
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
  const [imageModal, setImageModal] = useState<{ show: boolean; url: string; title: string }>({
    show: false,
    url: '',
    title: '',
  });

  const safeConfig = config || {};
  const adminTexts = (safeConfig.admin_panel || {}) as Record<string, Record<string, string>>;

  const getAdminText = (key: string, fallback: string = ''): string => {
    const textObj = adminTexts[key] as Record<string, string> | undefined;
    if (!textObj) return fallback;
    return textObj[language] || textObj.th || textObj.en || fallback;
  };

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

      if (!response.ok) throw new Error('Invalid password');

      const data = await response.json();
      const token = data.access_token;

      localStorage.setItem('admin_token', token);
      setAuthToken(token);
      setIsLoggedIn(true);
      setPassword('');

      showToast.success(getAdminText('login_success', 'Login successful!'), {
        duration: 2500,
        icon: '✅',
      });

      loadFeedback(token);
    } catch (error) {
      showToast.error(getAdminText('invalid_password', 'Invalid password!'), { icon: '❌' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeedback = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load feedback');

      const data = await response.json();
      setFeedback(data.feedback || []);
    } catch (error) {
      showToast.error(t('connection_error') || 'Connection error!', { icon: '⚠️' });
    }
  };

  const deleteFeedback = async (id: number) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to delete feedback');

      showToast.success(getAdminText('delete_success', 'Deleted successfully!'), {
        duration: 2000,
        icon: '🗑️',
      });
      loadFeedback(authToken);
      setDeleteConfirm({ show: false, id: 0, text: '' });
    } catch (error) {
      showToast.error(getAdminText('delete_error', 'Cannot delete!'), { icon: '❌' });
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
    showToast.success(getAdminText('logout_success', 'Logged out successfully!'), {
      duration: 2000,
      icon: '👋',
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border-2 border-gray-200/50 overflow-hidden">
            <div className="relative bg-gradient-to-r from-sky-500 via-purple-500 to-indigo-500 p-4 text-white">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
              <div className="relative flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                  <Lock className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    {getAdminText('panel_title', 'Admin Panel')}
                  </h1>
                  <p className="text-blue-100 text-sm font-medium">
                    {getAdminText('login_title', 'Admin Login')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {getAdminText('password_label', 'Admin Password')}
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={getAdminText('password_placeholder', 'Enter password')}
                    className="w-full px-4 py-3 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
                    disabled={isLoading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="relative w-full group overflow-hidden rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-purple-500 to-indigo-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative px-6 py-4 flex items-center justify-center gap-3 text-white font-bold text-base">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{getAdminText('logging_in', 'Logging in...')}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        <span>{getAdminText('login_button', 'Login')}</span>
                      </>
                    )}
                  </div>
                </button>
              </form>

              <button
                onClick={() => (window.location.href = '/')}
                className="relative mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl transition-all duration-300 text-sm text-gray-700 font-semibold shadow-md hover:shadow-lg">
                <ArrowLeft className="h-5 w-5" />
                <span>{getAdminText('back_to_home', 'Back to Home') || 'Back to Home'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <AvatarImage size="medium" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  {getAdminText('panel_title', 'Admin Control Panel')}
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  {getAdminText('manage_feedback', 'Manage Feedback')}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 border-2 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all rounded-xl px-4 py-2">
              <LogOut className="h-4 w-4 mr-2" />
              {getAdminText('logout', 'Logout')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    {getAdminText('total_feedback', 'Total Feedback')}
                  </p>
                  <p className="text-4xl font-bold text-gray-900">{feedback.length}</p>
                </div>
                <div className="bg-gradient-to-br from-sky-400/80 to-indigo-400/80 p-4 rounded-2xl shadow-lg">
                  <span className="text-white text-2xl">📝</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    {getAdminText('displayed', 'Displayed')}
                  </p>
                  <p className="text-4xl font-bold text-gray-900">{feedback.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl shadow-lg">
                  <span className="text-white text-2xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {authToken && (
          <div className="mb-6">
            <AnnouncementManager token={authToken} />
          </div>
        )}

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-xl">
          <CardHeader className="border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-800">
                {getAdminText('feedback_list', 'Feedback List')}
              </CardTitle>
              <Button
                onClick={() => authToken && loadFeedback(authToken)}
                variant="outline"
                size="sm"
                className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                <span className="mr-2">🔄</span>
                {getAdminText('refresh', 'Refresh')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 via-gray-50 to-gray-100/50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">ID</th>
                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">
                      {getAdminText('name', 'Name')}
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">
                      {getAdminText('feedback', 'Feedback')}
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">IP</th>
                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">
                      {getAdminText('time', 'Time')}
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">
                      {getAdminText('management', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-3xl">📭</span>
                          </div>
                          <p className="text-gray-500 font-medium">
                            {getAdminText('no_feedback', 'No feedback')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    feedback.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}>
                        <td className="p-4 font-mono text-sm font-semibold text-gray-700">
                          {item.id}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-gray-800">{item.name}</span>
                        </td>
                        <td className="p-4 max-w-md">
                          <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                            {item.text}
                          </p>
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 inline-block">
                          {item.ip_address}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {new Date(item.timestamp).toLocaleString(language)}
                        </td>
                        <td className="p-4">
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
                            className="text-red-600 border-2 border-red-300 hover:bg-red-50 hover:border-red-400 rounded-lg transition-all">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in duration-200 border border-gray-200">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {getAdminText('delete_confirm', 'Confirm Delete')}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
                    "{deleteConfirm.text.substring(0, 100)}
                    {deleteConfirm.text.length > 100 ? '...' : ''}"
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ show: false, id: 0, text: '' })}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setDeleteConfirm({ show: false, id: 0, text: '' })}
                  variant="outline"
                  className="flex-1 border-2 rounded-xl py-2.5">
                  {t('common.cancel') || 'Cancel'}
                </Button>
                <Button
                  onClick={() => deleteFeedback(deleteConfirm.id)}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl py-2.5 shadow-lg hover:shadow-xl transition-all">
                  {getAdminText('delete_button', 'Delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {imageModal.show && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setImageModal({ show: false, url: '', title: '' })}>
          <div
            className="relative max-w-4xl max-h-[90vh] animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setImageModal({ show: false, url: '', title: '' })}
              className="absolute -top-12 -right-0 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-2xl hover:bg-white transition-all z-10 group">
              <X className="h-6 w-6 text-gray-700 group-hover:rotate-90 transition-transform" />
            </button>
            <img
              src={imageModal.url}
              alt={imageModal.title}
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl border-4 border-white"
            />
            {imageModal.title && (
              <div className="mt-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 text-center shadow-xl border border-gray-200">
                <p className="text-gray-800 font-semibold text-lg">{imageModal.title}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
