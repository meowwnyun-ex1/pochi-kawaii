import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/utils/toast';
import logger from '@/utils/logger';
import { Plus, Trash2, Edit, Eye, EyeOff, ZoomIn, X, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
const AnnouncementManager = ({ token }) => {
    const { t } = useTranslation(['announcement', 'common']);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        link_url: '',
        display_order: 0,
    });
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [imageModal, setImageModal] = useState({
        show: false,
        url: '',
        title: '',
    });
    const fetchAnnouncements = async () => {
        try {
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiBaseUrl}/api/announcements/admin/all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.announcements || []);
            }
            else {
                showToast.error(t('announcement:load_failed'), { icon: '❌' });
            }
        }
        catch (error) {
            logger.error('Error fetching announcements', 'AnnouncementManager', error);
            showToast.error(t('announcement:load_error'), { icon: '⚠️' });
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchAnnouncements();
    }, [token]);
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast.warning(t('announcement:invalid_file_type'), { icon: '⚠️' });
            return;
        }
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast.warning(t('announcement:file_too_large'), { icon: '⚠️' });
            return;
        }
        setSelectedImage(file);
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
        showToast.success(t('announcement:image_selected'), { duration: 1500, icon: '📸' });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validate image for new announcements
        if (!selectedImage && !editingId) {
            showToast.warning(t('announcement:no_image') || 'Please select an image', { icon: '⚠️' });
            return;
        }
        // Validate image for updates (if no existing image and no new image)
        if (editingId && !selectedImage && !imagePreview) {
            showToast.warning(t('announcement:no_image') || 'Please select an image', { icon: '⚠️' });
            return;
        }
        try {
            const formDataToSend = new FormData();
            // Append form fields
            if (formData.title) {
                formDataToSend.append('title', formData.title);
            }
            if (formData.link_url) {
                formDataToSend.append('link_url', formData.link_url);
            }
            formDataToSend.append('display_order', formData.display_order.toString());
            // Append image if provided
            if (selectedImage) {
                formDataToSend.append('image', selectedImage);
            }
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            if (editingId) {
                // Update existing announcement
                const res = await fetch(`${apiBaseUrl}/api/announcements/admin/${editingId}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formDataToSend,
                });
                if (res.ok) {
                    try {
                        const data = await res.json();
                        showToast.success(t('announcement:update_success') || 'Announcement updated successfully', { icon: '✅' });
                        await fetchAnnouncements();
                        resetForm();
                    }
                    catch (jsonError) {
                        logger.error('Failed to parse update response', 'AnnouncementManager.handleSubmit', jsonError);
                        showToast.error('เกิดข้อผิดพลาดในการอ่านข้อมูล', { icon: '❌' });
                    }
                }
                else {
                    try {
                        const errorData = await res.json();
                        showToast.error(errorData?.detail || t('announcement:update_failed') || 'Failed to update announcement', { icon: '❌', duration: 5000 });
                    }
                    catch (jsonError) {
                        logger.error('Failed to parse error response', 'AnnouncementManager.handleSubmit', jsonError);
                        showToast.error(`เกิดข้อผิดพลาด (HTTP ${res.status})`, { icon: '❌', duration: 5000 });
                    }
                }
            }
            else {
                // Create new announcement
                if (announcements.length >= 3) {
                    showToast.warning(t('announcement:max_limit') || 'Maximum 3 announcements allowed', { duration: 3500, icon: '⚠️' });
                    return;
                }
                // Ensure image is provided for new announcements
                if (!selectedImage) {
                    showToast.warning(t('announcement:no_image') || 'Please select an image', { icon: '⚠️' });
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
                    try {
                        const data = await res.json();
                        showToast.success(t('announcement:create_success') || 'Announcement created successfully', { icon: '🎉' });
                        await fetchAnnouncements();
                        resetForm();
                    }
                    catch (jsonError) {
                        logger.error('Failed to parse create response', 'AnnouncementManager.handleSubmit', jsonError);
                        showToast.error('เกิดข้อผิดพลาดในการอ่านข้อมูล', { icon: '❌' });
                    }
                }
                else {
                    try {
                        const errorData = await res.json();
                        showToast.error(errorData?.detail || t('announcement:create_failed') || 'Failed to create announcement', { icon: '❌', duration: 5000 });
                    }
                    catch (jsonError) {
                        logger.error('Failed to parse error response', 'AnnouncementManager.handleSubmit', jsonError);
                        showToast.error(`เกิดข้อผิดพลาด (HTTP ${res.status})`, { icon: '❌', duration: 5000 });
                    }
                }
            }
        }
        catch (error) {
            logger.error('Error submitting announcement', 'AnnouncementManager.handleSubmit', error);
            showToast.error(t('announcement:error') || 'An error occurred', { icon: '❌', duration: 5000 });
        }
    };
    const handleDelete = async (id) => {
        if (!confirm(t('announcement:delete_confirm'))) {
            return;
        }
        try {
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiBaseUrl}/api/announcements/admin/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                showToast.success(t('announcement:delete_success'), { icon: '🗑️' });
                fetchAnnouncements();
            }
            else {
                showToast.error(t('announcement:delete_failed'), { icon: '❌' });
            }
        }
        catch (error) {
            logger.error('Error deleting announcement', 'AnnouncementManager.handleDelete', error);
            showToast.error(t('announcement:error'), { icon: '❌' });
        }
    };
    const handleToggleActive = async (id, currentStatus) => {
        try {
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
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
            }
            else {
                showToast.error(t('announcement:status_update_failed'), { icon: '❌' });
            }
        }
        catch (error) {
            logger.error('Error toggling announcement status', 'AnnouncementManager.handleToggleActive', error);
            showToast.error(t('announcement:error'), { icon: '❌' });
        }
    };
    const handleEdit = (announcement) => {
        setEditingId(announcement.id);
        setFormData({
            title: announcement.title || '',
            link_url: announcement.link_url || '',
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
    const openImageModal = (url, title) => {
        setImageModal({ show: true, url, title: title || 'Announcement Image' });
    };
    if (loading) {
        return (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Loading..." })] }));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800 flex items-center gap-2", children: "\uD83D\uDCE2 \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28 Popup" }), !showForm && announcements.length < 3 && (_jsxs(Button, { onClick: () => setShowForm(true), className: "flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold", children: [_jsx(Plus, { className: "h-5 w-5" }), "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28"] }))] }), _jsx("div", { className: "mb-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-200", children: _jsxs("p", { className: "text-sm font-medium text-blue-700", children: ["\uD83D\uDCCA ", t('announcement:no_announcements'), ": ", _jsx("span", { className: "font-bold", children: announcements.length }), " / 3"] }) }), showForm && (_jsxs("form", { onSubmit: handleSubmit, className: "mb-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-blue-200 shadow-md", children: [_jsx("h3", { className: "text-xl font-bold mb-4 text-gray-800", children: editingId ? `✏️ ${t('announcement:edit_announcement')}` : `➕ ${t('announcement:add_new')}` }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2 text-gray-700", children: [t('announcement:title_placeholder'), " (", t('common:optional') || 'optional', ")"] }), _jsx("input", { type: "text", value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all", placeholder: t('announcement:title_placeholder') })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2 text-gray-700", children: [t('announcement:image_selected'), " (800x800px ", t('common:recommended') || 'recommended', ") ", !editingId && _jsx("span", { className: "text-red-600", children: "*" })] }), _jsx("div", { className: "relative", children: _jsx("input", { type: "file", accept: "image/*", onChange: handleImageChange, className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all", required: !editingId }) }), _jsxs("p", { className: "text-xs text-gray-500 mt-2 flex items-center gap-1", children: [_jsx(Upload, { className: "h-3 w-3" }), t('announcement:file_too_large')] }), imagePreview && (_jsx("div", { className: "mt-3", children: _jsx("img", { src: imagePreview, alt: "Preview", className: "w-40 h-40 object-cover rounded-xl border-2 border-gray-300 shadow-md hover:scale-105 transition-transform cursor-pointer", onClick: () => openImageModal(imagePreview, 'Preview') }) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-700", children: t('announcement:link_placeholder') }), _jsx("input", { type: "url", value: formData.link_url, onChange: (e) => setFormData({ ...formData, link_url: e.target.value }), className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all", placeholder: t('announcement:link_placeholder') })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-700", children: t('announcement:order_placeholder') }), _jsx("input", { type: "number", value: formData.display_order, onChange: (e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 }), className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all", min: "0" })] })] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx(Button, { type: "submit", className: "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold py-3", children: editingId ? `💾 ${t('announcement:save')}` : `➕ ${t('announcement:add')}` }), _jsxs(Button, { type: "button", onClick: resetForm, variant: "outline", className: "flex-1 border-2 font-semibold py-3", children: ["\u274C ", t('common:cancel')] })] })] })), _jsx("div", { className: "space-y-4", children: announcements.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300", children: [_jsxs("p", { className: "text-lg font-medium", children: ["\uD83D\uDCED ", t('announcement:no_announcements')] }), _jsx("p", { className: "text-sm mt-1", children: t('announcement:click_to_add') })] })) : (announcements.map((announcement) => (_jsxs("div", { className: "flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:shadow-xl hover:border-blue-300 transition-all bg-white", children: [_jsxs("div", { className: "relative group", children: [_jsx("img", { src: announcement.image_url, alt: announcement.title || 'Announcement', className: "w-28 h-28 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform shadow-md", onClick: () => openImageModal(announcement.image_url, announcement.title || `Announcement #${announcement.id}`), onError: (e) => {
                                        const target = e.currentTarget;
                                        target.src =
                                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                                    } }), _jsx("div", { className: "absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center", children: _jsx(ZoomIn, { className: "h-8 w-8 text-white" }) })] }), _jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-bold text-gray-800 text-lg", children: announcement.title || `Announcement #${announcement.id}` }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["\uD83D\uDCCA ", t('announcement:order_placeholder'), ": ", _jsx("span", { className: "font-semibold", children: announcement.display_order }), announcement.link_url && (_jsxs(_Fragment, { children: [' | 🔗 ', _jsxs("a", { href: announcement.link_url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:underline", children: [announcement.link_url.substring(0, 40), "..."] })] }))] }), _jsx("div", { className: "flex items-center gap-2 mt-2", children: _jsx("span", { className: `text-xs px-3 py-1 rounded-full font-semibold ${announcement.is_active
                                            ? 'bg-gradient-to-r from-green-400 to-green-600 text-white'
                                            : 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'}`, children: announcement.is_active ? `✅ ${t('announcement:active')}` : `⛔ ${t('announcement:inactive')}` }) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => handleToggleActive(announcement.id, announcement.is_active), variant: "outline", size: "icon", className: "border-2", title: announcement.is_active ? t('announcement:hide') : t('announcement:show'), children: announcement.is_active ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) }), _jsx(Button, { onClick: () => handleEdit(announcement), variant: "outline", size: "icon", className: "border-2", title: t('announcement:edit'), children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx(Button, { onClick: () => handleDelete(announcement.id), variant: "outline", size: "icon", className: "text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-red-300", title: t('announcement:delete'), children: _jsx(Trash2, { className: "h-4 w-4" }) })] })] }, announcement.id)))) }), imageModal.show && (_jsx("div", { className: "fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200", onClick: () => setImageModal({ show: false, url: '', title: '' }), children: _jsxs("div", { className: "relative max-w-5xl max-h-[95vh] animate-in zoom-in duration-300", onClick: (e) => e.stopPropagation(), children: [_jsx("button", { onClick: () => setImageModal({ show: false, url: '', title: '' }), className: "absolute -top-6 -right-6 bg-white rounded-full p-3 shadow-2xl hover:bg-gray-100 transition-colors z-10 group", children: _jsx(X, { className: "h-6 w-6 text-gray-700 group-hover:rotate-90 transition-transform" }) }), _jsx("img", { src: imageModal.url, alt: imageModal.title, className: "max-w-full max-h-[90vh] rounded-2xl shadow-2xl border-4 border-white" }), imageModal.title && (_jsx("div", { className: "mt-4 bg-white rounded-xl p-4 text-center shadow-xl", children: _jsx("p", { className: "text-gray-800 font-bold text-lg", children: imageModal.title }) }))] }) }))] }));
};
export default AnnouncementManager;
