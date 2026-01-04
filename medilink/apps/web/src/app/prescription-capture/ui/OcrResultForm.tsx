'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';
import { Input } from '@/shared/components';
import { MedicationList } from './MedicationList';
import type { OcrResult } from '../lib/usePrescriptionCapture';

interface OcrResultFormProps {
  ocrResult: OcrResult;
  hospitalName: string;
  dispensedAt: string;
  daysSupply: number | '';
  onHospitalNameChange: (value: string) => void;
  onDispensedAtChange: (value: string) => void;
  onDaysSupplyChange: (value: number | '') => void;
}

export function OcrResultForm({
  ocrResult,
  hospitalName,
  dispensedAt,
  daysSupply,
  onHospitalNameChange,
  onDispensedAtChange,
  onDaysSupplyChange,
}: OcrResultFormProps) {
  return (
    <div>
      {/* Success Banner */}
      <div
        style={{
          padding: spacing.lg,
          borderRadius: borderRadius.md,
          background: colors.success.light,
          border: `2px solid ${colors.success.main}`,
          marginBottom: spacing.xl,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <CheckCircle className="w-6 h-6" style={{ color: colors.success.text }} />
        <div>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              color: colors.success.text,
            }}
          >
            이미지 분석 완료
          </p>
          <p style={{ fontSize: typography.fontSize.xs, color: '#047857' }}>
            처방 정보를 확인하고 병원명을 입력해주세요
          </p>
        </div>
      </div>

      {/* Hospital Name Input */}
      <div style={{ marginBottom: spacing.xl }}>
        <Input
          label="병원명"
          required
          value={hospitalName}
          onChange={(e) => onHospitalNameChange(e.target.value)}
          placeholder="병원 이름을 입력하세요"
        />
        {ocrResult.hospitalName && (
          <p
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.neutral[500],
              marginTop: spacing.xs,
            }}
          >
            AI가 추출한 병원명: <strong>{ocrResult.hospitalName}</strong>
          </p>
        )}
      </div>

      {/* Date & Days Supply */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg, marginBottom: spacing.xl }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.bold,
              color: colors.neutral[900],
              marginBottom: spacing.sm,
            }}
          >
            조제일
          </label>
          <input
            type="date"
            value={dispensedAt}
            onChange={(e) => onDispensedAtChange(e.target.value)}
            className="input-base"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: borderRadius.md,
              border: `2px solid ${colors.neutral[300]}`,
              fontSize: typography.fontSize.base,
              background: colors.white,
            }}
          />
          {ocrResult.medications?.[0]?.dispensingDate && (
            <p
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.neutral[500],
                marginTop: spacing.xs,
              }}
            >
              AI 추출: {ocrResult.medications[0].dispensingDate}
            </p>
          )}
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.bold,
              color: colors.neutral[900],
              marginBottom: spacing.sm,
            }}
          >
            복용일수
          </label>
          <input
            type="number"
            value={daysSupply}
            onChange={(e) => onDaysSupplyChange(e.target.value ? parseInt(e.target.value, 10) : '')}
            placeholder="예: 7"
            min={1}
            max={365}
            className="input-base"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: borderRadius.md,
              border: `2px solid ${colors.neutral[300]}`,
              fontSize: typography.fontSize.base,
              background: colors.white,
            }}
          />
          {ocrResult.medications?.[0]?.duration && (
            <p
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.neutral[500],
                marginTop: spacing.xs,
              }}
            >
              AI 추출: {ocrResult.medications[0].duration}
            </p>
          )}
        </div>
      </div>

      {/* Medication List */}
      {ocrResult.medications && ocrResult.medications.length > 0 && (
        <MedicationList medications={ocrResult.medications} />
      )}
    </div>
  );
}
