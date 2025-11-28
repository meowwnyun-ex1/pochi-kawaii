import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Feedback {
  id: number;
  text: string;
  name: string;
  timestamp: string;
}

interface ApiResponse {
  feedback: Feedback[];
  total: number;
  timestamp: string;
}

interface CarouselTexts {
  feedback_from_users?: Record<string, string>;
  items_count?: Record<string, string>;
  waiting_feedback?: Record<string, string>;
  noFeedback?: Record<string, string>;
  realtime_update?: Record<string, string>;
  updating?: Record<string, string>;
  collapse_button?: Record<string, string>;
  expand_button?: Record<string, string>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getAnimalEmoji = (timestamp: string) => {
  const emojis = [
    '🐶',
    '🐱',
    '🐭',
    '🐹',
    '🐰',
    '🦊',
    '🐻',
    '🐼',
    '🐯',
    '🦁',
    '🐮',
    '🐷',
    '🐸',
    '🐵',
    '🐔',
    '🐧',
    '🐦',
    '🐤',
    '🦆',
    '🦅',
  ];
  const seed = timestamp
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
  return emojis[seed % emojis.length];
};

export default function FeedbackCarousel() {
  const { language, config, t } = useLanguage();
  const [items, setItems] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const safeConfig = config ? config : {};
  const carouselTexts = (safeConfig.carousel_texts ? safeConfig.carousel_texts : {}) as CarouselTexts;

  const loadFeedback = useCallback(
    async (showError = false) => {
      if (loadingRef.current || !mountedRef.current) return;

      const now = Date.now();
      if (now - lastFetchTime < 5000) return;

      loadingRef.current = true;
      setIsLoading(true);
      setLastFetchTime(now);

      try {
        setError(null);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_BASE_URL}/api/feedback`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }

        const data: ApiResponse = await response.json();
        const validFeedback = (data.feedback ? data.feedback : [])
          .filter((item) => item && item.id && item.text && item.timestamp && item.name)
          .filter((item, index, arr) => arr.findIndex((f) => f.id === item.id) === index)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (mountedRef.current) {
          setItems(validFeedback);
          if (!hasInitialized && validFeedback.length > 0) {
            setIsExpanded(true);
            setHasInitialized(true);
          }
        }
      } catch (fetchError) {
        const isAbortError = fetchError instanceof Error && fetchError.name === 'AbortError';
        if (mountedRef.current && showError && !isAbortError) {
          setError('error');
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        loadingRef.current = false;
      }
    },
    [lastFetchTime, hasInitialized]
  );

  useEffect(() => {
    const scheduleNextRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !loadingRef.current) {
          loadFeedback(false);
        }
        scheduleNextRefresh();
      }, 90000);
    };

    loadFeedback(true);
    scheduleNextRefresh();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [loadFeedback]);

  useEffect(() => {
    const handleFeedbackAdded = () => {
      if (!loadingRef.current) {
        setTimeout(() => {
          loadFeedback(false);
        }, 2000);
      }
    };

    window.addEventListener('feedbackAdded', handleFeedbackAdded as EventListener);
    return () => {
      window.removeEventListener('feedbackAdded', handleFeedbackAdded as EventListener);
    };
  }, [loadFeedback]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  const lang = language as 'th' | 'en' | 'jp';
  const safeCarouselTexts = carouselTexts ? carouselTexts : {};
  const collapseButton = safeCarouselTexts.collapse_button ? safeCarouselTexts.collapse_button : {};
  const expandButton = safeCarouselTexts.expand_button ? safeCarouselTexts.expand_button : {};
  const collapseText = collapseButton?.[lang] ? collapseButton[lang] : (collapseButton?.th ? collapseButton.th : t('carousel:collapse'));
  const expandText = expandButton?.[lang] ? expandButton[lang] : (expandButton?.th ? expandButton.th : t('carousel:expand'));
  const timeText = t('carousel:time');

  if (error && items.length === 0) {
    return (
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200 mt-16">
        <div className="px-4 py-2 border-b border-gray-200 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-gray-800">
                {(() => {
                  const textObj = safeCarouselTexts.feedback_from_users;
                  return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('common:feedback_from_users'));
                })()}
              </h3>
              <span className="text-[10px] bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded-full font-medium">
                0{' '}
                {(() => {
                  const textObj = safeCarouselTexts.items_count;
                  return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('carousel:items'));
                })()}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-700"
              aria-label={isExpanded ? collapseText : expandText}>
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>{collapseText}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>{expandText}</span>
                </>
              )}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="py-4 bg-white text-center">
            <p className="text-xs text-gray-500">
              {(() => {
                const textObj = safeCarouselTexts.noFeedback;
                return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('carousel:noFeedback'));
              })()}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200 mt-16">
        <div className="px-4 py-2 border-b border-gray-200 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-gray-800">
                {(() => {
                  const textObj = safeCarouselTexts.feedback_from_users;
                  return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('common:feedback_from_users'));
                })()}
              </h3>
              <span className="text-[10px] bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded-full font-medium">
                0{' '}
                {(() => {
                  const textObj = safeCarouselTexts.items_count;
                  return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('carousel:items'));
                })()}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-700"
              aria-label={isExpanded ? collapseText : expandText}>
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>{collapseText}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>{expandText}</span>
                </>
              )}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="py-4 bg-white text-center">
            <p className="text-xs text-gray-500">
              {(() => {
                const textObj = safeCarouselTexts.noFeedback;
                return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('carousel:noFeedback'));
              })()}
            </p>
          </div>
        )}
      </div>
    );
  }

  const minItemsForSeamless = Math.max(6, Math.min(items.length, 15));
  const repeatedItems = [];

  for (let i = 0; i < minItemsForSeamless * 3; i++) {
    const originalItem = items[i % items.length];
    repeatedItems.push({
      ...originalItem,
      uniqueKey: `${originalItem.id}-${originalItem.timestamp}-${Math.floor(
        i / items.length
      )}-${i}`,
    });
  }

  const animationDuration = Math.max(150, items.length * 20);

  return (
    <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200 mt-16">
      <div className="px-4 py-2 border-b border-gray-200 bg-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-gray-800">
              {(() => {
                const textObj = safeCarouselTexts.feedback_from_users;
                return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('common:feedback_from_users'));
              })()}
            </h3>
            <span className="text-[10px] bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded-full font-medium">
              {items.length}{' '}
              {(() => {
                const textObj = safeCarouselTexts.items_count;
                return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('common:items'));
              })()}
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-700"
            aria-label={isExpanded ? collapseText : expandText}>
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>{collapseText}</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>{expandText}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
        }`}>
        <div className="py-2 bg-white relative">
          <div className="overflow-hidden">
            <div
              className="flex gap-4 animate-scroll-infinite items-center"
              style={{ animationDuration: `${animationDuration}s`, width: 'fit-content' }}>
              {repeatedItems.map((item) => (
                <div
                  key={item.uniqueKey}
                  className="flex-shrink-0 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-300 min-w-[240px] max-w-[300px]"
                  title={`${timeText}: ${new Date(item.timestamp).toLocaleString(language)}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-lg">{getAnimalEmoji(item.timestamp)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString(language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
                <div className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span>
                  {(() => {
                    const textObj = safeCarouselTexts.updating;
                    return textObj?.[language] ? textObj[language] : (textObj?.th ? textObj.th : t('carousel:updating'));
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
