'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { previewOcr, createRecord } from '@/shared/api';
import { getOrCreatePatientId } from '@/entities/patient/lib/patientId';

export interface OcrMedication {
  medicationName: string;
  dose?: string | null;
  frequency?: string | null;
  dispensingDate?: string | null;
  duration?: string | null;
  dosesPerDay?: number | null;
  totalDoses?: number | null;
  confidence?: number;
}

export interface OcrResult {
  hospitalName?: string | null;
  medications?: OcrMedication[] | null;
}

interface UsePrescriptionCaptureReturn {
  visitType: string;
  imageFile: File | null;
  imagePreview: string;
  ocrLoading: boolean;
  ocrResult: OcrResult | null;
  hospitalName: string;
  dispensedAt: string;
  daysSupply: number | '';
  saving: boolean;
  setHospitalName: (name: string) => void;
  setDispensedAt: (date: string) => void;
  setDaysSupply: (days: number | '') => void;
  handleImageSelect: (file: File) => Promise<void>;
  handleReset: () => void;
  handleConfirm: () => Promise<void>;
}

export function usePrescriptionCapture(): UsePrescriptionCaptureReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitType = searchParams.get('visitType') || 'followup';

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [dispensedAt, setDispensedAt] = useState('');
  const [daysSupply, setDaysSupply] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const extractDateAndDays = (result: OcrResult) => {
    const firstMed = result.medications?.[0];
    if (firstMed?.dispensingDate) {
      const dateStr = firstMed.dispensingDate;
      if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        setDispensedAt(dateStr.slice(0, 10));
      }
    }

    if (firstMed?.duration) {
      const match = firstMed.duration.match(/(\d+)/);
      if (match) {
        setDaysSupply(parseInt(match[1], 10));
      }
    } else if (firstMed?.dosesPerDay && firstMed?.totalDoses) {
      const days = Math.ceil(firstMed.totalDoses / firstMed.dosesPerDay);
      setDaysSupply(days);
    }
  };

  const handleImageSelect = async (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrResult(null);
    setHospitalName('');
    setDispensedAt('');
    setDaysSupply('');

    setOcrLoading(true);
    try {
      const result = await previewOcr(file);
      setOcrResult(result);
      setHospitalName(result.hospitalName || '');
      extractDateAndDays(result);
    } catch (error) {
      console.error('OCR 분석 실패:', error);
      alert('이미지 분석에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleReset = () => {
    setImagePreview('');
    setImageFile(null);
    setOcrResult(null);
    setHospitalName('');
    setDispensedAt('');
    setDaysSupply('');
  };

  const handleConfirm = async () => {
    if (!imageFile || !ocrResult) {
      alert('이미지를 먼저 업로드해주세요.');
      return;
    }

    if (!hospitalName.trim()) {
      alert('병원명을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const patientId = getOrCreatePatientId();

      const record = await createRecord({
        patientId,
        recordType: 'dispensing_record',
        file: imageFile,
        facilityName: hospitalName,
        dispensedAt: dispensedAt || undefined,
        daysSupply: typeof daysSupply === 'number' ? daysSupply : undefined,
        medications: ocrResult.medications?.map((m) => ({
          name: m.medicationName,
          dosage: m.dose ?? undefined,
          frequency: m.frequency ?? undefined,
          confidence: m.confidence,
        })),
      });

      router.push(`/questionnaire?visitType=${visitType}&recordId=${record.id}`);
    } catch (error) {
      console.error('처방 기록 저장 실패:', error);
      alert('처방 기록 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return {
    visitType,
    imageFile,
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
  };
}
