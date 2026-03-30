'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { StepIndicator } from '@/components/common/StepIndicator';
import { Step1Setup } from '@/components/validator/sections/Step1Setup';
import { Step2Validation } from '@/components/validator/sections/Step2Validation';
import { useValidatorStore } from '@/store/validator-store';
import type { ValidatorStep } from '@/features/validator/types';

export function ValidatorClient() {
  const { currentStep, setStep, runValidation } = useValidatorStore();

  const completedSteps: ValidatorStep[] = currentStep > 1 ? [1] : [];

  function handleStep1Next() {
    runValidation();
    setStep(2);
  }

  return (
    <div>
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} onStepClick={setStep} />
      {currentStep === 1 && <Step1Setup onNext={handleStep1Next} />}
      {currentStep === 2 && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              </div>
            }
          >
            <Step2Validation />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
