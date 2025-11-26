import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/toast';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
  disabled?: boolean;
}

const ImageUpload = ({ onImageSelect, selectedImage, onClear, disabled = false }: ImageUploadProps) => {
  const { t } = useTranslation(['chat']);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      showToast.error(t('chat:error.invalid_format'));
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast.error('ไฟล์ใหญ่เกินไป (สูงสุด 10MB)');
      return false;
    }

    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelect(file);
  }, [onImageSelect]);

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
    setPreviewUrl(null);
    onClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {!selectedImage ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${isDragging
              ? 'border-pink-500 bg-pink-50 scale-105'
              : 'border-pink-300 bg-gradient-to-br from-pink-50/50 to-white hover:border-pink-400 hover:bg-pink-50/70'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center
              bg-gradient-to-br from-pink-100 to-rose-100
              ${!disabled && 'group-hover:scale-110'}
              transition-transform duration-300
            `}>
              <Upload className="w-10 h-10 text-pink-500" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold text-pink-700">
                {t('chat:upload_prompt')}
              </p>
              <p className="text-sm text-pink-500">
                {t('chat:supported_formats')}
              </p>
            </div>

            <div className="mt-4 px-6 py-2 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
              {t('chat:upload_image')}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="relative rounded-2xl overflow-hidden border-4 border-pink-200 shadow-xl">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain bg-white"
              />
            )}

            {!disabled && (
              <button
                onClick={handleClear}
                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
                aria-label="Clear image"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 text-sm text-pink-600 bg-pink-50 px-4 py-3 rounded-xl">
            <ImageIcon className="w-5 h-5" />
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
