'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getRecords, deleteRecord } from '@/shared/api';
import type { PrescriptionRecord } from '@/entities/record/model/types';
import { getOrCreatePatientId } from '@/entities/patient/lib/patientId';

interface UseMedicationRecordsReturn {
  records: PrescriptionRecord[];
  activeRecords: PrescriptionRecord[];
  completedRecords: PrescriptionRecord[];
  loading: boolean;
  loadRecords: () => Promise<void>;
  handleDeleteRecord: (recordId: string) => Promise<boolean>;
}

export function useMedicationRecords(): UseMedicationRecordsReturn {
  const router = useRouter();
  const [records, setRecords] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      const patientId = getOrCreatePatientId();
      const data = await getRecords({ patientId });
      setRecords(data.records);
    } catch (e: any) {
      console.error('복약 기록 로드 실패:', e);
      if (e.message === 'unauthorized' || e.status === 401) {
        const returnTo = window.location.pathname;
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleDeleteRecord = useCallback(async (recordId: string): Promise<boolean> => {
    try {
      await deleteRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      return true;
    } catch (error) {
      console.error('처방 삭제 실패:', error);
      return false;
    }
  }, []);

  // 진행 중인 처방과 완료된 처방 분리
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeRecords = records.filter((record) => {
    if (!record.daysSupply || !record.prescriptionDate) return false;
    const endDate = new Date(record.prescriptionDate);
    endDate.setDate(endDate.getDate() + record.daysSupply);
    return endDate >= today;
  });

  const completedRecords = records.filter((record) => {
    if (!record.daysSupply || !record.prescriptionDate) return false;
    const endDate = new Date(record.prescriptionDate);
    endDate.setDate(endDate.getDate() + record.daysSupply);
    return endDate < today;
  });

  return {
    records,
    activeRecords,
    completedRecords,
    loading,
    loadRecords,
    handleDeleteRecord,
  };
}
