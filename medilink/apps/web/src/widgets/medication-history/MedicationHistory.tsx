'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';
import { LoadingSpinner, EmptyState } from '@/shared/components';
import { useMedicationRecords } from './lib/useMedicationRecords';
import { MedicationHistoryHeader } from './MedicationHistoryHeader';
import { MedicationHistoryTabs, TabType } from './MedicationHistoryTabs';
import { MedicationRecordCard } from './MedicationRecordCard';

interface MedicationHistoryProps {
  onBack: () => void;
}

export function MedicationHistory({ onBack }: MedicationHistoryProps) {
  const {
    activeRecords,
    completedRecords,
    loading,
    loadRecords,
    handleDeleteRecord,
  } = useMedicationRecords();

  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [adherenceRefreshKey, setAdherenceRefreshKey] = useState(0);

  const displayRecords = selectedTab === 'active' ? activeRecords : completedRecords;

  const handleCheckUpdate = () => {
    loadRecords();
    setAdherenceRefreshKey((prev) => prev + 1);
  };

  const handleDelete = async (recordId: string) => {
    const result = await handleDeleteRecord(recordId);
    if (result.ok) {
      setExpandedRecord(null);
    } else {
      alert(`처방 삭제에 실패했습니다: ${result.reason}`);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-background)' }}>
      <MedicationHistoryHeader
        onBack={onBack}
        activeCount={activeRecords.length}
        completedCount={completedRecords.length}
      />

      <div style={{ padding: spacing.xl }}>
        <MedicationHistoryTabs
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
        />

        {displayRecords.length === 0 ? (
          <EmptyState
            icon={<Calendar style={{ width: '64px', height: '64px', color: colors.neutral[400] }} />}
            title={selectedTab === 'active' ? '진행 중인 처방이 없습니다' : '완료된 처방이 없습니다'}
            description={selectedTab === 'active' ? '새로운 처방을 추가해보세요' : '처방이 완료되면 여기에 표시됩니다'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            {displayRecords.map((record) => (
              <MedicationRecordCard
                key={record.id}
                record={record}
                isExpanded={expandedRecord === record.id}
                onToggle={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                onDelete={() => handleDelete(record.id)}
                onCheckUpdate={handleCheckUpdate}
                adherenceRefreshKey={adherenceRefreshKey}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
