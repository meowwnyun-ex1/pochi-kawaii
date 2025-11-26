import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ArtifactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ArtifactPanel = ({ isOpen, onClose, children }: ArtifactPanelProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useTranslation(['artifact']);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-0 top-0 h-full bg-gradient-to-br from-slate-50 to-gray-50 border-l border-gray-200 shadow-2xl z-40 transition-all duration-300 ease-in-out ${
        isMaximized ? 'w-[80%]' : 'w-[45%]'
      }`}>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">{t('artifact:title')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title={isMaximized ? t('artifact:restore') : t('artifact:maximize')}>
              {isMaximized ? (
                <Minimize2 className="h-4 w-4 text-gray-600" />
              ) : (
                <Maximize2 className="h-4 w-4 text-gray-600" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('artifact:close')}>
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>

      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-400 transition-colors group"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startWidth = e.currentTarget.parentElement!.offsetWidth;

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const diff = startX - moveEvent.clientX;
            const newWidth = Math.max(400, Math.min(window.innerWidth * 0.9, startWidth + diff));
            e.currentTarget.parentElement!.style.width = `${newWidth}px`;
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 rounded-full group-hover:bg-blue-400 transition-colors" />
      </div>
    </div>
  );
};

export default ArtifactPanel;
