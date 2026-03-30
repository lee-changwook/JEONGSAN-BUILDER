'use client';

import { cn } from '@/lib/utils';
import type { ValidationFinding, FindingStatus } from '@/features/validator/types';

const severityBadgeClassMap = {
  error: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-blue-50 text-blue-600',
} as const;

const severityLabelMap = {
  error: '에러',
  warning: '경고',
  info: '정보',
} as const;

const categoryLabelMap: Record<string, string> = {
  mapping: '데이터 맵핑',
  connection: '연결 상태',
  'sueomnyo-existence': '수업료 존재',
  'chulseok-sueomnyo': '출결-수업료',
  consistency: '정합성',
  timing: '타이밍',
  structure: '구조',
  'amount-guess': '금액 추정',
  attendance: '출결',
  anomaly: '이상치',
};

const statusLabelMap: Record<FindingStatus, string> = {
  pending: '미처리',
  resolved: '✓ 해결됨',
  'on-hold': '보류',
};

interface FindingCardProps {
  finding: ValidationFinding;
  status: FindingStatus;
  mode: 'view' | 'edit';
  onAction?: (action: 'resolve' | 'hold' | 'open-chulgyeol') => void;
}

export function FindingCard({ finding, status, mode, onAction }: FindingCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-5 transition-colors',
        status === 'resolved' && 'border-emerald-200 bg-emerald-50',
        status === 'on-hold' && 'border-amber-200 bg-amber-50 opacity-80'
      )}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-md', severityBadgeClassMap[finding.severity])}>
          {severityLabelMap[finding.severity]}
        </span>
        <span className="text-[13px] text-gray-500 font-medium">{categoryLabelMap[finding.category] ?? finding.category}</span>
        <span
          className={cn(
            'ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-md',
            status === 'resolved' && 'bg-green-100 text-green-600',
            status === 'on-hold' && 'bg-amber-100 text-amber-800'
          )}
        >
          {statusLabelMap[status]}
        </span>
      </div>

      <div className="text-sm text-gray-700 mb-1.5 leading-relaxed">{finding.message}</div>

      <div className="text-[13px] text-gray-500 leading-normal mb-2.5">{finding.reason}</div>

      {Object.keys(finding.evidence).length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 mb-3.5 text-[13px] text-gray-600 leading-relaxed">
          {Object.entries(finding.evidence).map(([key, value]) => (
            <div key={key}>
              {key}: {value}
            </div>
          ))}
        </div>
      )}

      {finding.suggestion && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-3.5 py-3 mb-3.5 flex gap-2 text-[13px] text-sky-700 leading-normal">
          <span className="shrink-0 text-base">💡</span>
          {finding.suggestion}
        </div>
      )}

      {mode === 'edit' && status === 'pending' && (
        <div className="flex gap-2 flex-wrap">
          {(finding.category === 'attendance' || finding.category === 'chulseok-sueomnyo') && (
            <button
              className="px-3.5 py-1.5 text-[13px] font-medium rounded-[7px] cursor-pointer bg-gray-900 text-white border border-gray-900 flex items-center gap-1.5 transition-colors hover:bg-gray-700"
              onClick={() => onAction?.('open-chulgyeol')}
            >
              출결관리 열기
            </button>
          )}
          <button
            className="px-3.5 py-1.5 text-[13px] font-medium rounded-[7px] cursor-pointer border border-gray-300 bg-white text-gray-700 flex items-center gap-1.5 transition-colors hover:bg-gray-50"
            onClick={() => onAction?.('resolve')}
          >
            해결 표시
          </button>
          <button
            className="px-3.5 py-1.5 text-[13px] font-medium rounded-[7px] cursor-pointer border border-gray-300 bg-white text-gray-700 flex items-center gap-1.5 transition-colors hover:bg-gray-50"
            onClick={() => onAction?.('hold')}
          >
            보류
          </button>
        </div>
      )}

      {mode === 'edit' && status === 'resolved' && (
        <div className="flex gap-2 flex-wrap">
          <button className="px-3.5 py-1.5 text-[13px] font-medium rounded-[7px] cursor-pointer border border-gray-300 bg-green-100 text-green-600 flex items-center gap-1.5">
            ✓ 해결됨
          </button>
        </div>
      )}

      {mode === 'edit' && status === 'on-hold' && (
        <div className="flex gap-2 flex-wrap">
          <button className="px-3.5 py-1.5 text-[13px] font-medium rounded-[7px] cursor-pointer border border-gray-300 bg-amber-100 text-amber-800 flex items-center gap-1.5">
            보류 중
          </button>
        </div>
      )}
    </div>
  );
}
