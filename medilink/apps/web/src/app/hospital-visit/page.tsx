'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authMe, getRecords } from '@/shared/api';
import { getOrCreatePatientId } from '@/entities/patient/lib/patientId';
import { ArrowLeft, Building2, Clock, FileText, Pill, Camera } from 'lucide-react';
import type { PrescriptionRecord } from '@/entities/record/model/types';
import { colors, typography, spacing, borderRadius, gradients } from '@/shared/lib/design-tokens';
import { LoadingSpinner, Button, Card } from '@/shared/components';

export default function HospitalVisitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<PrescriptionRecord[]>([]);
  const [visitType, setVisitType] = useState<'new' | 'followup' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientId = getOrCreatePatientId();
        const [me, recordsData] = await Promise.all([
          authMe(),
          getRecords({ patientId }).catch(() => ({ records: [] })),
        ]);

        if (cancelled) return;

        if (!me.user) {
          router.push('/login?returnTo=/hospital-visit');
          return;
        }

        setUser(me.user);
        setRecords(recordsData.records || []);
      } catch (e) {
        console.error('Failed to load user data:', e);
        router.push('/login?returnTo=/hospital-visit');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleContinue = () => {
    if (!visitType) return;

    const params = new URLSearchParams({ visitType });
    if (visitType === 'followup' && selectedRecord) {
      params.set('recordId', selectedRecord);
    }
    router.push(`/questionnaire?${params.toString()}`);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--gradient-card)',
          padding: '48px 24px 32px',
          borderBottomLeftRadius: borderRadius['3xl'],
          borderBottomRightRadius: borderRadius['3xl'],
          color: colors.white,
        }}
      >
        <button
          onClick={() => router.push('/')}
          className="btn-glass"
          style={{ marginBottom: spacing.lg }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 style={{ fontSize: typography.fontSize['4xl'], fontWeight: typography.fontWeight.extrabold, marginBottom: spacing.sm, color: colors.white }}>
          병원 방문
        </h1>
        <p style={{ opacity: 0.9, fontSize: typography.fontSize.md }}>
          방문 목적을 선택해주세요
        </p>
      </div>

      <div style={{ padding: spacing.xl }}>
        {/* Step 1: Visit Type Selection */}
        <div style={{ marginBottom: spacing['2xl'] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.lg, color: colors.neutral[900] }}>
            1. 방문 목적 선택
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {/* New Symptom */}
            <button
              onClick={() => {
                setVisitType('new');
                setSelectedRecord(null);
              }}
              className="option-btn"
              style={{
                background: visitType === 'new' ? gradients.success : colors.white,
                border: visitType === 'new' ? `2px solid ${colors.success.main}` : `1px solid ${colors.neutral[200]}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: visitType === 'new' ? colors.white : colors.neutral[900],
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: borderRadius.md,
                    background: visitType === 'new' ? 'rgba(255,255,255,0.2)' : gradients.success,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText className="w-6 h-6" style={{ color: colors.white }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, marginBottom: spacing.xs }}>
                    새로운 증상
                  </p>
                  <p style={{ fontSize: typography.fontSize.sm, opacity: 0.8 }}>
                    처음 겪는 증상이나 새로운 문제로 방문
                  </p>
                </div>
              </div>
            </button>

            {/* Follow-up Visit */}
            <button
              onClick={() => setVisitType('followup')}
              className="option-btn"
              style={{
                background: visitType === 'followup' ? gradients.warning : colors.white,
                border: visitType === 'followup' ? `2px solid ${colors.warning.main}` : `1px solid ${colors.neutral[200]}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: visitType === 'followup' ? colors.white : colors.neutral[900],
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: borderRadius.md,
                    background: visitType === 'followup' ? 'rgba(255,255,255,0.2)' : gradients.warning,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock className="w-6 h-6" style={{ color: colors.white }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, marginBottom: spacing.xs }}>
                    이전 처방 관련
                  </p>
                  <p style={{ fontSize: typography.fontSize.sm, opacity: 0.8 }}>
                    이전에 받은 처방과 관련된 증상으로 재방문
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Related Prescription Selection (if follow-up) */}
        {visitType === 'followup' && (
          <div style={{ marginBottom: spacing['2xl'] }}>
            <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.lg, color: colors.neutral[900] }}>
              2. 처방 정보 입력
            </h2>

            {/* Prescription Capture Button */}
            <button
              onClick={() => router.push('/prescription-capture?visitType=followup')}
              style={{
                width: '100%',
                padding: spacing.xl,
                borderRadius: borderRadius.xl,
                border: `2px solid ${colors.purple.main}`,
                background: gradients.purple,
                color: colors.white,
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: spacing.lg,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: borderRadius.md,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera className="w-6 h-6" style={{ color: colors.white }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, marginBottom: spacing.xs }}>
                    약봉지/처방전 촬영
                  </p>
                  <p style={{ fontSize: typography.fontSize.sm, opacity: 0.9 }}>
                    사진을 찍어서 처방 정보 불러오기
                  </p>
                </div>
              </div>
            </button>

            {records.length > 0 && (
              <>
                <div style={{ textAlign: 'center', margin: `${spacing.lg} 0`, color: colors.neutral[500], fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                  또는
                </div>

                <h3 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md, color: colors.neutral[500] }}>
                  이전 처방 선택 (선택사항)
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {records.slice(0, 5).map((record) => (
                    <button
                      key={record.id}
                      onClick={() => setSelectedRecord(record.id)}
                      style={{
                        background: selectedRecord === record.id ? gradients.purple : colors.white,
                        border: selectedRecord === record.id ? `2px solid ${colors.purple.main}` : `1px solid ${colors.neutral[200]}`,
                        borderRadius: borderRadius.xl,
                        padding: spacing.lg,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: selectedRecord === record.id ? colors.white : colors.neutral[900],
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: borderRadius.md,
                            background: selectedRecord === record.id ? 'rgba(255,255,255,0.2)' : gradients.purple,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Pill className="w-5 h-5" style={{ color: colors.white }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.md }}>
                            {record.prescriptionDate}
                          </p>
                          <p style={{ fontSize: typography.fontSize.sm, opacity: 0.8 }}>
                            {record.diagnosis || record.chiefComplaint || '진단 정보 없음'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Continue Button */}
        {visitType && (
          <Button variant="primary" fullWidth onClick={handleContinue}>
            문진표 작성하기
          </Button>
        )}
      </div>
    </div>
  );
}
