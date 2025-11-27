import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/toast';
const ImageUpload = ({ onImageSelect, selectedImage, onClear, disabled = false, onPreviewUrlChange }) => {
    const { t } = useTranslation(['image']);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const previewUrlRef = useRef(null);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validateFile = (file) => {
        // Check if file type starts with 'image/'
        if (!file.type.startsWith('image/')) {
            showToast.error(t('image:error.invalid_format') || 'กรุณาแนบเฉพาะไฟล์ภาพเท่านั้น');
            return false;
        }
        // Check if file type is in accepted formats
        if (!ACCEPTED_FORMATS.includes(file.type.toLowerCase())) {
            showToast.error(t('image:error.invalid_format') || 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            showToast.error('ไฟล์ใหญ่เกินไป (สูงสุด 10MB)');
            return false;
        }
        return true;
    };
    const handleFile = useCallback((file) => {
        if (!validateFile(file))
            return;
        // Cleanup previous preview URL
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }
        // Create preview using object URL for better memory management
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        previewUrlRef.current = objectUrl;
        if (onPreviewUrlChange) {
            onPreviewUrlChange(objectUrl);
        }
        onImageSelect(file);
    }, [onImageSelect, onPreviewUrlChange, t]);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled)
            return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, [disabled, handleFile]);
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragging(true);
        }
    }, [disabled]);
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);
    const handleClick = () => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    };
    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };
    const handleClear = () => {
        // Cleanup preview URL
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewUrl(null);
        if (onPreviewUrlChange) {
            onPreviewUrlChange(null);
        }
        onClear();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);
    return (_jsxs("div", { className: "w-full", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "image/jpeg,image/jpg,image/png,image/webp", onChange: handleFileChange, className: "hidden", disabled: disabled, capture: "environment" }), !selectedImage ? (_jsx("div", { onClick: handleClick, onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave, className: `
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${isDragging
                    ? 'border-pink-500 bg-pink-50 scale-105'
                    : 'border-pink-300 bg-gradient-to-br from-pink-50/50 to-white hover:border-pink-400 hover:bg-pink-50/70'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `, children: _jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsx("div", { className: `
              w-20 h-20 rounded-full flex items-center justify-center
              bg-gradient-to-br from-pink-100 to-rose-100
              ${!disabled && 'group-hover:scale-110'}
              transition-transform duration-300
            `, children: _jsx(Upload, { className: "w-10 h-10 text-pink-500" }) }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-lg font-semibold text-pink-700", children: "Drop Image Here" }), _jsx("p", { className: "text-sm text-pink-500", children: "- or -" }), _jsx("p", { className: "text-sm font-medium text-pink-600", children: "Click to Upload" })] })] }) })) : (_jsxs("div", { className: "relative group", children: [_jsxs("div", { className: "relative rounded-2xl overflow-hidden border-4 border-pink-200 shadow-xl", children: [previewUrl && (_jsx("img", { src: previewUrl, alt: "Preview", className: "w-full h-auto max-h-96 object-contain bg-white" })), !disabled && (_jsx("button", { onClick: handleClear, className: "absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10", "aria-label": "Clear image", children: _jsx(X, { className: "w-5 h-5" }) }))] }), _jsxs("div", { className: "mt-4 flex items-center gap-3 text-sm text-pink-600 bg-pink-50 px-4 py-3 rounded-xl", children: [_jsx(ImageIcon, { className: "w-5 h-5" }), _jsx("span", { className: "font-medium truncate", children: selectedImage.name }), _jsxs("span", { className: "text-pink-400", children: ["(", (selectedImage.size / 1024 / 1024).toFixed(2), " MB)"] })] })] }))] }));
};
export default ImageUpload;
