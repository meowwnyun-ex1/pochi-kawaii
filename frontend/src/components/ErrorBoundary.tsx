import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logger from '@/utils/logger';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', 'ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = import.meta.env.VITE_BASE_PATH || '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback 
        error={this.state.error} 
        onReset={this.handleReset}
        onReload={this.handleReload}
        onGoHome={this.handleGoHome}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset, onReload, onGoHome }) => {
  const { t } = useTranslation(['error']);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-background p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2 border-pink-200 bg-white/80 backdrop-blur-sm rounded-3xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-200 rounded-full flex items-center justify-center shadow-lg">
            <AlertTriangle className="h-10 w-10 text-pink-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-pink-700">{t('title', { ns: 'error' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600">{t('description', { ns: 'error' })}</p>

          {error && (
            <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <summary className="cursor-pointer font-semibold text-gray-700 mb-2 hover:text-gray-900">
                {t('details', { ns: 'error' })}
              </summary>
              <div className="mt-2 text-sm text-pink-700 font-mono bg-pink-50 p-3 rounded-lg border border-pink-200 overflow-auto max-h-48">
                <div className="font-bold text-pink-800 mb-2">{error.name}: {error.message}</div>
                {error.stack && (
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onReset}
              variant="default"
              className="bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 hover:from-pink-500 hover:via-rose-500 hover:to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-2xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('reset', { ns: 'error' })}
            </Button>
            <Button
              onClick={onReload}
              variant="outline"
              className="border-2 border-pink-300 text-pink-700 hover:bg-pink-50 hover:border-pink-400 transition-all rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('reload', { ns: 'error' })}
            </Button>
            <Button
              onClick={onGoHome}
              variant="outline"
              className="border-2 border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 transition-all rounded-xl"
            >
              <Home className="h-4 w-4 mr-2" />
              {t('goHome', { ns: 'error' })}
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">{t('report', { ns: 'error' })}</p>
        </CardContent>
      </Card>
    </div>
  );
};

// HOC wrapper for functional components
export const ErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

export default ErrorBoundary;
