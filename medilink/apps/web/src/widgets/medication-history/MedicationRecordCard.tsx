'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import type { PrescriptionRecord } from '@/entities/record/model/types';
import { colors, typography, spacing, borderRadius, gradients } from '@/shared/lib/design-tokens';
import { formatDate } from '@/shared/lib/format';
import { Badge, Button } from '@/shared/components';
import { AdherenceChart } from '@/features/adherence';
import { MedicationCheckList } from '@/features/medication-check';
import { updateMedItem } from '@/shared/api';

interface MedicationRecordCardProps {
  record: PrescriptionRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => Promise<void>;
  onCheckUpdate: () => void;
  adherenceRefreshKey: number;
}

export function MedicationRecordCard({
  record,
  isExpanded,
  onToggle,
  onDelete,
  onCheckUpdate,
  adherenceRefreshKey,
}: MedicationRecordCardProps) {
  const router = useRouter();

  // 인라인 편집 상태
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDosage, setEditDosage] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async () => {
    if (confirm('정말 이 처방을 삭제하시겠습니까?')) {
      await onDelete();
    }
  };

  const startEditing = (med: { id: string; name: string; dosage: string; frequency: string }) => {
    setEditingMedId(med.id);
    setEditName(med.name);
    setEditDosage(med.dosage);
    setEditFrequency(med.frequency);
  };

  const cancelEditing = () => {
    setEditingMedId(null);
    setEditName('');
    setEditDosage('');
    setEditFrequency('');
  };

  const saveEditing = async () => {
    if (!editingMedId) return;

    setIsSaving(true);
    try {
      await updateMedItem({
        medItemId: editingMedId,
        nameRaw: editName || undefined,
        dose: editDosage || undefined,
        frequency: editFrequency || undefined,
      });

      // 성공 시 상태 업데이트 (부모 컴포넌트에 알림)
      onCheckUpdate(); // 데이터 새로고침 트리거
      cancelEditing();
    } catch (error) {
      console.error('약물 수정 실패:', error);
      alert('약물 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        background: colors.white,
        borderRadius: borderRadius['2xl'],
        border: `2px solid ${colors.neutral[200]}`,
        overflow: 'hidden',
      }}
    >
      {/* Card Header (Clickable) */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: spacing.xl,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: borderRadius.lg,
              background: gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Pill className="w-6 h-6" style={{ color: colors.white }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
              {record.hospitalName || record.pharmacyName || '병원/약국'}
            </p>
            <p style={{ fontSize: typography.fontSize.base, color: colors.neutral[500] }}>
              {formatDate(record.prescriptionDate)} · {record.daysSupply}일분
            </p>
          </div>
        </div>

        {/* Medication Tags */}
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
          {record.medications.slice(0, 3).map((med, idx) => (
            <Badge key={idx} variant="default">
              {med.name}
            </Badge>
          ))}
          {record.medications.length > 3 && (
            <Badge variant="default">
              +{record.medications.length - 3}
            </Badge>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: `0 ${spacing.xl} ${spacing.xl}`, borderTop: `1px solid ${colors.neutral[200]}`, paddingTop: spacing.xl }}>
          {/* 순응도 그래프 */}
          <div style={{ marginBottom: spacing['2xl'] }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.lg }}>
              복약 순응도
            </h3>
            <AdherenceChart recordId={record.id} refreshKey={adherenceRefreshKey} />
          </div>

          {/* 처방 정보 수정/삭제 버튼 */}
          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing['2xl'] }}>
            <Button
              variant="secondary"
              onClick={() => router.push(`/medication-history/${record.id}/edit`)}
              leftIcon={<Edit2 className="w-4 h-4" />}
              style={{ flex: 1 }}
            >
              처방 수정
            </Button>
            <button
              onClick={handleDelete}
              style={{
                padding: '14px',
                borderRadius: borderRadius.md,
                border: `2px solid ${colors.error.main}`,
                background: colors.white,
                color: colors.error.main,
                fontWeight: typography.fontWeight.bold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* 복약 체크 */}
          <div style={{ marginBottom: spacing['2xl'] }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
              복약 체크
            </h3>
            <MedicationCheckList
              recordId={record.id}
              onCheckUpdate={onCheckUpdate}
            />
          </div>

          {/* 약물 목록 */}
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
              처방 약물
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {record.medications.map((med) => (
                <div
                  key={med.id}
                  style={{
                    padding: spacing.lg,
                    background: colors.neutral[50],
                    borderRadius: borderRadius.md,
                    border: `1px solid ${editingMedId === med.id ? colors.primary.main : colors.neutral[200]}`,
                  }}
                >
                  {editingMedId === med.id ? (
                    // 편집 모드
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                      <div>
                        <label style={{ fontSize: typography.fontSize.sm, color: colors.neutral[500], marginBottom: spacing.xs, display: 'block' }}>
                          약물명
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={isSaving}
                          style={{
                            width: '100%',
                            padding: spacing.sm,
                            borderRadius: borderRadius.md,
                            border: `1px solid ${colors.neutral[300]}`,
                            fontSize: typography.fontSize.base,
                            outline: 'none',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = colors.primary.main)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = colors.neutral[300])}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm }}>
                        <div>
                          <label style={{ fontSize: typography.fontSize.sm, color: colors.neutral[500], marginBottom: spacing.xs, display: 'block' }}>
                            용량
                          </label>
                          <input
                            type="text"
                            value={editDosage}
                            onChange={(e) => setEditDosage(e.target.value)}
                            disabled={isSaving}
                            placeholder="예: 500mg"
                            style={{
                              width: '100%',
                              padding: spacing.sm,
                              borderRadius: borderRadius.md,
                              border: `1px solid ${colors.neutral[300]}`,
                              fontSize: typography.fontSize.base,
                              outline: 'none',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = colors.primary.main)}
                            onBlur={(e) => (e.currentTarget.style.borderColor = colors.neutral[300])}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: typography.fontSize.sm, color: colors.neutral[500], marginBottom: spacing.xs, display: 'block' }}>
                            복용법
                          </label>
                          <input
                            type="text"
                            value={editFrequency}
                            onChange={(e) => setEditFrequency(e.target.value)}
                            disabled={isSaving}
                            placeholder="예: 1일 3회"
                            style={{
                              width: '100%',
                              padding: spacing.sm,
                              borderRadius: borderRadius.md,
                              border: `1px solid ${colors.neutral[300]}`,
                              fontSize: typography.fontSize.base,
                              outline: 'none',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = colors.primary.main)}
                            onBlur={(e) => (e.currentTarget.style.borderColor = colors.neutral[300])}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                        <button
                          onClick={cancelEditing}
                          disabled={isSaving}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.xs,
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: borderRadius.md,
                            border: `1px solid ${colors.neutral[300]}`,
                            background: colors.white,
                            color: colors.neutral[600],
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.medium,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <X className="w-4 h-4" />
                          취소
                        </button>
                        <button
                          onClick={saveEditing}
                          disabled={isSaving}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.xs,
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: borderRadius.md,
                            border: 'none',
                            background: isSaving ? colors.neutral[400] : colors.primary.main,
                            color: colors.white,
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.medium,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          {isSaving ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 표시 모드
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                        <p style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, flex: 1 }}>{med.name}</p>
                        <button
                          onClick={() => startEditing(med)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: colors.primary.main,
                            cursor: 'pointer',
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.semibold,
                            padding: `${spacing.xs} ${spacing.sm}`,
                          }}
                        >
                          수정
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: spacing.lg, fontSize: typography.fontSize.base, color: colors.neutral[500] }}>
                        <span>💊 {med.dosage}</span>
                        <span>🕐 {med.frequency}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
