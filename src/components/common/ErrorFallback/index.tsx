'use client';

import type { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6">
      <div className="text-center">
        <div className="text-sm font-semibold text-red-600 mb-1">오류가 발생했습니다</div>
        <div className="text-xs text-gray-500 max-w-[360px]">
          {error instanceof Error ? error.message : '알 수 없는 오류'}
        </div>
      </div>
      <button
        className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-gray-400"
        type="button"
        onClick={resetErrorBoundary}
      >
        다시 시도
      </button>
    </div>
  );
}
