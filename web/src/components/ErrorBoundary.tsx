// 렌더 중 예외를 잡아 '빈 화면' 대신 원인과 복구 버튼을 보여준다.
// 저장값(localStorage) 손상 등으로 부팅이 깨지는 상황을 사용자가 스스로 복구할 수 있게.

import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown): void {
    console.error('[ErrorBoundary]', error, info);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="fixed inset-0 bg-[#0e1621] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-lg font-bold mb-2">화면을 그리는 중 문제가 발생했습니다</h2>
        <pre className="text-xs text-red-300 bg-black/40 rounded-lg p-3 max-w-md overflow-auto whitespace-pre-wrap mb-5">
          {error.message}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={() => {
              try {
                localStorage.clear();
              } catch {
                /* noop */
              }
              location.reload();
            }}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-4 py-2.5 rounded-xl"
          >
            초기화하고 새로고침
          </button>
          <button
            onClick={() => location.reload()}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }
}
