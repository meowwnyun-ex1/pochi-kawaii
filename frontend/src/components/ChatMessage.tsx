import { User, Clock, Copy, Check, Code, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect, memo } from 'react';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import HtmlRenderer from '@/components/HtmlRenderer';
import CodeBlock from '@/components/CodeBlock';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  onOpenArtifact?: (content: React.ReactNode) => void;
}

const ChatMessage = ({ message, isUser, timestamp, onOpenArtifact }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation(['message', 'common']);

  const { textContent, htmlContent, codeBlocks } = useMemo(() => {
    let processedMessage = message;

    const htmlChartRegex = /```html\s*([\s\S]*?)```/g;
    const htmlMatches = message.match(htmlChartRegex);
    const htmlParts: string[] = [];

    if (htmlMatches && htmlMatches.length > 0) {
      htmlMatches.forEach((match) => {
        const htmlCode = match
          .replace(/```html\s*/g, '')
          .replace(/```/g, '')
          .trim();
        htmlParts.push(htmlCode);
      });
      processedMessage = processedMessage.replace(htmlChartRegex, `\n[📊 ${t('message:chart')}]\n`);
    }

    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const codeMatches = Array.from(processedMessage.matchAll(codeBlockRegex));
    const blocks: Array<{ language: string; code: string }> = [];

    if (codeMatches.length > 0) {
      codeMatches.forEach((match) => {
        const language = match[1] || 'text';
        const code = match[2].trim();
        if (language !== 'html') {
          blocks.push({ language, code });
        }
      });
      processedMessage = processedMessage.replace(codeBlockRegex, `\n[💻 ${t('message:code')}]\n`);
    }

    return {
      textContent: processedMessage.trim(),
      htmlContent: htmlParts.length > 0 ? htmlParts : null,
      codeBlocks: blocks.length > 0 ? blocks : null,
    };
  }, [message, t]);

  // Auto-open artifact when content is available
  useEffect(() => {
    if (!isUser && (htmlContent || codeBlocks) && onOpenArtifact) {
      const artifactContent = (
        <div className="space-y-4">
          {htmlContent?.map((html, index) => (
            <HtmlRenderer
              key={`html-${index}`}
              htmlContent={html}
              title={`${t('message:chart')} ${htmlContent.length > 1 ? index + 1 : ''}`}
            />
          ))}
          {codeBlocks?.map((block, index) => (
            <CodeBlock
              key={`code-${index}`}
              code={block.code}
              language={block.language}
              title={`${t('message:code')} - ${block.language.toUpperCase()}`}
            />
          ))}
        </div>
      );
      onOpenArtifact(artifactContent);
    }
  }, [isUser, htmlContent, codeBlocks, onOpenArtifact, t]);

  const formatTime = (date: Date) => {
    try {
      return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  const handleCopy = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      showToast.success(t('common:success'), { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Copy failed:', err);
      }
      showToast.error(t('common:error'));
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 sm:gap-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
            <img
              src={`${import.meta.env.VITE_BASE_PATH || '/'}/ai-avatar.svg`}
              alt="Maemi-Chan Medical AI"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
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
      )}

      <div
        className={cn(
          'max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%] space-y-2',
          isUser ? 'items-end' : 'items-start'
        )}>
        <div className="relative group space-y-2">
          <div
            className={cn(
              'rounded-2xl px-5 py-4 text-sm sm:text-base leading-relaxed shadow-lg',
              isUser
                ? 'bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 text-white shadow-sky-500/30'
                : 'bg-white text-gray-900 border-2 border-gray-200/50 shadow-gray-200/50'
            )}>
            <div className="whitespace-pre-wrap break-words">{textContent}</div>
          </div>

          {!isUser && (htmlContent || codeBlocks) && (
            <div className="flex flex-wrap gap-2">
              {htmlContent && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl shadow-sm">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{t('message:chart')}</span>
                  {htmlContent.length > 1 && (
                    <span className="ml-1 px-2 py-0.5 bg-purple-200 rounded-lg text-[10px] font-bold">
                      {htmlContent.length}
                    </span>
                  )}
                </div>
              )}
              {codeBlocks && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-gradient-to-r from-sky-50 to-sky-100 border-2 border-sky-200 rounded-xl shadow-sm">
                  <Code className="h-3.5 w-3.5" />
                  <span>{t('message:code')}</span>
                  {codeBlocks.length > 1 && (
                    <span className="ml-1 px-2 py-0.5 bg-sky-200 rounded-lg text-[10px] font-bold">
                      {codeBlocks.length}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 text-xs sm:text-sm text-gray-500 px-2',
            isUser ? 'justify-end' : 'justify-start'
          )}>
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium">{formatTime(timestamp)}</span>

          {/* Copy Button */}
          {!isUser && (
            <>
              <span className="text-gray-300">•</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-gray-500 hover:text-sky-600 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded-lg px-2 py-1 hover:bg-sky-50"
                title={t('message:copyMessage')}
                aria-label={t('message:copyMessage') || 'Copy message'}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-600 font-medium">{t('common:success')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="font-medium">{t('message:copyMessage')}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 flex items-center justify-center shadow-lg border-2 border-white">
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ChatMessage);
