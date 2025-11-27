import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Copy, Check, Download, Code as CodeIcon, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
const CodeBlock = ({ code, language = 'text', title }) => {
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useTranslation(['codeblock']);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            showToast.success(t('codeblock:copySuccess'), { duration: 2000 });
            setTimeout(() => setCopied(false), 2000);
        }
        catch (err) {
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
    const getFileExtension = (lang) => {
        const extensions = {
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
    const getLanguageLabel = (lang) => {
        const labels = {
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
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "my-4 border-2 border-indigo-200 rounded-xl overflow-hidden bg-white shadow-lg", children: [_jsxs("div", { className: "bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-white", children: [_jsx(CodeIcon, { className: "h-5 w-5" }), _jsx("span", { className: "font-semibold text-sm", children: getLanguageLabel(language) }), title && _jsxs("span", { className: "text-xs opacity-80", children: ["\u2022 ", title] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => setIsExpanded(true), className: "h-7 px-2 text-white hover:bg-white/20", title: t('codeblock:copy'), children: _jsx(Maximize2, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: handleCopy, className: "h-7 px-2 text-white hover:bg-white/20", title: t('codeblock:copy'), children: copied ? _jsx(Check, { className: "h-4 w-4" }) : _jsx(Copy, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: handleDownload, className: "h-7 px-2 text-white hover:bg-white/20", title: t('codeblock:download'), children: _jsx(Download, { className: "h-4 w-4" }) })] })] }), _jsx("div", { className: "bg-gray-50", children: _jsx("pre", { className: "p-4 overflow-x-auto text-sm bg-gray-900 text-gray-100 max-h-[400px] overflow-y-auto", children: _jsx("code", { className: `language-${language}`, children: code }) }) })] }), isExpanded && (_jsxs("div", { className: "fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200", children: [_jsxs("div", { className: "bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-3 text-white", children: [_jsx(CodeIcon, { className: "h-6 w-6" }), _jsxs("div", { children: [_jsx("div", { className: "font-bold text-lg", children: getLanguageLabel(language) }), title && _jsx("div", { className: "text-sm opacity-80", children: title })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: handleCopy, className: "h-9 px-4 text-white hover:bg-white/20", children: copied ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "h-4 w-4 mr-2" }), t('codeblock:copied')] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { className: "h-4 w-4 mr-2" }), t('codeblock:copy')] })) }), _jsxs(Button, { size: "sm", variant: "ghost", onClick: handleDownload, className: "h-9 px-4 text-white hover:bg-white/20", children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), t('codeblock:download')] }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setIsExpanded(false), className: "h-9 px-4 text-white hover:bg-white/20 font-semibold", children: "\u2715 Close" })] })] }), _jsx("div", { className: "flex-1 overflow-auto p-6", children: _jsx("pre", { className: "text-base bg-gray-900 text-gray-100 p-6 rounded-xl", children: _jsx("code", { className: `language-${language}`, children: code }) }) })] }))] }));
};
export default CodeBlock;
