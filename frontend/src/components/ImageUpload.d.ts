interface ImageUploadProps {
    onImageSelect: (file: File) => void;
    selectedImage: File | null;
    onClear: () => void;
    disabled?: boolean;
    onPreviewUrlChange?: (url: string | null) => void;
}
declare const ImageUpload: ({ onImageSelect, selectedImage, onClear, disabled, onPreviewUrlChange }: ImageUploadProps) => any;
export default ImageUpload;
