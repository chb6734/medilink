'use client';

import React from 'react';
import type { QuestionnaireData } from '@/entities/questionnaire/model/types';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';
import { Button } from '@/shared/components';

import { useQuestionnaireForm } from '../lib/useQuestionnaireForm';
import { QuestionnaireProgress } from './QuestionnaireProgress';
import { SymptomStep } from './SymptomStep';
import { SelectStep } from './SelectStep';
import { TextareaStep } from './TextareaStep';

interface QuestionnaireProps {
  initialData?: Partial<QuestionnaireData>;
  visitType?: 'new' | 'followup';
  relatedRecordId?: string;
  onBack: () => void;
  onComplete: (data: QuestionnaireData) => void;
}

export function Questionnaire({
  initialData = {},
  visitType = 'new',
  onBack,
  onComplete,
}: QuestionnaireProps) {
  const {
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
  } = useQuestionnaireForm({
    initialData,
    visitType,
    onComplete,
    onBack,
  });

  const renderStep = () => {
    switch (currentStep.kind) {
      case 'symptom':
        return (
          <SymptomStep
            chiefComplaint={formData.chiefComplaint ?? ''}
            symptomDetail={symptomDetail}
            symptomStart={formData.symptomStart ?? ''}
            onChiefComplaintChange={(v) => updateFormData('chiefComplaint', v)}
            onSymptomDetailChange={(v) => {
              setSymptomDetail(v);
              updateFormData('symptomDetail', v);
            }}
            onSymptomStartChange={(v) => updateFormData('symptomStart', v)}
          />
        );

      case 'select':
        return (
          <SelectStep
            title={currentStep.title || ''}
            subtitle={currentStep.subtitle}
            options={currentStep.options || []}
            selectedValue={(formData as Record<string, string>)[currentStep.id] || ''}
            onChange={(v) => updateFormData(currentStep.id, v)}
          />
        );

      case 'textarea':
        return (
          <TextareaStep
            title={currentStep.title || ''}
            subtitle={currentStep.subtitle}
            placeholder={currentStep.placeholder}
            value={(formData as Record<string, string>)[currentStep.id] || ''}
            onChange={(v) => updateFormData(currentStep.id, v)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Header with Progress */}
      <QuestionnaireProgress
        currentStep={step}
        totalSteps={steps.length}
        onBack={handleBackStep}
      />

      {/* Question Content */}
      <div className="flex-1 px-5 pb-8" style={{ paddingTop: spacing.sm }}>
        <div
          className="card"
          style={{
            padding: spacing.xl,
            borderRadius: borderRadius['2xl'],
            border: '1px solid var(--color-border)',
          }}
        >
          {renderStep()}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: spacing.lg, padding: '0 4px' }}>
          <p
            style={{
              fontSize: typography.fontSize.base,
              color: colors.neutral[400],
              lineHeight: 1.5,
            }}
          >
            입력한 정보는 의료진이 참고할 수 있도록 요약됩니다. 진단/치료 판단은
            의료진이 직접 합니다.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          padding: '14px 20px 18px',
          background:
            'linear-gradient(to top, var(--color-background) 75%, rgba(255,255,255,0))',
        }}
      >
        <Button
          onClick={handleNext}
          disabled={!isCurrentStepValid}
          variant="primary"
          size="lg"
          fullWidth
          style={{
            minHeight: '56px',
            borderRadius: borderRadius.xl,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.extrabold,
          }}
        >
          {step < steps.length - 1 ? '다음' : '완료'}
        </Button>
      </div>
    </div>
  );
}
