import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App render failed.', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-full bg-[#f7fafc] px-6 py-12 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-[#e2e8f0] bg-white p-6 text-center shadow-sm">
          <div className="text-4xl mb-4">!</div>
          <h1 className="text-xl text-[#2d3748] mb-2" style={{ fontWeight: 700 }}>
            화면을 불러오지 못했습니다
          </h1>
          <p className="text-sm text-[#718096] leading-6 mb-5">
            일시적인 화면 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.
          </p>
          {this.state.message && (
            <p className="mb-5 rounded-xl bg-[#f7fafc] px-3 py-2 text-xs text-[#718096] break-words">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-2xl bg-[#bef264] py-3 text-[#0a0a0a] hover:bg-[#a3e635] transition-colors"
            style={{ fontWeight: 700 }}
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }
}
