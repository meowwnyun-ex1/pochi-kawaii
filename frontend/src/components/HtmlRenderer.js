import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Code, Eye, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/utils/toast';
const HtmlRenderer = ({ htmlContent, title }) => {
    const [view, setView] = useState('preview');
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(htmlContent);
            setCopied(true);
            showToast.success('Copied to clipboard!', { duration: 2000 });
            setTimeout(() => setCopied(false), 2000);
        }
        catch (err) {
            showToast.error('Failed to copy', { duration: 2000 });
        }
    };
    const handleDownload = () => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'chart'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast.success('Downloaded successfully!', { duration: 2000 });
    };
    // Create a complete HTML document for iframe
    const fullHtml = htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')
        ? htmlContent
        : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    return (_jsxs("div", { className: "my-4 border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-lg", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-white", children: [view === 'preview' ? (_jsx(Eye, { className: "h-5 w-5" })) : (_jsx(Code, { className: "h-5 w-5" })), _jsx("span", { className: "font-semibold text-sm", children: title || (view === 'preview' ? 'Interactive Chart' : 'HTML Source Code') })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex bg-white/20 rounded-lg p-1", children: [_jsxs(Button, { size: "sm", variant: view === 'preview' ? 'default' : 'ghost', onClick: () => setView('preview'), className: `h-7 px-3 text-xs ${view === 'preview'
                                            ? 'bg-white text-blue-600 hover:bg-white'
                                            : 'text-white hover:bg-white/20 hover:text-white'}`, children: [_jsx(Eye, { className: "h-3.5 w-3.5 mr-1" }), "Preview"] }), _jsxs(Button, { size: "sm", variant: view === 'code' ? 'default' : 'ghost', onClick: () => setView('code'), className: `h-7 px-3 text-xs ${view === 'code'
                                            ? 'bg-white text-blue-600 hover:bg-white'
                                            : 'text-white hover:bg-white/20 hover:text-white'}`, children: [_jsx(Code, { className: "h-3.5 w-3.5 mr-1" }), "Code"] })] }), _jsx(Button, { size: "sm", variant: "ghost", onClick: handleCopy, className: "h-7 px-2 text-white hover:bg-white/20", title: "Copy code", children: copied ? (_jsx(Check, { className: "h-4 w-4" })) : (_jsx(Copy, { className: "h-4 w-4" })) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: handleDownload, className: "h-7 px-2 text-white hover:bg-white/20", title: "Download HTML", children: _jsx(Download, { className: "h-4 w-4" }) })] })] }), _jsx("div", { className: "bg-gray-50", children: view === 'preview' ? (_jsx("div", { className: "relative bg-white", children: _jsx("iframe", { srcDoc: fullHtml, className: "w-full border-0", style: {
                            minHeight: '400px',
                            height: 'auto',
                        }, sandbox: "allow-scripts allow-same-origin", title: title || 'Chart Preview', onLoad: (e) => {
                            const iframe = e.currentTarget;
                            const body = iframe.contentDocument?.body;
                            if (body) {
                                // Auto-resize iframe to content
                                const height = body.scrollHeight + 40;
                                iframe.style.height = `${Math.max(height, 400)}px`;
                            }
                        } }) })) : (_jsx("div", { className: "relative", children: _jsx("pre", { className: "p-4 overflow-x-auto text-sm bg-gray-900 text-gray-100 max-h-[600px] overflow-y-auto", children: _jsx("code", { className: "language-html", children: htmlContent }) }) })) })] }));
};
export default HtmlRenderer;
