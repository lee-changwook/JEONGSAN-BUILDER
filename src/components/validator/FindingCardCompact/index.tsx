'use client';

import { cn } from '@/lib/utils';
import type { ValidationFinding, FindingStatus } from '@/features/validator/types';

const dotColorMap = {
  error: 'bg-red-600',
  warning: 'bg-amber-600',
  info: 'bg-blue-600',
} as const;

const statusClassMap = {
  pending: 'bg-gray-100 text-gray-500',
  resolved: 'bg-green-100 text-green-600',
  'on-hold': 'bg-amber-100 text-amber-800',
} as const;

const statusLabelMap = {
  pending: '대기',
  resolved: '해결',
  'on-hold': '보류',
} as const;

interface FindingCardCompactProps {
  finding: ValidationFinding;
  status: FindingStatus;
  isActive: boolean;
  onClick: () => void;
}

export function FindingCardCompact({ finding, status, isActive, onClick }: FindingCardCompactProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] px-4 py-3.5 cursor-pointer flex items-start gap-2.5',
        isActive
          ? 'bg-indigo-50 border border-indigo-500'
          : 'bg-white border border-gray-200 transition-colors hover:border-indigo-300 hover:bg-[#fafbff]'
      )}
      onClick={onClick}
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0 mt-[5px]', dotColorMap[finding.severity])} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 mb-0.5">{finding.studentName}</div>
        <div className="text-[13px] text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">{finding.message}</div>
      </div>
      <span className={cn('px-1.5 py-0.5 rounded-[10px] text-xs font-semibold shrink-0', statusClassMap[status])}>
        {statusLabelMap[status]}
      </span>
    </div>
  );
}
