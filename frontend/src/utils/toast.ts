import { toast } from 'sonner';

const TOAST_THEME = {
  success: {
    background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
    color: '#065F46',
    border: '#10B981',
    shadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
  },
  error: {
    background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
    color: '#991B1B',
    border: '#EF4444',
    shadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
  },
  info: {
    background: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)',
    color: '#9F1239',
    border: '#EC4899',
    shadow: '0 4px 12px rgba(236, 72, 153, 0.2)',
  },
  warning: {
    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    color: '#92400E',
    border: '#F59E0B',
    shadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
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
        border: `2px solid ${TOAST_THEME.success.border}`,
        fontWeight: '600',
        boxShadow: TOAST_THEME.success.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace ? options.whiteSpace : 'normal',
      },
      description: options?.description,
      icon: options?.icon ? options.icon : '✅',
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 4000,
      style: {
        background: TOAST_THEME.error.background,
        color: TOAST_THEME.error.color,
        border: `2px solid ${TOAST_THEME.error.border}`,
        fontWeight: '600',
        boxShadow: TOAST_THEME.error.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace ? options.whiteSpace : 'normal',
      },
      description: options?.description,
      icon: options?.icon ? options.icon : '❌',
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.info(message, {
      duration: options?.duration || 3000,
      style: {
        background: TOAST_THEME.info.background,
        color: TOAST_THEME.info.color,
        border: `2px solid ${TOAST_THEME.info.border}`,
        fontWeight: '600',
        boxShadow: TOAST_THEME.info.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace ? options.whiteSpace : 'normal',
      },
      description: options?.description,
      icon: options?.icon ? options.icon : 'ℹ️',
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      duration: options?.duration || 3000,
      style: {
        background: TOAST_THEME.warning.background,
        color: TOAST_THEME.warning.color,
        border: `2px solid ${TOAST_THEME.warning.border}`,
        fontWeight: '600',
        boxShadow: TOAST_THEME.warning.shadow,
        fontSize: '16px',
        whiteSpace: options?.whiteSpace ? options.whiteSpace : 'normal',
      },
      description: options?.description,
      icon: options?.icon ? options.icon : '⚠️',
    });
  },
};

