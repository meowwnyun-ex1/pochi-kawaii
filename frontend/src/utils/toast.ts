import { toast } from 'sonner';

const TOAST_THEME = {
  success: {
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#FFFFFF',
    border: '#047857',
    shadow: '0 10px 25px rgba(16, 185, 129, 0.5)',
  },
  error: {
    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    color: '#FFFFFF',
    border: '#991B1B',
    shadow: '0 10px 25px rgba(220, 38, 38, 0.5)',
  },
  info: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: '#FFFFFF',
    border: '#1D4ED8',
    shadow: '0 10px 25px rgba(59, 130, 246, 0.5)',
  },
  warning: {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#FFFFFF',
    border: '#B45309',
    shadow: '0 10px 25px rgba(245, 158, 11, 0.5)',
  },
} as const;

interface ToastOptions {
  description?: string;
  duration?: number;
  whiteSpace?: 'pre-line' | 'normal';
  icon?: string;
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration || 3000,
      style: {
        background: TOAST_THEME.success.background,
        color: TOAST_THEME.success.color,
        border: `3px solid ${TOAST_THEME.success.border}`,
        fontWeight: '700',
        boxShadow: TOAST_THEME.success.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace || 'normal',
      },
      description: options?.description,
      icon: options?.icon || '✅',
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 4000,
      style: {
        background: TOAST_THEME.error.background,
        color: TOAST_THEME.error.color,
        border: `3px solid ${TOAST_THEME.error.border}`,
        fontWeight: '700',
        boxShadow: TOAST_THEME.error.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace || 'normal',
      },
      description: options?.description,
      icon: options?.icon || '❌',
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.info(message, {
      duration: options?.duration || 3000,
      style: {
        background: TOAST_THEME.info.background,
        color: TOAST_THEME.info.color,
        border: `3px solid ${TOAST_THEME.info.border}`,
        fontWeight: '700',
        boxShadow: TOAST_THEME.info.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace || 'normal',
      },
      description: options?.description,
      icon: options?.icon || 'ℹ️',
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      duration: options?.duration || 3000,
      style: {
        background: TOAST_THEME.warning.background,
        color: TOAST_THEME.warning.color,
        border: `3px solid ${TOAST_THEME.warning.border}`,
        fontWeight: '700',
        boxShadow: TOAST_THEME.warning.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace || 'normal',
      },
      description: options?.description,
      icon: options?.icon || '⚠️',
    });
  },
};

