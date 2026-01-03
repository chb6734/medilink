'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';
import { SYMPTOM_OPTIONS, SYMPTOM_START_OPTIONS } from '../lib/steps';

interface SymptomStepProps {
  chiefComplaint: string;
  symptomDetail: string;
  symptomStart: string;
  onChiefComplaintChange: (value: string) => void;
  onSymptomDetailChange: (value: string) => void;
  onSymptomStartChange: (value: string) => void;
}

export function SymptomStep({
  chiefComplaint,
  symptomDetail,
  symptomStart,
  onChiefComplaintChange,
  onSymptomDetailChange,
  onSymptomStartChange,
}: SymptomStepProps) {
  return (
    <>
      <h1
        style={{
          marginBottom: '6px',
          fontSize: typography.fontSize['5xl'],
          fontWeight: typography.fontWeight.extrabold,
          letterSpacing: '-0.02em',
          color: '#222222',
        }}
      >
        방문 사유
      </h1>
      <p
        style={{
          color: colors.neutral[500],
          marginBottom: '18px',
          lineHeight: 1.5,
        }}
      >
        오늘 방문하신 이유를 알려주세요
      </p>

      {/* 주요 증상 */}
      <div style={{ marginBottom: spacing.lg }}>
        <div className="label-with-icon" style={{ color: colors.neutral[500] }}>
          주요 증상
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={chiefComplaint}
            onChange={(e) => onChiefComplaintChange(e.target.value)}
            className="input-base"
            style={{
              appearance: 'none',
              paddingRight: '44px',
              fontSize: typography.fontSize.xl,
              borderRadius: borderRadius.lg,
            }}
          >
            <option value="" disabled>
              증상을 선택하세요
            </option>
            {SYMPTOM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <ChevronDown
            className="w-5 h-5"
            style={{
              position: 'absolute',
              right: '14px',
              top: '14px',
              color: colors.neutral[400],
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* 증상 상세 */}
      <div style={{ marginBottom: spacing.lg }}>
        <div className="label-with-icon" style={{ color: colors.neutral[500] }}>
          증상 상세 (선택)
        </div>
        <textarea
          value={symptomDetail}
          onChange={(e) => onSymptomDetailChange(e.target.value)}
          placeholder="증상에 대해 더 자세히 설명해주세요"
          rows={4}
          className="textarea-base"
        />
      </div>

      {/* 증상 시작 시점 */}
      <div>
        <div className="label-with-icon" style={{ color: colors.neutral[500] }}>
          언제부터 증상이 시작되었나요?
        </div>
        <input
          value={symptomStart}
          onChange={(e) => onSymptomStartChange(e.target.value)}
          placeholder="예: 3일 전, 지난주 월요일, 2주 전"
          className="input-base"
          style={{
            fontSize: typography.fontSize.xl,
            borderRadius: borderRadius.lg,
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            flexWrap: 'wrap',
            marginTop: '10px',
          }}
        >
          {SYMPTOM_START_OPTIONS.map((t) => {
            const selected = symptomStart === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onSymptomStartChange(t)}
                className={`time-chip ${selected ? 'time-chip--selected' : ''}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
