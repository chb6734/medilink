'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getRecords, deleteRecord } from '@/shared/api';
import type { PrescriptionRecord } from '@/entities/record/model/types';
import { getOrCreatePatientId } from '@/entities/patient/lib/patientId';
import {
  type OperationResult,
  success,
  failure,
  isApiError,
  getErrorMessage,
} from '@/shared/lib/error';

/**
 * Return type for the useMedicationRecords hook
 *
 * Design Principle: Predictability
 * - handleDeleteRecord returns OperationResult discriminated union
 * - This provides consistent error handling with semantic meaning
 */
interface UseMedicationRecordsReturn {
  records: PrescriptionRecord[];
  activeRecords: PrescriptionRecord[];
  completedRecords: PrescriptionRecord[];
  loading: boolean;
  loadRecords: () => Promise<void>;
  handleDeleteRecord: (recordId: string) => Promise<OperationResult<void>>;
}

/**
 * Custom hook for managing medication records
 *
 * Design Principles Applied:
 * - Predictability: Uses OperationResult discriminated union for handleDeleteRecord
 * - Readability: Clear separation between active and completed records
 * - Coupling: Uses isApiError helper from shared lib for type-safe error checking
 */
export function useMedicationRecords(): UseMedicationRecordsReturn {
  const router = useRouter();
  const [records, setRecords] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      const patientId = getOrCreatePatientId();
      const data = await getRecords({ patientId });
      setRecords(data.records);
    } catch (e: unknown) {
      console.error('Failed to load medication records:', e);

      // Type-safe error handling using isApiError helper
      const isUnauthorized =
        isApiError(e) && (e.message === 'unauthorized' || e.status === 401);

      if (isUnauthorized) {
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

  /**
   * Delete a medication record
   *
   * Uses OperationResult discriminated union for predictable error handling.
   * Callers can use pattern matching on the `ok` property:
   *
   * @example
   * const result = await handleDeleteRecord(id);
   * if (result.ok) {
   *   // Success case
   * } else {
   *   showError(result.reason);
   * }
   */
  const handleDeleteRecord = useCallback(
    async (recordId: string): Promise<OperationResult<void>> => {
      try {
        await deleteRecord(recordId);
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
        return success(undefined);
      } catch (error) {
        console.error('Failed to delete prescription:', error);
        return failure(getErrorMessage(error));
      }
    },
    []
  );

  // Separate active and completed prescriptions
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
