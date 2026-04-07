'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: '200px' }}>
          <AlertTriangle size={32} style={{ color: 'var(--danger)', marginBottom: '12px' }} />
          <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="btn btn-secondary"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
