import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from '@/utils/toast';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
  disabled?: boolean;
  onPreviewUrlChange?: (url: string | null) => void;
}

const ImageUpload = ({ onImageSelect, selectedImage, onClear, disabled = false, onPreviewUrlChange }: ImageUploadProps) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      showToast.error(t('image:error.invalid_format'));
      return false;
    }

    if (!ACCEPTED_FORMATS.includes(file.type.toLowerCase())) {
      showToast.error(t('image:error.invalid_format'));
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast.error(t('image:error.file_too_large'));
      return false;
    }

    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    previewUrlRef.current = objectUrl;
    
    if (onPreviewUrlChange) {
      onPreviewUrlChange(objectUrl);
    }

    onImageSelect(file);
  }, [onImageSelect, onPreviewUrlChange, t]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClear = () => {
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

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        capture="environment"
      />

      {!selectedImage ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
            transition-all duration-300 ease-in-out min-h-[200px] max-h-[250px] flex items-center justify-center
            ${isDragging
              ? 'border-pink-500 bg-pink-50 scale-105'
              : 'border-pink-300 bg-gradient-to-br from-pink-50/50 to-white hover:border-pink-400 hover:bg-pink-50/70'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              bg-gradient-to-br from-pink-100 to-rose-100
              ${!disabled && 'group-hover:scale-110'}
              transition-transform duration-300
            `}>
              <Upload className="w-6 h-6 text-pink-500" />
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-pink-700">
                {t('image:upload_prompt')}
              </p>
              <p className="text-xs text-pink-500">
                {t('image:upload_or')}
              </p>
              <p className="text-xs font-medium text-pink-600">
                {t('image:upload_click')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group w-full">
          <div className="relative rounded-xl overflow-hidden border-2 border-pink-200 shadow-lg bg-white min-h-[200px] max-h-[250px] flex items-center justify-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={t('image:preview')}
                className="w-full h-full max-h-[250px] object-contain"
              />
            )}

            {!disabled && (
              <button
                onClick={handleClear}
                className="absolute top-4 right-4 p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors shadow-lg z-10"
                aria-label={t('image:clear_image')}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-pink-600 bg-pink-50 px-3 py-2 rounded-lg">
            <ImageIcon className="w-4 h-4" />
            <span className="font-medium truncate">{selectedImage.name}</span>
            <span className="text-pink-400">
              ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
