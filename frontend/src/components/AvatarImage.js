import { jsx as _jsx } from "react/jsx-runtime";
const getAvatarSrc = () => {
    const basePath = import.meta.env.VITE_BASE_PATH;
    return `${basePath}/ai-avatar.svg`;
};
const getAvatarAlt = () => {
    return 'Pochi! Kawaii ne~';
};
const AvatarImage = ({ className, size = 'default', }) => {
    const sizeClasses = {
        small: 'w-8 h-8',
        default: 'w-10 h-10',
        medium: 'w-14 h-14',
        large: 'w-24 h-24',
    };
    return (_jsx("div", { className: `${className || ''} ${sizeClasses[size]} bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm`, children: _jsx("img", { src: getAvatarSrc(), alt: getAvatarAlt(), className: `${sizeClasses[size]} rounded-full`, onError: (e) => {
                const target = e.currentTarget;
                const parent = target.parentElement;
                if (parent) {
                    target.style.display = 'none';
                    parent.textContent = 'AI';
                }
            } }) }));
};
export default AvatarImage;
