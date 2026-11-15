import React from 'react';
import { ErrorState } from '../design/components/ErrorState';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  retryLabel?: string;
  secondaryLabel?: string;
  onRetry?: () => void;
  onSecondary?: () => void;
  resetKey?: string | number | null;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error || 'Unexpected error');
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[SPEX ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: null });
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: null });
    this.props.onRetry?.();
  };

  private handleSecondary = (): void => {
    this.setState({ hasError: false, errorMessage: null });
    this.props.onSecondary?.();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const detail = this.props.description || this.state.errorMessage || undefined;

    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10">
        <ErrorState
          title={this.props.title || 'Something went wrong loading this view'}
          error={detail}
          canRetry
          onRetry={this.handleRetry}
          retryLabel={this.props.retryLabel || 'Retry'}
          hasSavedCopy={Boolean(this.props.onSecondary)}
          onUseSavedCopy={this.props.onSecondary ? this.handleSecondary : undefined}
          savedCopyLabel={this.props.secondaryLabel || 'Use offline demo data'}
        />
      </div>
    );
  }
}
