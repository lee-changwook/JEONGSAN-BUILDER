'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ValidationFinding, AttendanceStatus } from '@/features/validator/types';
import { useValidatorStore } from '@/store/validator-store';

const categoryTitleMap = {
  chulgyeol: '출결 불일치 수정',
  amount: '금액 불일치 수정',
  sunap: '수납 이상 확인',
  'student-status': '학생 상태 확인',
} as const;

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: '출',
  absent: '결',
  late: '지',
  dongYoung: '동',
  bogang: '보',
  hyuGang: '휴',
};

const attendanceColors: Record<AttendanceStatus, { bg: string; text: string }> = {
  present: { bg: '#e8edff', text: '#4d6be5' },
  absent: { bg: '#FFE7E1', text: '#FF5226' },
  late: { bg: '#f3f4f6', text: '#575c72' },
  dongYoung: { bg: '#FFF7D3', text: '#FF9A17' },
  bogang: { bg: '#f6f1fb', text: '#8b28e0' },
  hyuGang: { bg: '#f3f4f6', text: '#9ca3af' },
};

const ROTATE_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'dongYoung', 'bogang', 'hyuGang'];

function rotateStatus(current: AttendanceStatus): AttendanceStatus {
  const idx = ROTATE_ORDER.indexOf(current);
  return ROTATE_ORDER[(idx + 1) % ROTATE_ORDER.length];
}

interface EditModalProps {
  finding: ValidationFinding;
  onSave: (findingId: string) => void;
  onClose: () => void;
}

export function EditModal({ finding, onSave, onClose }: EditModalProps) {
  const { loadedData } = useValidatorStore();
  const [editValue, setEditValue] = useState(String(finding.diff.actual));

  const courseData = loadedData.find((cd) => cd.course.name === finding.gangjwaName);
  const studentData = courseData?.students.find((s) => s.name === finding.studentName);

  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>(
    studentData?.attendance ? { ...studentData.attendance } : {},
  );

  const dates = Object.keys(localAttendance).sort();

  function handleCellClick(date: string) {
    const current = localAttendance[date];
    if (!current) return;
    setLocalAttendance((prev) => ({ ...prev, [date]: rotateStatus(current) }));
  }

  function formatDay(dateStr: string) {
    const d = new Date(dateStr);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getDate()}(${weekdays[d.getDay()]})`;
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-200 w-[520px] max-h-[80vh] overflow-y-auto">
        <div className="text-base font-bold mb-1">{categoryTitleMap[finding.category]}</div>
        <div className="text-[13px] text-gray-500 mb-5">
          {finding.studentName} &middot; {finding.gangjwaName}
        </div>

        <div className="mb-5">
          <div className="text-[13px] text-gray-500 mb-2">{finding.diff.field}</div>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-[13px] text-gray-500 mb-1.5">기대값</div>
              <div className="px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white w-full">
                {finding.diff.expected}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[13px] text-gray-500 mb-1.5">실제값</div>
              <div className="px-3.5 py-2.5 border border-red-600 rounded-lg text-sm bg-red-50 w-full text-red-600 font-semibold">
                {finding.diff.actual}
              </div>
            </div>
          </div>
        </div>

        {finding.category === 'chulgyeol' && dates.length > 0 && (
          <div className="mb-5 border border-gray-200 rounded-lg p-4 bg-[#fafbfd]">
            <div className="text-[13px] font-semibold text-gray-900 mb-3">
              출결 현황 <span className="font-normal text-gray-400 text-[11px]">(클릭으로 상태 변경)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dates.map((date) => {
                const att = localAttendance[date];
                const colors = att ? attendanceColors[att] : { bg: '#e5e7eb', text: 'transparent' };
                return (
                  <div
                    key={date}
                    className="flex flex-col items-center gap-1 cursor-pointer select-none"
                    onClick={() => handleCellClick(date)}
                  >
                    <div className="text-[10px] text-gray-500">{formatDay(date)}</div>
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-semibold border border-gray-200 transition-transform hover:scale-110"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {att ? attendanceLabels[att] : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {finding.category === 'amount' && (
          <div className="mb-4">
            <div className="text-[13px] text-gray-500 mb-1.5">수정 금액</div>
            <input
              className="px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white w-full outline-none focus:border-gray-900"
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          </div>
        )}

        {(finding.category === 'sunap' || finding.category === 'student-status') && (
          <div className="text-[13px] text-gray-500 leading-normal px-3.5 py-3 bg-gray-50 rounded-lg mb-4">
            {finding.evidence}
          </div>
        )}

        <div className="bg-sky-50 border border-sky-200 rounded-lg px-3.5 py-3 text-[13px] text-sky-700 leading-normal mb-5">
          {finding.suggestion}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => onSave(finding.id)}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
