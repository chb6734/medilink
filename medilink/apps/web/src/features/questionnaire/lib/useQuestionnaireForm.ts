'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { QuestionnaireData } from '@/entities/questionnaire/model/types';
import { getPatientInfo } from '@/shared/api';
import { createSteps, type Step } from './steps';

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
  handleNext: () => void;
  handleBackStep: () => void;
  updateFormData: (key: string, value: string) => void;
  setSymptomDetail: (value: string) => void;
}

/**
 * sessionStorage에서 이전 데이터 복원
 */
function getInitialState(initialData: Partial<QuestionnaireData>) {
  if (typeof window === 'undefined') return { step: 0, data: initialData };

  const savedData = sessionStorage.getItem('questionnaireData');
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      return { step: 5, data: parsed };
    } catch {
      return { step: 0, data: initialData };
    }
  }
  return { step: 0, data: initialData };
}

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

  // 환자 정보 (알레르기) 자동 불러오기
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

  // 스텝 생성 (medicationCompliance 변경 시 재생성)
  const steps = useMemo(
    () => createSteps(visitType, formData.medicationCompliance),
    [visitType, formData.medicationCompliance]
  );

  const currentStep = steps[step];

  // 폼 데이터 업데이트
  const updateFormData = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 현재 스텝 유효성 검사
  const isCurrentStepValid = useMemo(() => {
    if (currentStep.kind === 'symptom') {
      const chief = formData.chiefComplaint;
      return !!chief && chief.trim().length > 0;
    }
    const value = formData[currentStep.id as keyof QuestionnaireData];
    if (currentStep.required) return !!value && value.trim().length > 0;
    return true;
  }, [currentStep, formData]);

  // 다음 스텝으로 이동
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
        onComplete(formData as QuestionnaireData);
      }
    } else {
      onComplete(formData as QuestionnaireData);
    }
  }, [step, steps, formData, updateFormData, onComplete]);

  // 이전 스텝으로 이동
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
    handleNext,
    handleBackStep,
    updateFormData,
    setSymptomDetail,
  };
}
