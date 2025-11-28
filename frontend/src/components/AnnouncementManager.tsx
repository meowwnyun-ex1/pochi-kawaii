import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/utils/toast';
import { Plus, Trash2, Edit, Eye, EyeOff, ZoomIn, X, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Announcement {
  id: number;
  title?: string;
  image_url: string;
  link_url?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AnnouncementManagerProps {
  token: string;
}

const AnnouncementManager = ({ token }: AnnouncementManagerProps) => {
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    link_url: '',
    display_order: 0,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageModal, setImageModal] = useState<{ show: boolean; url: string; title: string }>({
    show: false,
    url: '',
    title: '',
  });

  const fetchAnnouncements = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiBaseUrl}/api/announcements/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements ? data.announcements : []);
      } else {
        showToast.error(t('announcement:load_failed'), { icon: '❌' });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching announcements:', error);
      }
      showToast.error(t('announcement:load_error'), { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [token]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast.warning(t('announcement:invalid_file_type'), { icon: '⚠️' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast.warning(t('announcement:file_too_large'), { icon: '⚠️' });
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    showToast.success(t('announcement:image_selected'), { duration: 1500, icon: '📸' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedImage && !editingId) {
      showToast.warning(t('announcement:no_image'), { icon: '⚠️' });
      return;
    }

    if (editingId && !selectedImage && !imagePreview) {
      showToast.warning(t('announcement:no_image'), { icon: '⚠️' });
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      if (formData.title) {
        formDataToSend.append('title', formData.title);
      }
      if (formData.link_url) {
        formDataToSend.append('link_url', formData.link_url);
      }
      formDataToSend.append('display_order', formData.display_order.toString());

      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      const apiBaseUrl = import.meta.env.VITE_API_URL;
      
      if (editingId) {
        const res = await fetch(`${apiBaseUrl}/api/announcements/admin/${editingId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        });

        if (res.ok) {
          const data = await res.json();
          showToast.success(t('announcement:update_success'), { icon: '✅' });
          await fetchAnnouncements();
          resetForm();
        } else {
          await res.json().catch(() => ({}));
            showToast.error(t('announcement:update_failed'), { icon: '❌', duration: 5000 });
        }
      } else {
        if (announcements.length >= 3) {
          showToast.warning(t('announcement:max_limit'), { duration: 3500, icon: '⚠️' });
          return;
        }

        if (!selectedImage) {
          showToast.warning(t('announcement:no_image'), { icon: '⚠️' });
          return;
        }

        const res = await fetch(`${apiBaseUrl}/api/announcements/admin/create`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        });

        if (res.ok) {
          const data = await res.json();
          showToast.success(t('announcement:create_success'), { icon: '🎉' });
          await fetchAnnouncements();
          resetForm();
        } else {
          await res.json().catch(() => ({}));
            showToast.error(t('announcement:create_failed'), { icon: '❌', duration: 5000 });
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error submitting announcement:', error);
      }
      showToast.error(t('announcement:error'), { icon: '❌', duration: 5000 });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('announcement:delete_confirm'))) {
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiBaseUrl}/api/announcements/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast.success(t('announcement:delete_success'), { icon: '🗑️' });
        fetchAnnouncements();
      } else {
        showToast.error(t('announcement:delete_failed'), { icon: '❌' });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error:', error);
      }
      showToast.error(t('announcement:error'), { icon: '❌' });
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiBaseUrl}/api/announcements/admin/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        showToast.success(currentStatus ? t('announcement:status_hidden') : t('announcement:status_shown'), {
          icon: currentStatus ? '👁️' : '✅',
        });
        fetchAnnouncements();
      } else {
        showToast.error(t('announcement:status_update_failed'), { icon: '❌' });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error:', error);
      }
      showToast.error(t('announcement:error'), { icon: '❌' });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title ?? '',
      link_url: announcement.link_url ?? '',
      display_order: announcement.display_order,
    });
    setImagePreview(announcement.image_url);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ title: '', link_url: '', display_order: 0 });
    setSelectedImage(null);
    setImagePreview('');
    setEditingId(null);
    setShowForm(false);
  };

  const openImageModal = (url: string, title: string) => {
    setImageModal({ show: true, url, title: title ? title : t('announcement:title_placeholder') });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-gray-600">{t('common:loading')}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        {!showForm && announcements.length < 3 && (
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:via-rose-600 hover:to-pink-600 font-semibold text-sm">
            <Plus className="h-4 w-4" />
            {t('announcement:add_new')}
          </Button>
        )}
      </div>

      <div className="mb-4 p-3 bg-pink-50/50 rounded-lg border border-pink-200/50">
        <p className="text-xs font-medium text-pink-700">
          📊 {t('announcement:no_announcements')}: <span className="font-bold">{announcements.length}</span> / 3
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200 border border-gray-100">
            <form onSubmit={handleSubmit} className="p-5">
          <h3 className="text-lg font-bold mb-4 text-gray-800">
            {editingId ? `✏️ ${t('announcement:edit_announcement')}` : `➕ ${t('announcement:add_new')}`}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">{t('announcement:title_placeholder')} ({t('common:optional')})</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                placeholder={t('announcement:title_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {t('announcement:image_selected')} (800x800px {t('common:recommended')}) {!editingId && <span className="text-red-600">*</span>}
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 transition-all"
                  required={!editingId}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Upload className="h-3 w-3" />
                {t('announcement:file_too_large')}
              </p>
              {imagePreview && (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt={t('image:preview')}
                    className="w-40 h-40 object-cover rounded-xl border-2 border-gray-300 shadow-md hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => openImageModal(imagePreview, t('image:preview'))}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">{t('announcement:link_placeholder')}</label>
              <input
                type="url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                placeholder={t('announcement:link_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">{t('announcement:order_placeholder')}</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormData({ ...formData, display_order: value ? value : 0 });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                min="0"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex-1 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:via-rose-600 hover:to-pink-600 font-semibold py-2.5 text-sm">
              {editingId ? `💾 ${t('announcement:save')}` : `➕ ${t('announcement:add')}`}
            </Button>
            <Button type="button" onClick={resetForm} variant="outline" className="flex-1 border font-semibold py-2.5 text-sm">
              ❌ {t('common:cancel')}
            </Button>
          </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm font-medium">📭 {t('announcement:no_announcements')}</p>
            <p className="text-xs mt-1">{t('announcement:click_to_add')}</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-pink-300 transition-all bg-white/50 mb-3">
              <div className="relative group">
                <img
                  src={announcement.image_url}
                  alt={announcement.title ? announcement.title : t('announcement:title_placeholder')}
                  className="w-28 h-28 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform shadow-md"
                  onClick={() => {
                    const title = announcement.title ? announcement.title : `Announcement #${announcement.id}`;
                    openImageModal(announcement.image_url, title);
                  }}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-lg">
                  {announcement.title ? announcement.title : `Announcement #${announcement.id}`}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  📊 {t('announcement:order_placeholder')}: <span className="font-semibold">{announcement.display_order}</span>
                  {announcement.link_url && (
                    <>
                      {' | 🔗 '}
                      <a href={announcement.link_url} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">
                        {announcement.link_url.substring(0, 40)}...
                      </a>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      announcement.is_active
                        ? 'bg-gradient-to-r from-green-400 to-green-600 text-white'
                        : 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
                    }`}>
                    {announcement.is_active ? `✅ ${t('announcement:active')}` : `⛔ ${t('announcement:inactive')}`}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                  variant="outline"
                  size="icon"
                  className="border-2"
                  title={announcement.is_active ? t('announcement:hide') : t('announcement:show')}>
                  {announcement.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                <Button
                  onClick={() => handleEdit(announcement)}
                  variant="outline"
                  size="icon"
                  className="border-2"
                  title={t('announcement:edit')}>
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  onClick={() => handleDelete(announcement.id)}
                  variant="outline"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-red-300"
                  title={t('announcement:delete')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {imageModal.show && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
          onClick={() => setImageModal({ show: false, url: '', title: '' })}>
          <div className="relative max-w-5xl max-h-[95vh] animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setImageModal({ show: false, url: '', title: '' })}
              className="absolute -top-6 -right-6 bg-white rounded-full p-3 shadow-2xl hover:bg-gray-100 transition-colors z-10 group">
              <X className="h-6 w-6 text-gray-700 group-hover:rotate-90 transition-transform" />
            </button>
            <img
              src={imageModal.url}
              alt={imageModal.title}
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl border-4 border-white"
            />
            {imageModal.title && (
              <div className="mt-4 bg-white rounded-xl p-4 text-center shadow-xl">
                <p className="text-gray-800 font-bold text-lg">{imageModal.title}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManager;
