import React, { ReactNode } from 'react';
interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}
export declare const ErrorBoundary: React.FC<Props>;
export default ErrorBoundary;
