'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ChecklistItem, FindingSeverity } from '@/features/validator/types';

interface SidePanelProps {
  children: ReactNode;
}

export function SidePanel({ children }: SidePanelProps) {
  return (
    <aside className="w-80 shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-5 self-start sticky top-20">
      {children}
    </aside>
  );
}

interface SideSectionProps {
  title: string;
  children: ReactNode;
}

export function SideSection({ title, children }: SideSectionProps) {
  return (
    <div className="flex flex-col">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

export function SideDivider() {
  return <div className="h-px bg-gray-100" />;
}

interface ChecklistProps {
  items: ChecklistItem[];
}

export function Checklist({ items }: ChecklistProps) {
  return (
    <div>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 py-1.5">
          <div className={cn(
            'w-[18px] h-[18px] rounded flex items-center justify-center shrink-0 transition-all duration-150',
            item.done
              ? 'border-[1.5px] border-emerald-600 bg-emerald-50 text-emerald-600'
              : 'border-[1.5px] border-gray-200 text-transparent',
          )}>
            {item.done && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className={cn(
            'text-[13px] font-medium leading-normal',
            item.done ? 'text-emerald-600 line-through' : 'text-gray-500',
          )}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface StatGridProps {
  error: number;
  warning: number;
  info: number;
}

const statCardBgMap: Record<FindingSeverity, string> = {
  error: 'bg-red-50',
  warning: 'bg-amber-50',
  info: 'bg-blue-50',
};

const statValueColorMap: Record<FindingSeverity, string> = {
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export function StatGrid({ error, warning, info }: StatGridProps) {
  const items: { label: string; value: number; severity: FindingSeverity }[] = [
    { label: '에러', value: error, severity: 'error' },
    { label: '경고', value: warning, severity: 'warning' },
    { label: '정보', value: info, severity: 'info' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, value, severity }) => (
        <div key={severity} className={cn('p-2.5 rounded-lg text-center', statCardBgMap[severity])}>
          <div className={cn('text-xl font-bold tracking-tight leading-tight mb-0.5', statValueColorMap[severity])}>
            {value}
          </div>
          <div className="text-xs font-medium text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string | number;
}

export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-[13px] font-medium text-gray-500">{label}</span>
      <span className="text-[13px] font-semibold text-gray-900">{value}</span>
    </div>
  );
}

interface ProgressBarProps {
  resolved: number;
  total: number;
}

export function ProgressBar({ resolved, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  return (
    <div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-600 rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs font-medium text-gray-400">
        <span>{resolved}/{total} 처리</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

interface CourseStatusItemProps {
  name: string;
  severity: FindingSeverity | 'success';
  onClick?: () => void;
}

const badgeClassMap: Record<FindingSeverity | 'success', string> = {
  error: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-blue-50 text-blue-600',
  success: 'bg-emerald-50 text-emerald-600',
};

const badgeLabelMap: Record<FindingSeverity | 'success', string> = {
  error: '에러',
  warning: '경고',
  info: '정보',
  success: '정상',
};

export function CourseStatusItem({ name, severity, onClick }: CourseStatusItemProps) {
  return (
    <div
      className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer transition-colors duration-150 last:border-b-0 hover:bg-gray-100 hover:mx-[-8px] hover:px-2 hover:rounded-md"
      onClick={onClick}
    >
      <span className="text-[13px] font-medium text-gray-900">{name}</span>
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', badgeClassMap[severity])}>
        {badgeLabelMap[severity]}
      </span>
    </div>
  );
}
