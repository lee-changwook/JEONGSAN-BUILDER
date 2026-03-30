'use client';

import { type CourseBlock } from '@/features/paybuilder/types';
import { normalizeSessionDates } from '@/features/paybuilder/logic/utils';

type Props = {
  course: CourseBlock;
  onUpdate: (updater: (course: CourseBlock) => CourseBlock) => void;
};

export function CourseDetail({ course, onUpdate }: Props) {
  return (
    <section className="bg-white border border-gray-200 rounded-[10px] p-4">
      <div className="grid gap-2.5">
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <label>
            <div className="text-[11px] font-semibold text-gray-500 mb-[3px]">강사명</div>
            <input
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[13px] leading-[1.3] transition-colors duration-150 focus:outline-none focus:border-blue-600"
              value={course.teacherName}
              onChange={(event) =>
                onUpdate((c) => ({ ...c, teacherName: event.target.value }))
              }
            />
          </label>
          <label>
            <div className="text-[11px] font-semibold text-gray-500 mb-[3px]">표시 제목</div>
            <input
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[13px] leading-[1.3] transition-colors duration-150 focus:outline-none focus:border-blue-600"
              value={course.titleText}
              onChange={(event) =>
                onUpdate((c) => ({ ...c, titleText: event.target.value }))
              }
            />
          </label>
        </div>
        <div className="grid grid-cols-[80px_100px_1fr] gap-2">
          <label>
            <div className="text-[11px] font-semibold text-gray-500 mb-[3px]">회차</div>
            <input
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[13px] leading-[1.3] transition-colors duration-150 focus:outline-none focus:border-blue-600"
              type="number"
              value={course.sessionCount}
              onChange={(event) =>
                onUpdate((c) => ({ ...c, sessionCount: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            <div className="text-[11px] font-semibold text-gray-500 mb-[3px]">회당 금액</div>
            <input
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[13px] leading-[1.3] transition-colors duration-150 focus:outline-none focus:border-blue-600"
              type="number"
              value={course.sessionFee}
              onChange={(event) =>
                onUpdate((c) => ({ ...c, sessionFee: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            <div className="text-[11px] font-semibold text-gray-500 mb-[3px]">회차 날짜</div>
            <input
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[13px] leading-[1.3] transition-colors duration-150 focus:outline-none focus:border-blue-600"
              value={course.sessionDates.join(',')}
              onChange={(event) =>
                onUpdate((c) => ({
                  ...c,
                  sessionDates: normalizeSessionDates(event.target.value.split(',')),
                }))
              }
            />
          </label>
        </div>
      </div>
    </section>
  );
}
