import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2 border-red-200/50 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-lg">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">{t('title', { ns: 'error' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600">{t('description', { ns: 'error' })}</p>

          {error && (
            <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <summary className="cursor-pointer font-semibold text-gray-700 mb-2 hover:text-gray-900">
                {t('details', { ns: 'error' })}
              </summary>
              <div className="mt-2 text-sm text-gray-600 font-mono bg-white p-3 rounded border overflow-auto max-h-48">
                <div className="font-bold text-red-600 mb-2">{error.name}: {error.message}</div>
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
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('reset', { ns: 'error' })}
            </Button>
            <Button
              onClick={onReload}
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:border-blue-700 transition-all"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('reload', { ns: 'error' })}
            </Button>
            <Button
              onClick={onGoHome}
              variant="outline"
              className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
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
