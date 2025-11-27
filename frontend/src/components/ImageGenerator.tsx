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

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const previewUrlRef = useRef<string | null>(null);

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

      const response = await apiClient.postFormData(
        '/generate/chibi',
        formData,
        {},
        { maxRetries: 2 }
      );

      if (response.ok) {
        try {
          const data = await response.json();

          if (data?.image_url) {
            setGeneratedImageUrl(data.image_url);
            showToast.success('✨ สร้างภาพจิบิสำเร็จแล้วค่ะ!');
          } else {
            logger.warn('No image_url in response', 'ImageGenerator.handleGenerate', data);
            showToast.error('ไม่พบข้อมูลภาพที่สร้าง');
          }
        } catch (jsonError) {
          logger.error('Failed to parse response JSON', 'ImageGenerator.handleGenerate', jsonError);
          showToast.error('เกิดข้อผิดพลาดในการอ่านข้อมูลจากเซิร์ฟเวอร์');
        }
      } else {
        try {
          const errorData = await response.json();
          const errorMsg = errorData?.detail || 'เกิดข้อผิดพลาดในการสร้างภาพ';
          showToast.error(errorMsg);
        } catch (jsonError) {
          logger.error('Failed to parse error response', 'ImageGenerator.handleGenerate', jsonError);
          showToast.error(`เกิดข้อผิดพลาด (HTTP ${response.status})`);
        }
      }
    } catch (error) {
      logger.error('Generation error', 'ImageGenerator.handleGenerate', error);
      showToast.error(
        t('image:error.network_error') || 'Cannot connect to server'
      );
    } finally {
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
    } catch (error) {
      logger.error('Download failed', 'ImageGenerator.handleDownload', error);
      showToast.error('เกิดข้อผิดพลาดในการดาวน์โหลด');
    }
  };

  const handleGenerateAgain = () => {
    cleanupUrls();
    setSelectedImage(null);
    setProcessingMessage('');
  };

  const handleImageSelect = (file: File) => {
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

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
      {/* Main Content - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Input Image Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border-2 border-pink-100 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-pink-600" />
            <h2 className="text-xl font-bold text-pink-700">Input Image</h2>
          </div>
          
          <div className="flex-1 flex flex-col">
            <ImageUpload
              onImageSelect={handleImageSelect}
              selectedImage={selectedImage}
              onClear={handleImageClear}
              disabled={isGenerating}
              onPreviewUrlChange={(url) => {
                if (previewUrlRef.current) {
                  URL.revokeObjectURL(previewUrlRef.current);
                }
                previewUrlRef.current = url;
              }}
            />

            {/* Warning message */}
            {selectedImage && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  {t('image:warning_delete_on_close') || '⚠️ คำเตือน: ภาพที่แนบมาจะถูกลบทิ้งทันทีหลังจากปิดเว็บนี้'}
                </p>
              </div>
            )}

            {selectedImage && !isGenerating && (
              <div className="mt-4">
                <button
                  onClick={handleGenerate}
                  className="w-full py-3 px-6 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {t('image:generate') || 'Generate'}
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="mt-4 flex items-center justify-center gap-3 text-pink-600">
                <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">{processingMessage || 'Generating...'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Result Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border-2 border-pink-100 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-pink-600" />
            <h2 className="text-xl font-bold text-pink-700">Result</h2>
          </div>
          
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            {isGenerating ? (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-pink-600 font-medium">{processingMessage || 'Generating your cartoon...'}</p>
              </div>
            ) : generatedImageUrl ? (
              <div className="w-full space-y-4">
                <div className="relative rounded-2xl overflow-hidden border-4 border-pink-200 shadow-2xl bg-white">
                  <img
                    src={generatedImageUrl}
                    alt="Generated Chibi"
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    {t('image:download') || 'Download'}
                  </button>
                  <button
                    onClick={handleGenerateAgain}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    {t('image:generate_again') || 'Generate Again'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon className="w-24 h-24 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Generated image will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;

