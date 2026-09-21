import React, { Component, ErrorInfo, ReactNode } from 'react';
import { clearAllData } from '../lib/storage';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      clearAllData();
      localStorage.clear();
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans text-stone-800">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-8 max-w-lg w-full text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl font-bold">
              🍱
            </div>
            <h1 className="text-xl font-extrabold text-stone-900 mb-2">
              Study Fuel Tiffin Manager
            </h1>
            <p className="text-sm text-stone-600 mb-4">
              Something went wrong loading the view. You can reload or reset stored data to recover immediately.
            </p>
            {this.state.error && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-6 text-left text-xs font-mono text-stone-600 overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown error occurred'}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
