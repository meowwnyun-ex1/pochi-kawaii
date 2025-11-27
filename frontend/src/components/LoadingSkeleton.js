import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export const LoadingSkeleton = ({ className, variant = 'rect', width, height, }) => {
    const baseClasses = 'animate-pulse bg-gray-200 rounded';
    const variantClasses = {
        text: 'h-4',
        circle: 'rounded-full',
        rect: 'rounded-lg',
    };
    const style = {};
    if (width)
        style.width = typeof width === 'number' ? `${width}px` : width;
    if (height)
        style.height = typeof height === 'number' ? `${height}px` : height;
    return (_jsx("div", { className: cn(baseClasses, variantClasses[variant], className), style: style, "aria-label": "Loading...", role: "status" }));
};
export const MessageSkeleton = ({ isUser = false }) => {
    return (_jsxs("div", { className: cn('flex gap-3 sm:gap-4 mb-4 sm:mb-6', isUser ? 'justify-end' : 'justify-start'), children: [!isUser && (_jsx("div", { className: "flex-shrink-0", children: _jsx(LoadingSkeleton, { variant: "circle", width: 40, height: 40 }) })), _jsxs("div", { className: cn('max-w-[85%] sm:max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start'), children: [_jsxs("div", { className: "rounded-2xl px-4 py-3", children: [_jsx(LoadingSkeleton, { width: "200px", height: "20px", className: "mb-2" }), _jsx(LoadingSkeleton, { width: "150px", height: "20px" })] }), _jsx(LoadingSkeleton, { width: "60px", height: "14px" })] }), isUser && (_jsx("div", { className: "flex-shrink-0", children: _jsx(LoadingSkeleton, { variant: "circle", width: 40, height: 40 }) }))] }));
};
export default LoadingSkeleton;
