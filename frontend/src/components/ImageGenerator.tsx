import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '@/utils/toast';
import logger from '@/utils/logger';
import ImageUpload from '@/components/ImageUpload';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/utils/apiClient';
import { Download, Sparkles, RefreshCw, Image as ImageIcon, Lock } from 'lucide-react';

type StyleType = 'anime' | 'watercolor' | 'classic' | 'cute' | 'fantasy';

interface StyleOption {
  id: StyleType;
  name: string;
  available: boolean;
}

const ImageGenerator = () => {
  const { t } = useLanguage();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('anime');
  const previewUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const styles: StyleOption[] = [
    {
      id: 'anime',
      name: t('image:style_anime'),
      available: true,
    },
    {
      id: 'watercolor',
      name: t('image:style_watercolor'),
      available: true,
    },
    {
      id: 'classic',
      name: t('sidebar:styleClassic'),
      available: false,
    },
    {
      id: 'cute',
      name: t('sidebar:styleCute'),
      available: false,
    },
    {
      id: 'fantasy',
      name: t('sidebar:styleFantasy'),
      available: false,
    },
  ];

  const cleanupUrls = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setGeneratedImageUrl(null);
    setSelectedImage(null);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupUrls();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupUrls();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!selectedImage) {
      showToast.error(t('image:error.no_image'));
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setProcessingMessage(t('image:generating'));
    setElapsedTime(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('session_id', sessionId);
      formData.append('style', selectedStyle);

      const response = await apiClient.postFormData(
        '/api/generate/image',
        formData,
        {},
        { maxRetries: 2 }
      );

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (response.ok) {
        try {
          const data = await response.json();

          if (data?.image_url) {
            setGeneratedImageUrl(data.image_url);
            showToast.success(t('image:success'));
          } else {
            logger.warn('No image_url in response', 'ImageGenerator.handleGenerate', data);
            showToast.error(t('image:no_image_url'));
          }
        } catch (jsonError) {
          logger.error('Failed to parse response JSON', 'ImageGenerator.handleGenerate', jsonError);
          showToast.error(t('image:read_error'));
        }
      } else {
        try {
          const errorData = await response.json();
          const errorMsg = errorData?.detail || errorData?.message;
          const statusCode = response.status;
          
          let displayMessage = '';
          
          if (statusCode === 402 || errorMsg?.toLowerCase().includes('payment_required') || errorMsg?.toLowerCase().includes('payment required')) {
            displayMessage = t('image:error.payment_required');
          } else if (statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
            displayMessage = t('image:error.server_error');
          } else if (statusCode === 429) {
            displayMessage = t('image:error.rate_limit');
          } else if (statusCode === 400) {
            displayMessage = t('image:error.bad_request');
          } else if (statusCode === 401 || statusCode === 403) {
            displayMessage = t('image:error.unauthorized');
          } else {
            displayMessage = t('image:error.http_error');
          }
          
          showToast.error(displayMessage, { duration: 5000 });
        } catch (jsonError) {
          logger.error('Failed to parse error response', 'ImageGenerator.handleGenerate', jsonError);
          const statusCode = response.status;
          if (statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
            showToast.error(t('image:error.server_error'), { duration: 5000 });
          } else {
            showToast.error(t('image:http_error_format', { status: statusCode }), { duration: 5000 });
          }
        }
      }
    } catch (error) {
      logger.error('Generation error', 'ImageGenerator.handleGenerate', error);
      showToast.error(
        t('image:error.network_error')
      );
    } finally {
      setIsGenerating(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
      link.download = `${t('image:filename_prefix')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success(t('image:download_success'));
    } catch (error) {
      logger.error('Download failed', 'ImageGenerator.handleDownload', error);
      showToast.error(t('image:download_error'));
    }
  };

  const handleGenerateAgain = () => {
    cleanupUrls();
    setSelectedImage(null);
    setProcessingMessage('');
    setElapsedTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleImageSelect = (file: File) => {
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
    <div className="w-full flex items-center justify-center p-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 border-2 border-pink-100 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-pink-600" />
            <h2 className="text-lg font-bold text-pink-700">{t('image:select_style')}</h2>
          </div>
          
          <div className="flex flex-col gap-2">
            {styles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  if (style.available) {
                    setSelectedStyle(style.id);
                  }
                }}
                disabled={!style.available || isGenerating}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all border-2 ${
                  selectedStyle === style.id
                    ? 'bg-pink-100 border-pink-400 shadow-md'
                    : 'bg-white border-pink-200 hover:border-pink-300'
                } ${
                  !style.available ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-pink-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-pink-700 flex items-center gap-2">
                    {style.name}
                    {!style.available && (
                      <Lock className="w-4 h-4 text-pink-400" />
                    )}
                  </span>
                  {!style.available && (
                    <span className="text-xs text-pink-400 font-normal">
                      {t('image:style_locked')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 border-2 border-pink-100 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-pink-600" />
            <h2 className="text-lg font-bold text-pink-700">{t('image:input_image')}</h2>
          </div>
          
          <div className="flex flex-col w-full">
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

            {selectedImage && (
              <div className="mt-2 p-2 bg-pink-50 border border-pink-200 rounded-lg">
                <p className="text-xs text-pink-700">
                  {t('image:care_message')}
                </p>
              </div>
            )}

            {selectedImage && !isGenerating && (
              <div className="mt-3">
                <button
                  onClick={handleGenerate}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('image:generate')}
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="mt-3 flex items-center justify-center gap-2 text-pink-600">
                <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium text-sm">{processingMessage ? processingMessage : t('image:generating')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Result Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 border-2 border-pink-100 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-pink-600" />
            <h2 className="text-lg font-bold text-pink-700">{t('image:result')}</h2>
          </div>
          
          <div className="flex items-center justify-center min-h-[250px] max-h-[400px] overflow-auto">
            {isGenerating ? (
              <div className="w-full text-center space-y-5 px-4 py-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-pink-300 border-r-pink-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-pink-700 font-bold text-lg">{processingMessage ? processingMessage : t('image:generating')}</p>
                  <div className="w-full bg-pink-100 rounded-full h-4 overflow-hidden shadow-inner border border-pink-200">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 rounded-full transition-all duration-500 relative overflow-hidden"
                      style={{ 
                        width: `${Math.min(95, 15 + (elapsedTime * 4))}%` 
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-3 rounded-xl border-2 border-pink-200 shadow-sm">
                    <RefreshCw className="w-5 h-5 text-pink-600 animate-spin" />
                    <div className="flex items-baseline gap-1">
                      <span className="font-black text-2xl text-pink-700">{elapsedTime}</span>
                      <span className="text-sm font-semibold text-pink-600">{t('image:time_sec')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : generatedImageUrl ? (
              <div className="w-full space-y-3">
                <div className="relative rounded-xl overflow-hidden border-2 border-pink-200 shadow-lg bg-white max-h-[300px] overflow-auto">
                  <img
                    src={generatedImageUrl}
                    alt={t('image:generated_chibi')}
                    className="w-full h-auto object-contain"
                    onLoad={() => {
                      if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                      }
                    }}
                  />
                </div>
                {elapsedTime > 0 && (
                  <div className="text-center text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg">
                    {t('image:elapsed_time', { time: elapsedTime })}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-lg font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    {t('image:download')}
                  </button>
                  <button
                    onClick={handleGenerateAgain}
                    className="flex-1 py-2.5 px-6 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-lg font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('image:generate_again')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('image:result_placeholder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;

