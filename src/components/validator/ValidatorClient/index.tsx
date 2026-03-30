'use client';

import { StepIndicator } from '@/components/common/StepIndicator';
import { Step1Setup } from '@/features/validator/sections/Step1Setup';
import { Step2Validation } from '@/features/validator/sections/Step2Validation';
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
      {currentStep === 2 && <Step2Validation />}
    </div>
  );
}
