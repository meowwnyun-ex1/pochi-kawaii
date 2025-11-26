import { useState } from 'react';
import { Copy, Check, Download, Code as CodeIcon, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

const CodeBlock = ({ code, language = 'text', title }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation(['codeblock']);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast.success(t('codeblock:copySuccess'), { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast.error(t('codeblock:copyError'), { duration: 2000 });
    }
  };

  const handleDownload = () => {
    const extension = getFileExtension(language);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t('codeblock:downloadFilename')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast.success(t('codeblock:downloadSuccess'), { duration: 2000 });
  };

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      go: 'go',
      rust: 'rs',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      sql: 'sql',
      html: 'html',
      css: 'css',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      markdown: 'md',
      bash: 'sh',
      shell: 'sh',
      powershell: 'ps1',
    };
    return extensions[lang.toLowerCase()] || 'txt';
  };

  const getLanguageLabel = (lang: string): string => {
    const labels: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      csharp: 'C#',
      go: 'Go',
      rust: 'Rust',
      php: 'PHP',
      ruby: 'Ruby',
      swift: 'Swift',
      kotlin: 'Kotlin',
      sql: 'SQL',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      markdown: 'Markdown',
      bash: 'Bash',
      shell: 'Shell',
      powershell: 'PowerShell',
    };
    return labels[lang.toLowerCase()] || lang.toUpperCase();
  };

  return (
    <>
      <div className="my-4 border-2 border-indigo-200 rounded-xl overflow-hidden bg-white shadow-lg">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <CodeIcon className="h-5 w-5" />
            <span className="font-semibold text-sm">
              {getLanguageLabel(language)}
            </span>
            {title && <span className="text-xs opacity-80">• {title}</span>}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(true)}
              className="h-7 px-2 text-white hover:bg-white/20"
              title={t('codeblock:copy')}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 px-2 text-white hover:bg-white/20"
              title={t('codeblock:copy')}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="h-7 px-2 text-white hover:bg-white/20"
              title={t('codeblock:download')}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-gray-50">
          <pre className="p-4 overflow-x-auto text-sm bg-gray-900 text-gray-100 max-h-[400px] overflow-y-auto">
            <code className={`language-${language}`}>{code}</code>
          </pre>
        </div>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 text-white">
              <CodeIcon className="h-6 w-6" />
              <div>
                <div className="font-bold text-lg">{getLanguageLabel(language)}</div>
                {title && <div className="text-sm opacity-80">{title}</div>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-9 px-4 text-white hover:bg-white/20"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t('codeblock:copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('codeblock:copy')}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-9 px-4 text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('codeblock:download')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="h-9 px-4 text-white hover:bg-white/20 font-semibold"
              >
                ✕ Close
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <pre className="text-base bg-gray-900 text-gray-100 p-6 rounded-xl">
              <code className={`language-${language}`}>{code}</code>
            </pre>
          </div>
        </div>
      )}
    </>
  );
};

export default CodeBlock;
