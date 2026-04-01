import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirestoreError = false;
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            const isPermissionDenied = parsed.error.toLowerCase().includes('permission') || 
                                     parsed.error.toLowerCase().includes('insufficient');
            
            if (isPermissionDenied) {
              errorMessage = `Permission Denied: You don't have permission to ${parsed.operationType} at ${parsed.path || 'this path'}.`;
              isFirestoreError = true;
            } else {
              errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} at ${parsed.path || 'this path'}.`;
              isFirestoreError = false; // Treat as general error but with better message
            }
          }
        }
      } catch (e) {
        // Not a JSON error message, use default or the error message itself
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isFirestoreError ? 'Access Denied' : 'Something went wrong'}
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-indigo-100"
            >
              <RefreshCcw className="w-5 h-5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
