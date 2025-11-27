import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '@/utils/toast';
import logger from '@/utils/logger';
import ImageUpload from '@/components/ImageUpload';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/utils/apiClient';
import { Download, Sparkles, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';
const ImageGenerator = () => {
    const { t } = useLanguage();
    const [selectedImage, setSelectedImage] = useState(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sessionId] = useState(() => uuidv4());
    const [processingMessage, setProcessingMessage] = useState('');
    const previewUrlRef = useRef(null);
    // Cleanup function to revoke object URLs and clear state
    const cleanupUrls = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        // Clear generated image URL (it's from server, not object URL, so no need to revoke)
        setGeneratedImageUrl(null);
        setSelectedImage(null);
    };
    // Cleanup on unmount and before page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            cleanupUrls();
        };
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page is being hidden (tab switch, minimize, etc.)
                // Don't cleanup here, only on actual unload
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            cleanupUrls();
        };
    }, []);
    const handleGenerate = async () => {
        if (!selectedImage) {
            showToast.error(t('image:error.no_image') || 'Please upload an image first');
            return;
        }
        setIsGenerating(true);
        setGeneratedImageUrl(null);
        setProcessingMessage('Generating your cartoon avatar...');
        try {
            const formData = new FormData();
            formData.append('file', selectedImage);
            formData.append('session_id', sessionId);
            const response = await apiClient.postFormData('/generate/chibi', formData, {}, { maxRetries: 2 });
            if (response.ok) {
                try {
                    const data = await response.json();
                    if (data?.image_url) {
                        setGeneratedImageUrl(data.image_url);
                        showToast.success('✨ สร้างภาพจิบิสำเร็จแล้วค่ะ!');
                    }
                    else {
                        logger.warn('No image_url in response', 'ImageGenerator.handleGenerate', data);
                        showToast.error('ไม่พบข้อมูลภาพที่สร้าง');
                    }
                }
                catch (jsonError) {
                    logger.error('Failed to parse response JSON', 'ImageGenerator.handleGenerate', jsonError);
                    showToast.error('เกิดข้อผิดพลาดในการอ่านข้อมูลจากเซิร์ฟเวอร์');
                }
            }
            else {
                try {
                    const errorData = await response.json();
                    const errorMsg = errorData?.detail || 'เกิดข้อผิดพลาดในการสร้างภาพ';
                    showToast.error(errorMsg);
                }
                catch (jsonError) {
                    logger.error('Failed to parse error response', 'ImageGenerator.handleGenerate', jsonError);
                    showToast.error(`เกิดข้อผิดพลาด (HTTP ${response.status})`);
                }
            }
        }
        catch (error) {
            logger.error('Generation error', 'ImageGenerator.handleGenerate', error);
            showToast.error(t('image:error.network_error') || 'Cannot connect to server');
        }
        finally {
            setIsGenerating(false);
        }
    };
    const handleDownload = () => {
        if (!generatedImageUrl) {
            logger.warn('Download attempted without image URL', 'ImageGenerator.handleDownload');
            return;
        }
        try {
            const link = document.createElement('a');
            link.href = generatedImageUrl;
            link.download = `pochi-chibi-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast.success('ดาวน์โหลดภาพสำเร็จ! 🎉');
        }
        catch (error) {
            logger.error('Download failed', 'ImageGenerator.handleDownload', error);
            showToast.error('เกิดข้อผิดพลาดในการดาวน์โหลด');
        }
    };
    const handleGenerateAgain = () => {
        cleanupUrls();
        setSelectedImage(null);
        setProcessingMessage('');
    };
    const handleImageSelect = (file) => {
        // Cleanup previous image
        if (selectedImage) {
            cleanupUrls();
        }
        setSelectedImage(file);
    };
    const handleImageClear = () => {
        cleanupUrls();
        setSelectedImage(null);
    };
    return (_jsx("div", { className: "max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 h-full", children: [_jsxs("div", { className: "bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border-2 border-pink-100 flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(ImageIcon, { className: "w-5 h-5 text-pink-600" }), _jsx("h2", { className: "text-xl font-bold text-pink-700", children: "Input Image" })] }), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx(ImageUpload, { onImageSelect: handleImageSelect, selectedImage: selectedImage, onClear: handleImageClear, disabled: isGenerating, onPreviewUrlChange: (url) => {
                                        if (previewUrlRef.current) {
                                            URL.revokeObjectURL(previewUrlRef.current);
                                        }
                                        previewUrlRef.current = url;
                                    } }), selectedImage && (_jsxs("div", { className: "mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-xs text-amber-800", children: t('image:warning_delete_on_close') || '⚠️ คำเตือน: ภาพที่แนบมาจะถูกลบทิ้งทันทีหลังจากปิดเว็บนี้' })] })), selectedImage && !isGenerating && (_jsx("div", { className: "mt-4", children: _jsxs("button", { onClick: handleGenerate, className: "w-full py-3 px-6 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2", children: [_jsx(Sparkles, { className: "w-5 h-5" }), t('image:generate') || 'Generate', _jsx(Sparkles, { className: "w-5 h-5" })] }) })), isGenerating && (_jsxs("div", { className: "mt-4 flex items-center justify-center gap-3 text-pink-600", children: [_jsx("div", { className: "w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "font-medium", children: processingMessage || 'Generating...' })] }))] })] }), _jsxs("div", { className: "bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border-2 border-pink-100 flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(ImageIcon, { className: "w-5 h-5 text-pink-600" }), _jsx("h2", { className: "text-xl font-bold text-pink-700", children: "Result" })] }), _jsx("div", { className: "flex-1 flex items-center justify-center min-h-[400px]", children: isGenerating ? (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" }), _jsx("p", { className: "text-pink-600 font-medium", children: processingMessage || 'Generating your cartoon...' })] })) : generatedImageUrl ? (_jsxs("div", { className: "w-full space-y-4", children: [_jsx("div", { className: "relative rounded-2xl overflow-hidden border-4 border-pink-200 shadow-2xl bg-white", children: _jsx("img", { src: generatedImageUrl, alt: "Generated Chibi", className: "w-full h-auto object-contain" }) }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("button", { onClick: handleDownload, className: "flex-1 py-3 px-6 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2", children: [_jsx(Download, { className: "w-5 h-5" }), t('image:download') || 'Download'] }), _jsxs("button", { onClick: handleGenerateAgain, className: "flex-1 py-3 px-6 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2", children: [_jsx(RefreshCw, { className: "w-5 h-5" }), t('image:generate_again') || 'Generate Again'] })] })] })) : (_jsxs("div", { className: "text-center text-gray-400", children: [_jsx(ImageIcon, { className: "w-24 h-24 mx-auto mb-4 opacity-30" }), _jsx("p", { className: "text-lg", children: "Generated image will appear here" })] })) })] })] }) }));
};
export default ImageGenerator;
