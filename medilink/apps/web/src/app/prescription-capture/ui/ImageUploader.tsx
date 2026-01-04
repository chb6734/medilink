'use client';

import React from 'react';
import { Camera } from 'lucide-react';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <div>
      <label
        htmlFor="image-upload"
        className="upload-zone"
        style={{
          display: 'block',
          width: '100%',
          padding: '48px 24px',
          borderRadius: borderRadius.xl,
          border: `2px dashed ${colors.neutral[300]}`,
          background: colors.white,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s',
        }}
      >
        <Camera
          className="w-16 h-16 mx-auto mb-4"
          style={{ color: colors.primary.main }}
        />
        <p
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.neutral[900],
            marginBottom: spacing.sm,
          }}
        >
          약봉지 또는 처방전 촬영
        </p>
        <p
          style={{
            fontSize: typography.fontSize.md,
            color: colors.neutral[500],
          }}
        >
          사진을 촬영하거나 갤러리에서 선택해주세요
        </p>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </label>

      <div
        style={{
          marginTop: spacing.lg,
          padding: spacing.lg,
          borderRadius: borderRadius.md,
          background: colors.warning.light,
          border: `1px solid ${colors.warning.main}`,
        }}
      >
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: '#92400E',
            lineHeight: 1.5,
          }}
        >
          <strong>촬영 팁:</strong> 약봉지나 처방전의 글씨가 선명하게
          보이도록 촬영해주세요. 조명이 밝은 곳에서 촬영하면 인식률이
          높아집니다.
        </p>
      </div>
    </div>
  );
}
