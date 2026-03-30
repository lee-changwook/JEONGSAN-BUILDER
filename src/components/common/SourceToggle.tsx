'use client';

import type { DataSource } from '@/features/validator/types';

interface SourceToggleProps {
  value: DataSource;
  onChange: (source: DataSource) => void;
}

const SOURCES: { key: DataSource; label: string; desc: string[] }[] = [
  { key: 'tikita', label: '티키타 데이터', desc: ['티키타에서 자동으로 불러옵니다', '여러 개의 수업을 동시에 대조할 수 있습니다'] },
  { key: 'aca2000', label: 'ACA2000 데이터', desc: ['출결 현황 엑셀 파일을 업로드합니다', '하나의 수업만 대조할 수 있습니다'] },
];

export function SourceToggle({ value, onChange }: SourceToggleProps) {
  return (
    <div className="flex gap-3 mb-7">
      {SOURCES.map(({ key, label, desc }) => {
        const isActive = value === key;
        return (
          <div
            key={key}
            className={`flex-1 px-5 py-4 border-2 rounded-xl bg-white cursor-pointer text-left transition-all duration-150 ${
              isActive ? 'border-gray-900 bg-[#fafafa]' : 'border-gray-200'
            }`}
            onClick={() => onChange(key)}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`inline-block w-4 h-4 rounded-full border-2 relative shrink-0 ${
                  isActive ? 'border-gray-900' : 'border-gray-300'
                }`}
              >
                {isActive && (
                  <div className="absolute top-[3px] left-[3px] w-1.5 h-1.5 rounded-full bg-gray-900" />
                )}
              </div>
              <span className="text-[15px] font-semibold">{label}</span>
            </div>
            <div className="text-[13px] text-gray-600 mt-1.5 pl-6 flex flex-col gap-[3px] leading-relaxed">
              {desc.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
