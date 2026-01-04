'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  AlertCircle,
  CheckCircle,
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';
import { previewOcr, createRecord } from '@/shared/api';
import { getOrCreatePatientId } from '@/entities/patient/lib/patientId';
import { LoadingSpinner } from '@/shared/components';

interface OCRMedication {
  name: string;
  dosage: string;
  frequency: string;
  confidence: number | null;
}

interface OCRResult {
  prescriptionDate?: string;
  dispensingDate?: string;
  medications: OCRMedication[];
  daysSupply?: number;
  hospitalName?: string;
  completionDate?: string;
  confidence: number | null;
}

type Step = 'upload' | 'analyzing' | 'review';

function PrescriptionCaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitType = searchParams.get('visitType') || 'followup';

  const [step, setStep] = useState<Step>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    if (step === 'review') {
      setStep('upload');
      setImagePreview(null);
      setImageFile(null);
      setOcrResult(null);
    } else {
      router.back();
    }
  };

  const formatDateForDisplay = (dateStr: string | null | undefined): string | undefined => {
    if (!dateStr) return undefined;
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.replace(/-/g, '.');
    }
    const dateMatch = dateStr.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/);
    if (dateMatch) {
      return `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
    }
    return dateStr;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setStep('analyzing');
    try {
      const preview = await previewOcr(file);

      // 날짜 추출
      const allPrescriptionDates = preview.medications
        ?.map((m) => m.prescriptionDate)
        .filter((d): d is string => !!d) || [];
      const allDispensingDates = preview.medications
        ?.map((m) => m.dispensingDate)
        .filter((d): d is string => !!d) || [];

      let prescriptionDate = allPrescriptionDates[0] || new Date().toISOString().split('T')[0];
      let dispensingDate = allDispensingDates[0];

      // 투약일수 계산
      const firstMed = preview.medications?.[0];
      const daysSupply = firstMed?.totalDoses
        ? Math.ceil(firstMed.totalDoses / (firstMed.dosesPerDay || 1))
        : undefined;

      // 복용완료일 계산
      let completionDate: string | undefined;
      const baseDate = dispensingDate || prescriptionDate;
      if (baseDate) {
        try {
          const dateStr = baseDate.replace(/\./g, '-');
          const startDate = new Date(dateStr);
          let daysToAdd = daysSupply || 0;
          if (daysToAdd === 0 && firstMed?.duration) {
            const match = firstMed.duration.match(/(\d+)/);
            if (match) daysToAdd = parseInt(match[1]) || 7;
          }
          if (daysToAdd === 0) daysToAdd = 7;
          if (!isNaN(startDate.getTime())) {
            startDate.setDate(startDate.getDate() + daysToAdd);
            completionDate = formatDateForDisplay(startDate.toISOString().split('T')[0]);
          }
        } catch {
          // ignore
        }
      }

      // 약물 목록 필터링
      const meds: OCRMedication[] = preview.medications && preview.medications.length > 0
        ? preview.medications
            .filter((m) => {
              const name = m.medicationName?.trim();
              if (!name || name.length < 2) return false;
              const excludePatterns = [
                /^(환자명|이름|성명|처방일|조제일|발행일|병원|약국|주소|전화|번호|영수증)/i,
                /^\d+$/,
                /^[가-힣]{1,2}$/,
              ];
              return !excludePatterns.some((p) => p.test(name));
            })
            .map((m) => ({
              name: m.medicationName.trim(),
              dosage: m.dose?.trim() ?? '',
              frequency: m.frequency?.trim() ?? '',
              confidence: typeof m.confidence === 'number' ? m.confidence : null,
            }))
        : [];

      const result: OCRResult = {
        prescriptionDate: formatDateForDisplay(prescriptionDate),
        dispensingDate: formatDateForDisplay(dispensingDate),
        medications: meds,
        daysSupply,
        hospitalName: preview.hospitalName || undefined,
        completionDate,
        confidence: preview.overallConfidence,
      };

      setOcrResult(result);
      setHospitalName(preview.hospitalName || '');
      setStep('review');
    } catch (e: unknown) {
      const error = e as { message?: string; status?: number; error?: string };

      if (error.message === 'unauthorized' || error.status === 401) {
        const returnTo = window.location.pathname;
        window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
        return;
      }

      if (error.error === 'invalid_medical_document' || error.message?.includes('올바른 의료 문서')) {
        alert(`${error.message || '처방전, 약봉투, 조제전이 아닌 사진입니다.'}\n\n올바른 의료 문서 사진을 선택해주세요.`);
        setStep('upload');
        setImagePreview(null);
        setImageFile(null);
        return;
      }

      // Fallback
      setOcrResult({
        medications: [{ name: '분석 실패', dosage: '', frequency: '', confidence: null }],
        prescriptionDate: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        confidence: null,
      });
      setStep('review');
    }
  };

  const handleConfirm = async () => {
    if (!imageFile || !ocrResult) return;

    setSaving(true);
    try {
      const patientId = getOrCreatePatientId();

      const finalHospitalName = hospitalName || ocrResult.hospitalName || '';

      const record = await createRecord({
        patientId,
        recordType: 'dispensing_record',
        file: imageFile,
        facilityName: finalHospitalName || undefined,
        dispensedAt: ocrResult.dispensingDate
          ? new Date(ocrResult.dispensingDate.replace(/\./g, '-')).toISOString()
          : undefined,
        daysSupply: ocrResult.daysSupply,
        medications: ocrResult.medications.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          confidence: m.confidence ?? undefined,
        })),
      });

      // Store hospital name in sessionStorage for hospital-select page
      if (finalHospitalName) {
        sessionStorage.setItem('previousHospitalName', finalHospitalName);
      }

      router.push(`/questionnaire?visitType=${visitType}&recordId=${record.id}`);
    } catch (error) {
      console.error('처방 기록 저장 실패:', error);
      alert('처방 기록 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // 분석중 화면
  if (step === 'analyzing') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ padding: '24px' }}
      >
        <div className="text-center animate-slide-up" style={{ maxWidth: '320px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 32px',
              borderRadius: '24px',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Camera className="w-10 h-10 animate-pulse" style={{ color: 'white' }} />
            <div
              style={{
                position: 'absolute',
                inset: '-8px',
                borderRadius: '28px',
                border: '3px solid var(--color-primary-light)',
                opacity: 0.3,
                animation: 'pulse 2s infinite',
              }}
            />
          </div>
          <h2 style={{ marginBottom: '16px' }}>사진 분석중</h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              lineHeight: '1.6',
              marginBottom: '32px',
            }}
          >
            약물 정보를 읽고 있어요
            <br />
            잠시만 기다려주세요
          </p>
          <div
            className="card"
            style={{
              padding: '16px',
              background: 'var(--color-primary-bg)',
              border: '2px solid #E9D5FF',
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-primary)',
                fontWeight: '600',
              }}
            >
              🔒 사진은 분석 후 즉시 삭제됩니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 확인 화면 (리뷰)
  if (step === 'review' && ocrResult) {
    return (
      <div className="min-h-screen pb-24">
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #285BAA 0%, #1e4680 100%)',
            padding: '16px 24px 24px',
            color: 'white',
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px',
          }}
        >
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              padding: '10px',
              borderRadius: '12px',
              cursor: 'pointer',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              color: 'white',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>처방전/조제내역서 확인</h2>
          <p style={{ opacity: 0.9, fontSize: '0.9375rem' }}>정보를 확인해주세요</p>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Image Preview */}
          {imagePreview && (
            <div
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '20px',
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src={imagePreview}
                alt="처방전"
                style={{ width: '100%', display: 'block' }}
              />
              <button
                onClick={handleBack}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                다시 촬영
              </button>
            </div>
          )}

          {/* Confidence Badge */}
          <div
            className="card"
            style={{
              background: (ocrResult.confidence ?? 0) >= 80 ? '#D1FAE5' : '#FEF3C7',
              border: `2px solid ${(ocrResult.confidence ?? 0) >= 80 ? '#A7F3D0' : '#FDE68A'}`,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {(ocrResult.confidence ?? 0) >= 80 ? (
              <CheckCircle className="w-6 h-6" style={{ color: '#059669', flexShrink: 0 }} />
            ) : (
              <AlertCircle className="w-6 h-6" style={{ color: '#D97706', flexShrink: 0 }} />
            )}
            <div>
              <p
                style={{
                  color: (ocrResult.confidence ?? 0) >= 80 ? '#065F46' : '#92400E',
                  fontWeight: '700',
                  marginBottom: '2px',
                }}
              >
                분석 정확도 {ocrResult.confidence ?? 0}%
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: (ocrResult.confidence ?? 0) >= 80 ? '#065F46' : '#92400E',
                  opacity: 0.8,
                }}
              >
                {(ocrResult.confidence ?? 0) >= 80 ? '정확도가 높아요' : '일부 항목을 확인해주세요'}
              </p>
            </div>
          </div>

          {/* OCR Result Fields */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              marginBottom: '20px',
            }}
          >
            {/* Medications */}
            <div className="card" style={{ background: 'rgba(168, 85, 247, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#A855F7',
                    flexShrink: 0,
                  }}
                />
                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                  확인된 약물 ({ocrResult.medications.length}개)
                </h3>
              </div>
              <div className="space-y-3">
                {ocrResult.medications.length > 0 ? (
                  ocrResult.medications.map((med, idx) => {
                    const isEditing = editingField === `medication-${idx}`;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          background: 'var(--color-background)',
                          borderRadius: '12px',
                          border: med.confidence && med.confidence < 80
                            ? '2px solid #FDE68A'
                            : '2px solid var(--color-border)',
                        }}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="text"
                                value={med.name}
                                onChange={(e) => {
                                  const updated = [...ocrResult.medications];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setOcrResult({ ...ocrResult, medications: updated });
                                }}
                                placeholder="약물명"
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  border: '2px solid var(--color-primary)',
                                  borderRadius: '8px',
                                  fontSize: '0.9375rem',
                                  fontWeight: '600',
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  const updated = [...ocrResult.medications];
                                  updated.splice(idx, 1);
                                  setOcrResult({ ...ocrResult, medications: updated });
                                  setEditingField(null);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '8px',
                                  cursor: 'pointer',
                                  color: '#EF4444',
                                }}
                              >
                                <X className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setEditingField(null)}
                                style={{
                                  background: 'var(--color-primary)',
                                  border: 'none',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  color: 'white',
                                }}
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                value={med.frequency || ''}
                                onChange={(e) => {
                                  const updated = [...ocrResult.medications];
                                  updated[idx] = { ...updated[idx], frequency: e.target.value };
                                  setOcrResult({ ...ocrResult, medications: updated });
                                }}
                                placeholder="복용방법 (예: 1일 3회)"
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  border: '2px solid var(--color-border)',
                                  borderRadius: '8px',
                                  fontSize: '0.875rem',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <p style={{ fontWeight: '700', fontSize: '1rem', flex: 1 }}>{med.name}</p>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => setEditingField(`medication-${idx}`)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '6px',
                                    cursor: 'pointer',
                                    color: 'var(--color-primary)',
                                  }}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = [...ocrResult.medications];
                                    updated.splice(idx, 1);
                                    setOcrResult({ ...ocrResult, medications: updated });
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '6px',
                                    cursor: 'pointer',
                                    color: '#EF4444',
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
                              {med.frequency && ocrResult.daysSupply
                                ? `${med.frequency} / ${ocrResult.daysSupply}일`
                                : med.frequency || (ocrResult.daysSupply ? `${ocrResult.daysSupply}일` : '투약 정보 없음')}
                            </p>
                            {med.confidence && med.confidence < 80 && (
                              <span
                                className="badge-verify"
                                style={{ fontSize: '0.6875rem', marginTop: '8px', display: 'inline-block' }}
                              >
                                확인 필요
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '20px' }}>
                    약물 정보 없음
                  </p>
                )}
              </div>
            </div>

            {/* Hospital Name */}
            <CompactOCRField
              label="처방 병원(발행기관)"
              value={hospitalName || ocrResult.hospitalName || ''}
              isEditing={editingField === 'hospitalName'}
              onEdit={() => setEditingField(editingField === 'hospitalName' ? null : 'hospitalName')}
              onChange={(val) => {
                setHospitalName(val);
                setOcrResult({ ...ocrResult, hospitalName: val });
              }}
              color="#EF4444"
              required
            />

            {/* Dispensing Date */}
            {ocrResult.dispensingDate && (
              <CompactOCRField
                label="조제일자"
                value={ocrResult.dispensingDate}
                isEditing={editingField === 'dispensingDate'}
                onEdit={() => setEditingField(editingField === 'dispensingDate' ? null : 'dispensingDate')}
                onChange={(val) => setOcrResult({ ...ocrResult, dispensingDate: val })}
                color="#F59E0B"
              />
            )}

            {/* Days Supply */}
            {ocrResult.daysSupply && (
              <CompactOCRField
                label="투약일수"
                value={`${ocrResult.daysSupply}일`}
                isEditing={editingField === 'daysSupply'}
                onEdit={() => setEditingField(editingField === 'daysSupply' ? null : 'daysSupply')}
                onChange={(val) => setOcrResult({ ...ocrResult, daysSupply: parseInt(val) || 0 })}
                color="#10B981"
              />
            )}

            {/* Completion Date */}
            {ocrResult.completionDate && (
              <CompactOCRField
                label="복용완료일"
                value={ocrResult.completionDate}
                isEditing={editingField === 'completionDate'}
                onEdit={() => setEditingField(editingField === 'completionDate' ? null : 'completionDate')}
                onChange={(val) => setOcrResult({ ...ocrResult, completionDate: val })}
                color="#6366F1"
                isLast
              />
            )}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={saving || (!hospitalName && !ocrResult.hospitalName)}
            className="btn-primary w-full"
            style={{
              opacity: saving || (!hospitalName && !ocrResult.hospitalName) ? 0.5 : 1,
              cursor: saving || (!hospitalName && !ocrResult.hospitalName) ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '저장 중...' : '확인하고 문진표 작성하기'}
          </button>
        </div>
      </div>
    );
  }

  // 업로드 화면
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #285BAA 0%, #1e4680 100%)',
          padding: '16px 24px 24px',
          color: 'white',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
        }}
      >
        <button
          onClick={handleBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            padding: '10px',
            borderRadius: '12px',
            cursor: 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            color: 'white',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 style={{ color: 'white', marginBottom: '8px' }}>처방전/약봉투 촬영</h2>
        <p style={{ opacity: 0.9, fontSize: '0.9375rem' }}>
          이전에 받은 처방전이나 약봉투를 촬영해주세요
        </p>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Upload Area */}
        <div
          style={{
            border: '3px dashed #E9D5FF',
            borderRadius: '24px',
            padding: '64px 24px',
            textAlign: 'center',
            background: 'var(--color-surface)',
          }}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <div
              style={{
                width: '88px',
                height: '88px',
                margin: '0 auto 24px',
                borderRadius: '24px',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
              }}
            >
              <Camera className="w-11 h-11" style={{ color: 'white' }} />
            </div>
            <h2 style={{ marginBottom: '12px' }}>사진 촬영하기</h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: '1.6',
                marginBottom: '28px',
              }}
            >
              처방전/약봉투 전체가 잘 보이도록
              <br />
              촬영해주세요
            </p>
            <div
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              사진 선택하기
            </div>
          </label>
        </div>

        {/* Tips Card */}
        <div
          className="card"
          style={{
            marginTop: '24px',
            background: 'var(--color-primary-bg)',
            border: '2px solid #E9D5FF',
          }}
        >
          <h3
            style={{
              marginBottom: '16px',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles className="w-5 h-5" />
            촬영 팁
          </h3>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: '0.9375rem',
              lineHeight: '1.8',
            }}
          >
            <li style={{ paddingLeft: '24px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--color-primary)' }}>•</span>
              밝은 곳에서 촬영하세요
            </li>
            <li style={{ paddingLeft: '24px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--color-primary)' }}>•</span>
              문서 전체가 보이게 찍어주세요
            </li>
            <li style={{ paddingLeft: '24px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--color-primary)' }}>•</span>
              글씨가 선명한지 확인하세요
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Compact OCR Field Component
function CompactOCRField({
  label,
  value,
  isEditing,
  onEdit,
  onChange,
  color,
  required,
  isLast,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (val: string) => void;
  color: string;
  required?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'var(--color-text-secondary)',
          minWidth: '110px',
          flexShrink: 0,
        }}
      >
        {label}
        {required && <span style={{ color: '#EF4444' }}>*</span>}
      </span>
      {isEditing ? (
        <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: `2px solid ${color}`,
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
            autoFocus
          />
          <button
            onClick={onEdit}
            style={{
              background: color,
              border: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <span
            style={{
              flex: 1,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            }}
          >
            {value || '입력해주세요'}
          </span>
          <button
            onClick={onEdit}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

export default function PrescriptionCapturePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <PrescriptionCaptureContent />
    </Suspense>
  );
}
