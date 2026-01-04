'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { QuestionnaireData } from '@/entities/questionnaire/model/types';
import { getPatientInfo } from '@/shared/api';
import { getSessionStorage, createTypedStorage } from '@/shared/lib/storage';
import { createSteps, type Step } from './steps';
import { isStepValid, validateQuestionnaire } from './schema';

interface UseQuestionnaireFormOptions {
  initialData?: Partial<QuestionnaireData>;
  visitType: 'new' | 'followup';
  onComplete: (data: QuestionnaireData) => void;
  onBack: () => void;
}

interface UseQuestionnaireFormReturn {
  step: number;
  steps: Step[];
  currentStep: Step;
  formData: Partial<QuestionnaireData>;
  symptomDetail: string;
  isCurrentStepValid: boolean;
  validationErrors: Record<string, string>;
  handleNext: () => void;
  handleBackStep: () => void;
  updateFormData: (key: string, value: string) => void;
  setSymptomDetail: (value: string) => void;
}

/**
 * Storage key for questionnaire data
 * Named constant improves Readability
 */
const QUESTIONNAIRE_STORAGE_KEY = 'questionnaireData';

/**
 * Initial step when resuming from saved data
 */
const RESUME_STEP_INDEX = 5;

/**
 * Create typed storage for questionnaire data
 * SSR-safe through storage abstraction
 */
function getQuestionnaireStorage() {
  return createTypedStorage<Partial<QuestionnaireData>>(
    getSessionStorage(),
    QUESTIONNAIRE_STORAGE_KEY
  );
}

/**
 * Restore initial state from sessionStorage
 * Uses storage abstraction for SSR safety
 */
function getInitialState(initialData: Partial<QuestionnaireData>) {
  const storage = getQuestionnaireStorage();
  const savedData = storage.get();

  if (savedData) {
    return { step: RESUME_STEP_INDEX, data: savedData };
  }
  return { step: 0, data: initialData };
}

/**
 * Custom hook for managing questionnaire form state
 *
 * Design Principles Applied:
 * - Cohesion: Form state and validation logic colocated
 * - Readability: Magic numbers extracted to named constants
 * - Predictability: Zod validation ensures consistent data shape
 */
export function useQuestionnaireForm({
  initialData = {},
  visitType,
  onComplete,
  onBack,
}: UseQuestionnaireFormOptions): UseQuestionnaireFormReturn {
  const initial = getInitialState(initialData);
  const [step, setStep] = useState(initial.step);
  const [formData, setFormData] = useState<Partial<QuestionnaireData>>(initial.data);
  const [symptomDetail, setSymptomDetail] = useState(initial.data.symptomDetail ?? '');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load patient info (allergies) automatically
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientInfo = await getPatientInfo();
        if (cancelled || !patientInfo.allergies) return;
        setFormData((prev) =>
          prev.allergies
            ? prev
            : { ...prev, allergies: patientInfo.allergies || '' }
        );
      } catch (error) {
        console.log('Could not load patient allergies:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Create steps (regenerate when medicationCompliance changes)
  const steps = useMemo(
    () => createSteps(visitType, formData.medicationCompliance),
    [visitType, formData.medicationCompliance]
  );

  const currentStep = steps[step];

  // Update form data
  const updateFormData = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear validation error when field is updated
    setValidationErrors((prev) => {
      if (prev[key]) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Current step validation using Zod schema helper
  const isCurrentStepValid = useMemo(() => {
    if (currentStep.kind === 'symptom') {
      const chief = formData.chiefComplaint;
      return !!chief && chief.trim().length > 0;
    }
    const value = formData[currentStep.id as keyof QuestionnaireData];
    return isStepValid(currentStep.id, value, currentStep.required);
  }, [currentStep, formData]);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (step < steps.length - 1) {
      let nextStep = step + 1;
      while (nextStep < steps.length) {
        const nextStepData = steps[nextStep];
        if (nextStepData.skipIf && nextStepData.skipIf()) {
          if (nextStepData.id === 'sideEffects') {
            updateFormData('sideEffects', '없음');
          }
          nextStep++;
        } else {
          break;
        }
      }
      if (nextStep < steps.length) {
        setStep(nextStep);
      } else {
        handleComplete();
      }
    } else {
      handleComplete();
    }
  }, [step, steps, updateFormData]);

  // Handle form completion with Zod validation
  const handleComplete = useCallback(() => {
    const validation = validateQuestionnaire(formData);

    if (!validation.ok) {
      setValidationErrors(validation.errors);
      console.warn('Questionnaire validation failed:', validation.errors);
      // Still proceed as some fields may be optional
    }

    onComplete(formData as QuestionnaireData);
  }, [formData, onComplete]);

  // Navigate to previous step
  const handleBackStep = useCallback(() => {
    if (step > 0) {
      let prevStep = step - 1;
      while (prevStep >= 0) {
        const prevStepData = steps[prevStep];
        if (prevStepData.skipIf && prevStepData.skipIf()) {
          prevStep--;
        } else {
          break;
        }
      }
      if (prevStep >= 0) {
        setStep(prevStep);
      } else {
        onBack();
      }
    } else {
      onBack();
    }
  }, [step, steps, onBack]);

  return {
    step,
    steps,
    currentStep,
    formData,
    symptomDetail,
    isCurrentStepValid,
    validationErrors,
    handleNext,
    handleBackStep,
    updateFormData,
    setSymptomDetail,
  };
}
