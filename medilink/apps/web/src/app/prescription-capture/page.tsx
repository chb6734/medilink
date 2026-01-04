'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';
import { LoadingSpinner, Button } from '@/shared/components';
import { usePrescriptionCapture } from './lib/usePrescriptionCapture';
import { PrescriptionHeader } from './ui/PrescriptionHeader';
import { ImageUploader } from './ui/ImageUploader';
import { OcrResultForm } from './ui/OcrResultForm';

function PrescriptionCaptureContent() {
  const {
    imagePreview,
    ocrLoading,
    ocrResult,
    hospitalName,
    dispensedAt,
    daysSupply,
    saving,
    setHospitalName,
    setDispensedAt,
    setDaysSupply,
    handleImageSelect,
    handleReset,
    handleConfirm,
  } = usePrescriptionCapture();

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--color-background)' }}
    >
      <PrescriptionHeader />

      <div style={{ padding: spacing.xl }}>
        {/* Image Upload Section */}
        {!imagePreview && (
          <ImageUploader onImageSelect={handleImageSelect} />
        )}

        {/* Image Preview & Results */}
        {imagePreview && (
          <div style={{ marginBottom: spacing.xl }}>
            {/* Preview Image */}
            <div style={{ position: 'relative', marginBottom: spacing.lg }}>
              <img
                src={imagePreview}
                alt="처방전 미리보기"
                style={{
                  width: '100%',
                  borderRadius: borderRadius.xl,
                  border: `2px solid ${colors.neutral[200]}`,
                }}
              />
              <button
                onClick={handleReset}
                style={{
                  position: 'absolute',
                  top: spacing.md,
                  right: spacing.md,
                  padding: `${spacing.sm} ${spacing.lg}`,
                  borderRadius: borderRadius.sm,
                  border: 'none',
                  background: 'rgba(0,0,0,0.7)',
                  color: colors.white,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: 'pointer',
                }}
              >
                다시 촬영
              </button>
            </div>

            {/* OCR Loading State */}
            {ocrLoading && (
              <div
                style={{
                  padding: spacing['2xl'],
                  textAlign: 'center',
                  borderRadius: borderRadius.xl,
                  background: colors.white,
                  border: `1px solid ${colors.neutral[200]}`,
                }}
              >
                <Loader2
                  className="w-12 h-12 animate-spin mx-auto mb-4"
                  style={{ color: colors.primary.main }}
                />
                <p
                  style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.neutral[900],
                    marginBottom: spacing.xs,
                  }}
                >
                  이미지 분석 중...
                </p>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.neutral[500] }}>
                  처방 정보를 불러오고 있습니다
                </p>
              </div>
            )}

            {/* OCR Result Form */}
            {!ocrLoading && ocrResult && (
              <OcrResultForm
                ocrResult={ocrResult}
                hospitalName={hospitalName}
                dispensedAt={dispensedAt}
                daysSupply={daysSupply}
                onHospitalNameChange={setHospitalName}
                onDispensedAtChange={setDispensedAt}
                onDaysSupplyChange={setDaysSupply}
              />
            )}
          </div>
        )}

        {/* Confirm Button */}
        {ocrResult && !ocrLoading && (
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            disabled={!hospitalName.trim() || saving}
            loading={saving}
          >
            {saving ? '저장 중...' : '확인하고 문진표 작성하기'}
          </Button>
        )}
      </div>
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
