import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'rect',
  width,
  height,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    text: 'h-4',
    circle: 'rounded-full',
    rect: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      aria-label="Loading..."
      role="status"
    />
  );
};

interface MessageSkeletonProps {
  isUser?: boolean;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ isUser = false }) => {
  return (
    <div className={cn('flex gap-3 sm:gap-4 mb-4 sm:mb-6', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0">
          <LoadingSkeleton variant="circle" width={40} height={40} />
        </div>
      )}
      
      <div className={cn('max-w-[85%] sm:max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div className="rounded-2xl px-4 py-3">
          <LoadingSkeleton width="200px" height="20px" className="mb-2" />
          <LoadingSkeleton width="150px" height="20px" />
        </div>
        <LoadingSkeleton width="60px" height="14px" />
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <LoadingSkeleton variant="circle" width={40} height={40} />
        </div>
      )}
    </div>
  );
};

export default LoadingSkeleton;
