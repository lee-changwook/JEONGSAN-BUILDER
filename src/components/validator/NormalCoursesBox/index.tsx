'use client';

import { useState } from 'react';
import type { CourseInfo } from '@/features/validator/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const VISIBLE_COUNT = 5;

interface NormalCoursesBoxProps {
  courses: CourseInfo[];
}

export function NormalCoursesBox({ courses }: NormalCoursesBoxProps) {
  const [showModal, setShowModal] = useState(false);
  const visible = courses.slice(0, VISIBLE_COUNT);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
        <div className="flex items-center gap-2 text-[15px] font-semibold mb-3.5 text-emerald-600">
          ✓ 정상 ({courses.length}개 강좌)
        </div>
        <div className="flex flex-col">
          {visible.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between py-2 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
            >
              <span>{c.name}</span>
              <span className="text-[13px] text-gray-400">{c.teacher}</span>
            </div>
          ))}
        </div>
        {courses.length > VISIBLE_COUNT && (
          <button
            className="w-full text-center pt-3 text-[13px] text-gray-500 cursor-pointer underline bg-transparent border-none"
            onClick={() => setShowModal(true)}
          >
            더 보기 (전체 {courses.length}개)
          </button>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[400px] max-h-[60vh] overflow-y-auto sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              정상 강좌 전체 ({courses.length}개)
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {courses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50"
              >
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-[13px] text-gray-400">{c.teacher}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
