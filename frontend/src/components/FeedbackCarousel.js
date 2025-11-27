import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const getAnimalEmoji = (timestamp) => {
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
    const { language, config } = useLanguage();
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const refreshTimeoutRef = useRef();
    const loadingRef = useRef(false);
    const mountedRef = useRef(true);
    const safeConfig = config || {};
    const carouselTexts = (safeConfig.carousel_texts || {});
    const loadFeedback = useCallback(async (showError = false) => {
        if (loadingRef.current || !mountedRef.current)
            return;
        const now = Date.now();
        if (now - lastFetchTime < 5000)
            return;
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
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
            }
            const data = await response.json();
            const validFeedback = (data.feedback || [])
                .filter((item) => item && item.id && item.text && item.timestamp && item.name)
                .filter((item, index, arr) => arr.findIndex((f) => f.id === item.id) === index)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (mountedRef.current) {
                setItems(validFeedback);
            }
        }
        catch (fetchError) {
            const isAbortError = fetchError instanceof Error && fetchError.name === 'AbortError';
            if (mountedRef.current && showError && !isAbortError) {
                setError('error');
            }
        }
        finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
            loadingRef.current = false;
        }
    }, [lastFetchTime]);
    useEffect(() => {
        const scheduleNextRefresh = () => {
            if (refreshTimeoutRef.current)
                clearTimeout(refreshTimeoutRef.current);
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
            if (refreshTimeoutRef.current)
                clearTimeout(refreshTimeoutRef.current);
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
        window.addEventListener('feedbackAdded', handleFeedbackAdded);
        return () => {
            window.removeEventListener('feedbackAdded', handleFeedbackAdded);
        };
    }, [loadFeedback]);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (refreshTimeoutRef.current)
                clearTimeout(refreshTimeoutRef.current);
        };
    }, []);
    if (error && items.length === 0)
        return null;
    if (!items || items.length === 0) {
        return null;
    }
    const minItemsForSeamless = Math.max(6, Math.min(items.length, 15));
    const repeatedItems = [];
    for (let i = 0; i < minItemsForSeamless * 3; i++) {
        const originalItem = items[i % items.length];
        repeatedItems.push({
            ...originalItem,
            uniqueKey: `${originalItem.id}-${originalItem.timestamp}-${Math.floor(i / items.length)}-${i}`,
        });
    }
    const animationDuration = Math.max(150, items.length * 20);
    const lang = language;
    const safeCarouselTexts = carouselTexts || {};
    const collapseButton = safeCarouselTexts.collapse_button || {};
    const expandButton = safeCarouselTexts.expand_button || {};
    const collapseText = (collapseButton && (collapseButton[lang] || collapseButton.th)) || 'ซ่อน';
    const expandText = (expandButton && (expandButton[lang] || expandButton.th)) || 'แสดง';
    const timeText = { th: 'เวลา', en: 'Time', jp: '時間' }[lang] || 'เวลา';
    return (_jsxs("div", { className: "bg-gradient-to-r from-sky-50 to-purple-50 border-b border-gray-200 mt-16", children: [_jsx("div", { className: "px-4 py-2 border-b border-gray-200 bg-white/50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h3", { className: "text-xs font-semibold text-gray-800", children: (() => {
                                        const textObj = safeCarouselTexts.feedback_from_users;
                                        return (textObj && (textObj[language] || textObj.th)) || 'Feedback';
                                    })() }), _jsxs("span", { className: "text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded-full font-medium", children: [items.length, ' ', (() => {
                                            const textObj = safeCarouselTexts.items_count;
                                            return (textObj && (textObj[language] || textObj.th)) || 'items';
                                        })()] })] }), _jsx("button", { onClick: () => setIsExpanded(!isExpanded), className: "flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-700", "aria-label": isExpanded ? collapseText : expandText, children: isExpanded ? (_jsxs(_Fragment, { children: [_jsx(ChevronDown, { className: "h-4 w-4" }), _jsx("span", { children: collapseText })] })) : (_jsxs(_Fragment, { children: [_jsx(ChevronUp, { className: "h-4 w-4" }), _jsx("span", { children: expandText })] })) })] }) }), _jsx("div", { className: `overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`, children: _jsxs("div", { className: "py-2 bg-white relative", children: [_jsx("div", { className: "overflow-hidden", children: _jsx("div", { className: "flex gap-4 animate-scroll-infinite items-center", style: { animationDuration: `${animationDuration}s`, width: 'fit-content' }, children: repeatedItems.map((item) => (_jsx("div", { className: "flex-shrink-0 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-300 min-w-[240px] max-w-[300px]", title: `${timeText}: ${new Date(item.timestamp).toLocaleString(language)}`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-shrink-0 text-lg", children: getAnimalEmoji(item.timestamp) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-xs font-semibold text-gray-700 truncate", children: item.name }), _jsx("span", { className: "text-[10px] text-gray-400 font-mono flex-shrink-0", children: new Date(item.timestamp).toLocaleTimeString(language, {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                }) })] }), _jsx("p", { className: "text-xs text-gray-600 line-clamp-2", children: item.text })] })] }) }, item.uniqueKey))) }) }), isLoading && (_jsx("div", { className: "absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center", children: _jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-600 bg-white/90 px-3 py-1.5 rounded-full shadow-sm", children: [_jsx("div", { className: "w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: (() => {
                                            const textObj = safeCarouselTexts.updating;
                                            return (textObj && (textObj[language] || textObj.th)) || 'Updating...';
                                        })() })] }) }))] }) })] }));
}
