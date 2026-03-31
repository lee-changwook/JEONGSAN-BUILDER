'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { GuideModal } from '@/components/common/GuideModal';

export function TopNav() {
  const pathname = usePathname();
  const isPaybuilder = pathname.startsWith('/settla/paybuilder');
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-[100]">
      <div className="flex items-center gap-5">
        <div className="font-bold text-lg tracking-tight text-blue-600 flex items-center gap-2 cursor-pointer">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="6" fill="currentColor" />
            <path d="M6 8h10M6 11h10M6 14h7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          SETTLA
        </div>
        <div className="w-px h-6 bg-gray-200" />
        <a
          className={
            isPaybuilder
              ? 'text-[13px] font-medium text-gray-500 cursor-pointer transition-colors duration-150 no-underline hover:text-gray-900'
              : 'text-[13px] font-semibold text-blue-600 cursor-default no-underline'
          }
          href="/settla/validator"
        >
          벨리데이터
        </a>
        <span className="text-gray-200 font-light">|</span>
        <a
          className={
            isPaybuilder
              ? 'text-[13px] font-semibold text-blue-600 cursor-default no-underline'
              : 'text-[13px] font-medium text-gray-500 cursor-pointer transition-colors duration-150 no-underline hover:text-gray-900'
          }
          href="https://pay-builder.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          페이빌더
        </a>
        <span className="text-gray-200 font-light">|</span>
        <button
          className="text-[13px] font-medium text-gray-500 cursor-pointer transition-colors duration-150 bg-transparent border-none p-0 hover:text-gray-900"
          onClick={() => setGuideOpen(true)}
        >
          이용 가이드
        </button>
      </div>
      {guideOpen && (
        <GuideModal
          defaultTab={isPaybuilder ? 'paybuilder' : 'validator'}
          onClose={() => setGuideOpen(false)}
        />
      )}
      <div className="flex items-center gap-1">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 rounded-lg bg-white text-[13px] font-medium text-gray-900">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 5v8H1V5L7 1z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          플라즈마학원 {'>'} 고등1관
          <span className="text-gray-200 mx-0.5 font-light">|</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1 6h12M4 1v2M10 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          2026년 3월
        </div>
      </div>
    </nav>
  );
}
