interface ToastOptions {
    description?: string;
    duration?: number;
    whiteSpace?: 'pre-line' | 'normal';
    icon?: string;
}
export declare const showToast: {
    success: (message: string, options?: ToastOptions) => any;
    error: (message: string, options?: ToastOptions) => any;
    info: (message: string, options?: ToastOptions) => any;
    warning: (message: string, options?: ToastOptions) => any;
};
export {};
