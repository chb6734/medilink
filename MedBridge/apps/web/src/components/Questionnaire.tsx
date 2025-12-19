import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { QuestionnaireData } from '../App';

interface QuestionnaireProps {
  onBack: () => void;
  onComplete: (data: QuestionnaireData) => void;
}

export function Questionnaire({ onBack, onComplete }: QuestionnaireProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<QuestionnaireData>>({});

  const questions = [
    {
      id: 'hospitalName',
      title: '어느 병원에 가시나요?',
      type: 'text',
      placeholder: '병원 이름을 입력해주세요',
      required: true
    },
    {
      id: 'chiefComplaint',
      title: '어떤 증상이 있으세요?',
      type: 'textarea',
      placeholder: '예: 3일 전부터 목이 아프고 열이 나요',
      required: true
    },
    {
      id: 'symptomStart',
      title: '언제부터 아프셨나요?',
      type: 'select',
      options: [
        '오늘부터',
        '1-2일 전부터',
        '3-7일 전부터',
        '1-2주 전부터',
        '2주 이상'
      ],
      required: true
    },
    {
      id: 'symptomProgress',
      title: '증상이 어떻게 변했나요?',
      type: 'select',
      options: [
        '점점 좋아지고 있어요',
        '비슷해요',
        '점점 나빠지고 있어요',
        '좋았다 나빴다 해요'
      ],
      required: true
    },
    {
      id: 'medicationCompliance',
      title: '처방받은 약을 드셨나요?',
      type: 'select',
      options: [
        '처방받은 적 없음',
        '빠짐없이 먹었어요',
        '가끔 빠뜨렸어요',
        '자주 빠뜨렸어요',
        '먹다가 중단했어요'
      ],
      required: true
    },
    {
      id: 'sideEffects',
      title: '약 먹고 이상한 점은 없었나요?',
      type: 'textarea',
      placeholder: '예: 속이 메스꺼웠어요\n(없으면 "없음" 입력)',
      required: true
    },
    {
      id: 'allergies',
      title: '알레르기가 있으신가요?',
      subtitle: '(선택사항)',
      type: 'textarea',
      placeholder: '예: 페니실린 알레르기\n(없으면 "없음" 입력)',
      required: false
    },
    {
      id: 'patientNotes',
      title: '의사에게 꼭 전할 말이 있나요?',
      subtitle: '(선택사항)',
      type: 'textarea',
      placeholder: '예: 이전에 같은 증상으로 ○○병원에서 치료받았어요',
      required: false
    }
  ];

  const currentQuestion = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(formData as QuestionnaireData);
    }
  };

  const handleBackStep = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const isCurrentStepValid = () => {
    const value = formData[currentQuestion.id as keyof QuestionnaireData];
    if (currentQuestion.required) {
      return value && value.trim().length > 0;
    }
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface)' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--color-border)',
        padding: '16px 24px',
        background: 'var(--color-surface)'
      }}>
        <button 
          onClick={handleBackStep}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            marginLeft: '-8px',
            marginBottom: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-text-primary)'
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div style={{ marginBottom: '12px' }}>
          <p style={{ 
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem'
          }}>
            질문 {step + 1} / {questions.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          background: 'var(--color-border)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'var(--color-accent)',
            width: `${progress}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-6 py-8">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ marginBottom: '8px', fontSize: '1.5rem' }}>
            {currentQuestion.title}
          </h1>
          {currentQuestion.subtitle && (
            <p style={{ 
              color: 'var(--color-text-tertiary)',
              fontSize: '0.9375rem'
            }}>
              {currentQuestion.subtitle}
            </p>
          )}
        </div>

        {currentQuestion.type === 'text' && (
          <input
            type="text"
            value={formData[currentQuestion.id as keyof QuestionnaireData] || ''}
            onChange={(e) => updateFormData(currentQuestion.id, e.target.value)}
            placeholder={currentQuestion.placeholder}
            autoFocus
            style={{
              width: '100%',
              padding: '16px 18px',
              border: '2px solid var(--color-border)',
              borderRadius: '12px',
              fontSize: '1.0625rem',
              background: 'var(--color-surface)',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
          />
        )}

        {currentQuestion.type === 'textarea' && (
          <textarea
            value={formData[currentQuestion.id as keyof QuestionnaireData] || ''}
            onChange={(e) => updateFormData(currentQuestion.id, e.target.value)}
            placeholder={currentQuestion.placeholder}
            rows={5}
            autoFocus
            style={{
              width: '100%',
              padding: '16px 18px',
              border: '2px solid var(--color-border)',
              borderRadius: '12px',
              fontSize: '1.0625rem',
              background: 'var(--color-surface)',
              outline: 'none',
              resize: 'none',
              lineHeight: '1.5'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
          />
        )}

        {currentQuestion.type === 'select' && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = formData[currentQuestion.id as keyof QuestionnaireData] === option;
              return (
                <button
                  key={option}
                  onClick={() => updateFormData(currentQuestion.id, option)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '18px 20px',
                    border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: '12px',
                    background: isSelected ? 'var(--color-accent-light)' : 'var(--color-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '1.0625rem',
                    minHeight: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{option}</span>
                  {isSelected && (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      background: 'var(--color-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: 'white'
                      }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: '16px 24px',
        background: 'var(--color-surface)'
      }}>
        <button
          onClick={handleNext}
          disabled={!isCurrentStepValid()}
          className="btn-primary w-full"
          style={{
            opacity: isCurrentStepValid() ? 1 : 0.5,
            cursor: isCurrentStepValid() ? 'pointer' : 'not-allowed'
          }}
        >
          {step < questions.length - 1 ? '다음' : '완료'}
        </button>
      </div>
    </div>
  );
}
