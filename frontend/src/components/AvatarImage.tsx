import { useLanguage } from '@/contexts/LanguageContext';

const getAvatarSrc = () => {
  const basePath = import.meta.env.VITE_BASE_PATH;
  return `${basePath}/logo.svg`;
};

const AvatarImage = ({
  className,
  size = 'default',
}: {
  className?: string;
  size?: 'small' | 'default' | 'medium' | 'large';
}) => {
  const { t } = useLanguage();
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    medium: 'w-14 h-14',
    large: 'w-24 h-24',
  };

  return (
    <div
      className={`${className ? className : ''} ${
        sizeClasses[size]
      } bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-semibold text-sm`}>
      <img
        src={getAvatarSrc()}
        alt={t('common:appName')}
        className={`${sizeClasses[size]} rounded-full`}
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          const parent = target.parentElement;
          if (parent) {
            target.style.display = 'none';
            parent.textContent = t('common:ai_fallback');
          }
        }}
      />
    </div>
  );
};

export default AvatarImage;
