'use client';

import { type CourseBlock } from '@/features/paybuilder/types';
import { formatCurrency, totalCoursePay, totalCourseUnpaid } from '@/features/paybuilder/logic/utils';
import { cn } from '@/lib/utils';

type Props = {
  courses: CourseBlock[];
  selectedCourseId: string | null;
  onSelect: (id: string) => void;
};

export function CourseList({ courses, selectedCourseId, onSelect }: Props) {
  return (
    <aside className="grid gap-2.5 content-start">
      {courses.map((course) => {
        const isSelected = course.id === selectedCourseId;
        const unpaid = totalCourseUnpaid(course);

        return (
          <button
            key={course.id}
            type="button"
            onClick={() => onSelect(course.id)}
            className={cn(
              'text-left rounded-[10px] p-3.5 cursor-pointer w-full border',
              isSelected
                ? 'border-blue-600 bg-blue-50'
                : unpaid > 0
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-100',
            )}
          >
            <div className="text-xs text-gray-500">{course.teacherName || '강사 미정'}</div>
            <div className="font-bold mt-1 text-[13px] leading-[1.3] line-clamp-3">{course.titleText || '제목 미정'}</div>
            <div className="flex justify-between mt-2.5 text-xs text-gray-500">
              <span>학생 {course.students.length}명</span>
              <span>PAY {formatCurrency(totalCoursePay(course))}</span>
            </div>
            <div className="flex justify-between mt-1.5 text-xs">
              <span className="text-gray-500">미납</span>
              <span className={cn('font-bold', unpaid > 0 ? 'text-red-600' : 'text-gray-500')}>
                {formatCurrency(unpaid)}
              </span>
            </div>
          </button>
        );
      })}
    </aside>
  );
}
