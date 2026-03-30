'use client';

import type { ValidatorStep } from '@/features/validator/types';

const STEPS: { step: ValidatorStep; label: string }[] = [
  { step: 1, label: '대조할 데이터 준비' },
  { step: 2, label: '결과 및 수정' },
];

interface StepIndicatorProps {
  currentStep: ValidatorStep;
  completedSteps: ValidatorStep[];
  onStepClick?: (step: ValidatorStep) => void;
}

export function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  const canGoBack = currentStep === 2 && !!onStepClick;

  return (
    <div className="bg-white border-b border-gray-200 px-10 py-5 flex items-center sticky top-14 z-50">
      {STEPS.map(({ step, label }, idx) => {
        const isDone = completedSteps.includes(step);
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            {idx > 0 && <div className="w-15 h-px bg-gray-200 mx-4" />}
            <div
              className={`flex items-center gap-2 text-sm transition-colors duration-150 ${
                isActive ? 'font-semibold text-gray-900' : isDone ? 'font-medium text-blue-600' : 'font-medium text-gray-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all duration-150 ${
                  isDone
                    ? 'bg-blue-600 text-white'
                    : isActive
                      ? 'bg-white border-2 border-blue-600 text-blue-600'
                      : 'bg-gray-100 border-2 border-gray-200 text-gray-400'
                }`}
              >
                {isDone ? '\u2713' : step}
              </div>
              <span>{label}</span>
            </div>
            {isActive && canGoBack && (
              <button
                className="flex items-center gap-1.5 ml-3 px-3 py-[5px] border border-gray-200 rounded-md bg-white text-[13px] font-medium text-gray-500 cursor-pointer transition-all duration-150 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
                type="button"
                onClick={() => onStepClick(1)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7.5a4.5 4.5 0 1 1 1.05 2.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 4.5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                처음으로
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
