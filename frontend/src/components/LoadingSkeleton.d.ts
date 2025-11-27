interface LoadingSkeletonProps {
    className?: string;
    variant?: 'text' | 'circle' | 'rect';
    width?: string | number;
    height?: string | number;
}
export declare const LoadingSkeleton: React.FC<LoadingSkeletonProps>;
interface MessageSkeletonProps {
    isUser?: boolean;
}
export declare const MessageSkeleton: React.FC<MessageSkeletonProps>;
export default LoadingSkeleton;
