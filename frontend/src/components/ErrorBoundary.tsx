import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.resetError = this.resetError.bind(this);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public resetError() {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0c141e] text-slate-200 text-center rounded-xl border border-white/10">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Map Engine Notice</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
            {this.state.error?.message ||
              "The map provider encountered an initialization issue (commonly due to an unauthenticated Google Maps key)."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.resetError}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Map View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
