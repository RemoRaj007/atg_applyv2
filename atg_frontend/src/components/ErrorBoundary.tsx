import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, a single render-time throw anywhere in the tree unmounts the
// whole app and leaves a blank white page — no message, no way back, and
// nothing in any log the team can see.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The console is the only sink today. When error tracking is wired up this
    // is the call site that should report it.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-6xl mb-4" aria-hidden="true">
            ⚠️
          </p>
          <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
          <p className="text-slate-400 mb-8">
            This page hit an unexpected error. Reloading usually clears it — if it keeps happening,
            please let us know what you were doing.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-action-500 text-white font-semibold hover:bg-action-600 transition"
            >
              Reload page
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-200 font-semibold hover:bg-slate-800 transition"
            >
              Go home
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-8 text-left text-xs text-rose-300 bg-slate-900 rounded-lg p-4 overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
