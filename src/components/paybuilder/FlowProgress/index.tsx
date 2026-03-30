'use client';

import { cn } from '@/lib/utils';

type FlowStage = 'upload' | 'parsed' | 'exported';

interface StepDef {
  label: string;
  value?: string;
}

interface FlowProgressProps {
  stage: FlowStage;
  steps: StepDef[];
}

function getState(stepIndex: number, stage: FlowStage): 'done' | 'active' | 'pending' {
  const stageIndex = stage === 'upload' ? 0 : stage === 'parsed' ? 1 : 2;
  if (stepIndex < stageIndex) return 'done';
  if (stepIndex === stageIndex) return 'active';
  return 'pending';
}

export function FlowProgress({ stage, steps }: FlowProgressProps) {
  return (
    <div className="flex flex-col">
      {steps.map(({ label, value }, idx) => {
        const state = getState(idx, stage);
        const isLast = idx === steps.length - 1;

        return (
          <div key={label} className="flex items-start gap-3 relative">
            <div className="flex flex-col items-center shrink-0 w-7">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 transition-all duration-150 ease-in-out',
                  state === 'done' && 'bg-blue-600 text-white',
                  state === 'active' && 'bg-white border-2 border-blue-600 text-blue-600',
                  state === 'pending' && 'bg-gray-100 border-2 border-gray-200 text-gray-400',
                )}
              >
                {state === 'done' ? '\u2713' : idx + 1}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 h-5 transition-colors duration-150 ease-in-out',
                    state === 'done' ? 'bg-blue-600' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
            <div className="pt-1 pb-4 min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div
                  className={cn(
                    'text-sm leading-[1.4] transition-colors duration-150 ease-in-out',
                    state === 'active' ? 'font-semibold' : 'font-medium',
                    state === 'pending' ? 'text-gray-400' : 'text-gray-900',
                  )}
                >
                  {label}
                </div>
                {value && (
                  <div className="text-xs font-semibold text-blue-600 whitespace-nowrap shrink-0">
                    {value}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
