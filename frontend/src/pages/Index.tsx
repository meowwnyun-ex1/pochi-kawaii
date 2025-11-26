import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '@/utils/toast';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import Sidebar from '@/components/Sidebar';
import ThinkingProcess, { type ProcessingStage } from '@/components/ThinkingProcess';
import ImageUpload from '@/components/ImageUpload';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/utils/apiClient';
import { Download, Sparkles, RefreshCw } from 'lucide-react';

interface ProcessingStep {
  id: string;
  stage: ProcessingStage;
  message: string;
  status: 'active' | 'complete' | 'pending';
  timestamp: Date;
  duration?: number;
}

const Index = () => {
  const { language, t, loading } = useLanguage();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [processingStage, setProcessingStage] = useState<ProcessingStage>('analyzing');
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [processingMessage, setProcessingMessage] = useState<string>('');

  useEffect(() => {
    if (loading) return;
  }, [loading]);

  const addProcessingStep = (stage: ProcessingStage, message: string) => {
    const stepId = uuidv4();
    setProcessingSteps((prev) => {
      const updatedPrev = prev.map((step) =>
        step.status === 'active' ? { ...step, status: 'complete' as const } : step
      );
      return [
        ...updatedPrev,
        {
          id: stepId,
          stage,
          message,
          status: 'active' as const,
          timestamp: new Date(),
        },
      ];
    });
    return stepId;
  };

  const completeProcessingStep = (stepId: string, duration?: number) => {
    setProcessingSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, status: 'complete' as const, duration }
          : step
      )
    );
  };

  const simulateProcessingStages = async () => {
    setProcessingSteps([]);
    setProcessingStage('analyzing');

    const analyzingMsg = t('chat:stage_analyzing') || 'Analyzing your image';
    setProcessingMessage(analyzingMsg);
    const step1 = addProcessingStep('analyzing', analyzingMsg);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    completeProcessingStep(step1, 1000);

    setProcessingStage('thinking');
    const thinkingMsg = t('chat:stage_thinking') || 'Processing image';
    setProcessingMessage(thinkingMsg);
    const step2 = addProcessingStep('thinking', thinkingMsg);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    completeProcessingStep(step2, 1500);

    setProcessingStage('researching');
    const researchingMsg = t('chat:stage_researching') || 'Creating chibi features';
    setProcessingMessage(researchingMsg);
    const step3 = addProcessingStep('researching', researchingMsg);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    completeProcessingStep(step3, 2000);

    setProcessingStage('generating');
    const generatingMsg = t('chat:stage_generating') || 'Generating your cartoon';
    setProcessingMessage(generatingMsg);
    const step4 = addProcessingStep('generating', generatingMsg);
    return step4;
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      showToast.error(t('chat:error.no_image') || 'Please upload an image first');
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl(null);

    const lastStepId = await simulateProcessingStages();

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
        const data = await response.json();

        completeProcessingStep(lastStepId, 500);
        setProcessingStage('complete');

        if (data.image_url) {
          setGeneratedImageUrl(data.image_url);
          showToast.success('✨ สร้างภาพจิบิสำเร็จแล้วค่ะ!');
        } else {
          showToast.error('ไม่พบข้อมูลภาพที่สร้าง');
        }
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.detail || 'เกิดข้อผิดพลาดในการสร้างภาพ';
        showToast.error(errorMsg);
      }
    } catch (error) {
      console.error('Generation error:', error);
      showToast.error(
        t('chat:error.network_error') || 'Cannot connect to server'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;

    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `pochi-chibi-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast.success('ดาวน์โหลดภาพสำเร็จ! 🎉');
  };

  const handleGenerateAgain = () => {
    setGeneratedImageUrl(null);
    setSelectedImage(null);
    setProcessingSteps([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen gradient-background">
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            role="status"
            aria-label={t('common.loading') || 'Loading...'}
          />
          <p className="text-pink-600 font-medium">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen gradient-background overflow-hidden pb-12">
      <AnnouncementPopup />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex min-h-0 relative pt-16">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative z-0 flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 py-8">

              {/* Welcome Message */}
              <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent mb-3">
                  🌸 {t('sidebar:appName')} 🌸
                </h1>
                <p className="text-pink-600 text-lg">
                  {t('chat:greeting')}
                </p>
              </div>

              {/* Main Content */}
              <div className="space-y-6">

                {/* Image Upload Section */}
                {!generatedImageUrl && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border-2 border-pink-100">
                    <ImageUpload
                      onImageSelect={setSelectedImage}
                      selectedImage={selectedImage}
                      onClear={() => setSelectedImage(null)}
                      disabled={isGenerating}
                    />

                    {selectedImage && !isGenerating && (
                      <div className="mt-6">
                        <button
                          onClick={handleGenerate}
                          className="w-full py-4 px-6 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                        >
                          <Sparkles className="w-6 h-6" />
                          {t('chat:generate')}
                          <Sparkles className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Processing Animation */}
                {isGenerating && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border-2 border-pink-100">
                    <ThinkingProcess
                      currentStage={processingStage}
                      steps={processingSteps}
                      message={processingMessage}
                      isDeepThink={false}
                    />
                  </div>
                )}

                {/* Generated Image Display */}
                {generatedImageUrl && !isGenerating && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border-2 border-pink-100">
                    <div className="space-y-6">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-pink-600 mb-2">
                          ✨ ภาพจิบิของคุณพร้อมแล้ว! ✨
                        </h2>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden border-4 border-pink-200 shadow-2xl">
                        <img
                          src={generatedImageUrl}
                          alt="Generated Chibi"
                          className="w-full h-auto object-contain bg-white"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={handleDownload}
                          className="flex-1 py-3 px-6 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          {t('chat:download')}
                        </button>

                        <button
                          onClick={handleGenerateAgain}
                          className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-5 h-5" />
                          {t('chat:generate_again')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <AppFooter showCarousel={false} />
    </div>
  );
};

export default Index;
