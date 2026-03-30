'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ValidationFinding, AttendanceStatus } from '@/features/validator/types';
import { useValidatorStore } from '@/store/validator-store';

const categoryTitleMap: Record<string, string> = {
  mapping: '데이터 맵핑 확인',
  connection: '연결 상태 확인',
  'sueomnyo-existence': '수업료 존재 확인',
  'chulseok-sueomnyo': '출결-수업료 불일치 수정',
  consistency: '정합성 확인',
  timing: '타이밍 확인',
  structure: '구조 확인',
  'amount-guess': '금액 추정 확인',
  attendance: '출결 불일치 수정',
  anomaly: '이상치 확인',
};

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

  const firstCourse = loadedData[0];
  const studentData = firstCourse?.students.find((s) =>
    finding.message.startsWith(s.name)
  );

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
        <div className="text-base font-bold mb-1">{categoryTitleMap[finding.category] ?? finding.category}</div>
        <div className="text-[13px] text-gray-500 mb-5">
          {finding.message}
        </div>

        <div className="text-[13px] text-gray-500 leading-normal mb-3">{finding.reason}</div>

        {Object.keys(finding.evidence).length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 mb-5 text-[13px] text-gray-600 leading-relaxed">
            {Object.entries(finding.evidence).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
          </div>
        )}

        {(finding.category === 'attendance' || finding.category === 'chulseok-sueomnyo') && dates.length > 0 && (
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
