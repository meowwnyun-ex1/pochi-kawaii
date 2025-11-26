import { useEffect, useState } from 'react';
import { Brain, Code, Search, Sparkles, Check, Loader2, FileText, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export type ProcessingStage =
  | 'analyzing'
  | 'thinking'
  | 'researching'
  | 'coding'
  | 'calculating'
  | 'generating'
  | 'complete';

interface ProcessingStep {
  id: string;
  stage: ProcessingStage;
  message: string;
  status: 'active' | 'complete' | 'pending';
  timestamp: Date;
  duration?: number;
}

interface ThinkingProcessProps {
  currentStage?: ProcessingStage;
  steps?: ProcessingStep[];
  message?: string;
  isDeepThink?: boolean;
}

const stageIcons: Record<ProcessingStage, typeof Brain> = {
  analyzing: FileText,
  thinking: Brain,
  researching: Search,
  coding: Code,
  calculating: Calculator,
  generating: Sparkles,
  complete: Check,
};

const stageColors: Record<ProcessingStage, string> = {
  analyzing: 'text-purple-600 bg-purple-50 border-purple-200',
  thinking: 'text-sky-600 bg-sky-50 border-sky-200',
  researching: 'text-green-600 bg-green-50 border-green-200',
  coding: 'text-orange-600 bg-orange-50 border-orange-200',
  calculating: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  generating: 'text-pink-600 bg-pink-50 border-pink-200',
  complete: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

const stageLabels: Record<ProcessingStage, Record<string, string>> = {
  analyzing: { th: 'กำลังวิเคราะห์คำถาม', en: 'Analyzing question', jp: '質問を分析中', id: 'Menganalisis pertanyaan', zh: '分析问题', ko: '질문 분석 중', vi: 'Đang phân tích câu hỏi', es: 'Analizando pregunta', fil: 'Sinusuri ang tanong', hi: 'प्रश्न का विश्लेषण कर रहे हैं' },
  thinking: { th: 'กำลังคิดและประมวลผล', en: 'Thinking deeply', jp: '深く考え中', id: 'Berpikir mendalam', zh: '深度思考', ko: '깊이 생각 중', vi: 'Đang suy nghĩ sâu', es: 'Pensando profundamente', fil: 'Malalim na pag-iisip', hi: 'गहराई से सोच रहे हैं' },
  researching: { th: 'กำลังค้นหาข้อมูล', en: 'Researching information', jp: '情報を検索中', id: 'Mencari informasi', zh: '搜索信息', ko: '정보 검색 중', vi: 'Đang tìm kiếm thông tin', es: 'Investigando información', fil: 'Naghahanap ng impormasyon', hi: 'जानकारी खोज रहे हैं' },
  coding: { th: 'กำลังเขียนโค้ด', en: 'Writing code', jp: 'コードを書き中', id: 'Menulis kode', zh: '编写代码', ko: '코드 작성 중', vi: 'Đang viết mã', es: 'Escribiendo código', fil: 'Sumusulat ng code', hi: 'कोड लिख रहे हैं' },
  calculating: { th: 'กำลังคำนวณ', en: 'Calculating', jp: '計算中', id: 'Menghitung', zh: '计算中', ko: '계산 중', vi: 'Đang tính toán', es: 'Calculando', fil: 'Kinakalkula', hi: 'गणना कर रहे हैं' },
  generating: { th: 'กำลังสร้างคำตอบ', en: 'Generating response', jp: '応答を生成中', id: 'Membuat respons', zh: '生成回答', ko: '응답 생성 중', vi: 'Đang tạo phản hồi', es: 'Generando respuesta', fil: 'Gumagawa ng sagot', hi: 'उत्तर उत्पन्न कर रहे हैं' },
  complete: { th: 'เสร็จสิ้น', en: 'Complete', jp: '完了', id: 'Selesai', zh: '完成', ko: '완료', vi: 'Hoàn thành', es: 'Completo', fil: 'Tapos na', hi: 'पूर्ण' },
};

const ThinkingProcess = ({
  currentStage = 'thinking',
  steps = [],
  message,
  isDeepThink = false,
}: ThinkingProcessProps) => {
  const { language, config } = useLanguage();
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState('');

  const safeConfig = config || {};
  const thinkingTexts = (safeConfig.thinking_process as Record<string, Record<string, string>> | undefined) || {
    deepThinkMode: { th: 'โหมดคิดลึก - กำลังวิเคราะห์อย่างละเอียด', en: 'Deep Think Mode - Analyzing thoroughly', jp: 'ディープシンクモード - 詳細に分析中', id: 'Mode Berpikir Mendalam - Menganalisis secara menyeluruh', zh: '深度思考模式 - 彻底分析', ko: '깊은 사고 모드 - 철저히 분석 중', vi: 'Chế độ suy nghĩ sâu - Phân tích kỹ lưỡng', es: 'Modo de pensamiento profundo - Analizando a fondo', fil: 'Deep Think Mode - Masusing pagsusuri', hi: 'गहरी सोच मोड - पूरी तरह से विश्लेषण' },
    processingSteps: { th: 'กระบวนการทำงาน', en: 'Processing Steps', jp: '処理ステップ', id: 'Langkah Pemrosesan', zh: '处理步骤', ko: '처리 단계', vi: 'Các bước xử lý', es: 'Pasos de procesamiento', fil: 'Mga Hakbang sa Pagproseso', hi: 'प्रसंस्करण चरण' },
    processing: { th: 'กำลังประมวลผล...', en: 'Processing...', jp: '処理中...', id: 'Memproses...', zh: '处理中...', ko: '처리 중...', vi: 'Đang xử lý...', es: 'Procesando...', fil: 'Pinoproseso...', hi: 'प्रसंस्करण हो रहा है...' }
  };

  const lang = language as 'th' | 'en' | 'jp' | 'id' | 'zh' | 'ko' | 'vi' | 'es' | 'fil' | 'hi';

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(dotTimer);
  }, []);

  const Icon = stageIcons[currentStage];
  const colorClass = stageColors[currentStage];
  const label = stageLabels[currentStage]?.[lang] || stageLabels[currentStage]?.th || stageLabels[currentStage]?.en || 'Processing';

  return (
    <div className="flex justify-start">
      <div className="flex flex-col gap-3 w-full max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sky-600 font-semibold text-xs">
              <img
                src={`${import.meta.env.VITE_BASE_PATH || '/'}/ai-avatar.svg`}
                alt="Maemi-Chan Medical AI"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  const parent = target.parentElement;
                  if (parent) {
                    target.style.display = 'none';
                    parent.textContent = 'AI';
                  }
                }}
              />
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div
              className={cn(
                'rounded-xl px-4 py-3 border-2 backdrop-blur-sm transition-all duration-300',
                colorClass
              )}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentStage === 'complete' ? (
                    <Icon className="h-5 w-5 animate-in zoom-in duration-300" />
                  ) : (
                    <>
                      <Icon className="h-5 w-5 animate-pulse" />
                      <div className="absolute -right-1 -top-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {label}
                    {currentStage !== 'complete' && (
                      <span className="inline-block w-6">{dots}</span>
                    )}
                  </div>
                  {message && (
                    <div className="text-xs opacity-80 mt-1">{message}</div>
                  )}
                </div>
                {currentStage !== 'complete' && (
                  <div className="text-xs font-mono opacity-60">
                    {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            </div>

            {isDeepThink && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-indigo-600 animate-pulse" />
                  <span className="text-xs font-medium text-indigo-700">
                    {thinkingTexts.deepThinkMode?.[lang] || thinkingTexts.deepThinkMode?.th || thinkingTexts.deepThinkMode?.en || 'Deep Think Mode'}
                  </span>
                </div>
              </div>
            )}

            {steps.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    {thinkingTexts.processingSteps?.[lang] || thinkingTexts.processingSteps?.th || thinkingTexts.processingSteps?.en || 'Processing Steps'}
                  </h4>
                </div>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {steps.map((step, index) => {
                    const StepIcon = stageIcons[step.stage];
                    const stepColorClass = stageColors[step.stage];

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          'p-3 transition-all duration-300',
                          step.status === 'active' && 'bg-sky-50',
                          step.status === 'complete' && 'opacity-75'
                        )}>
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2',
                              step.status === 'complete' && 'bg-green-50 text-green-600 border-green-200',
                              step.status === 'active' && stepColorClass,
                              step.status === 'pending' && 'bg-gray-50 text-gray-400 border-gray-200'
                            )}>
                            {step.status === 'complete' ? (
                              <Check className="h-3 w-3" />
                            ) : step.status === 'active' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <StepIcon className="h-3 w-3 flex-shrink-0 opacity-60" />
                              <span className="text-xs font-medium text-gray-700 truncate">
                                {step.message}
                              </span>
                            </div>
                            {step.duration && step.status === 'complete' && (
                              <div className="text-xs text-gray-400 mt-1">
                                {step.duration}ms
                              </div>
                            )}
                          </div>

                          {step.status === 'active' && (
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
                              <div
                                className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"
                                style={{ animationDelay: '0.1s' }}
                              />
                              <div
                                className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"
                                style={{ animationDelay: '0.2s' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {steps.length === 0 && currentStage !== 'complete' && (
              <div className="flex items-center gap-2 px-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {thinkingTexts.processing?.[lang] || thinkingTexts.processing?.th || thinkingTexts.processing?.en || 'Processing...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThinkingProcess;
