'use client';

import { formatCurrency } from '@/features/paybuilder/logic/utils';

type Stats = {
  fileCount: number;
  courseCount: number;
  studentCount: number;
  unpaidCount: number;
  unpaidAmount: number;
};

export function SettlementStats({ stats }: { stats: Stats }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-[5px] px-2.5 py-1 bg-white/[0.08] border border-white/[0.12] rounded-md text-xs text-white/70 whitespace-nowrap">
        파일 <span className="font-bold text-white">{stats.fileCount}</span>
      </div>
      <div className="flex items-center gap-[5px] px-2.5 py-1 bg-white/[0.08] border border-white/[0.12] rounded-md text-xs text-white/70 whitespace-nowrap">
        강좌 <span className="font-bold text-white">{stats.courseCount}</span>
      </div>
      <div className="flex items-center gap-[5px] px-2.5 py-1 bg-white/[0.08] border border-white/[0.12] rounded-md text-xs text-white/70 whitespace-nowrap">
        학생 <span className="font-bold text-white">{stats.studentCount}</span>
      </div>
      {stats.unpaidCount > 0 && (
        <>
          <div className="flex items-center gap-[5px] px-2.5 py-1 bg-red-600/[0.15] border border-red-600/30 rounded-md text-xs text-red-300 whitespace-nowrap">
            미납 <span className="font-bold text-red-300">{stats.unpaidCount}건</span>
          </div>
          <div className="flex items-center gap-[5px] px-2.5 py-1 bg-red-600/[0.15] border border-red-600/30 rounded-md text-xs text-red-300 whitespace-nowrap">
            합계 <span className="font-bold text-red-300">{formatCurrency(stats.unpaidAmount)}</span>
          </div>
        </>
      )}
    </div>
  );
}
