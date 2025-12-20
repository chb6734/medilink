import { useState } from 'react';
import { ArrowLeft, Calendar, Pill, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { PrescriptionRecord } from '@/entities/record/model/types';

interface MedicationHistoryProps {
  records: PrescriptionRecord[];
  onBack: () => void;
}

export function MedicationHistory({ records, onBack }: MedicationHistoryProps) {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  const toggleRecord = (id: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecords(newExpanded);
  };

  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime()
  );

  const groupedRecords = sortedRecords.reduce((acc, record) => {
    const date = new Date(record.prescriptionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(record);
    return acc;
  }, {} as Record<string, PrescriptionRecord[]>);

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${year}년 ${month}월`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--color-border)',
        padding: '16px 24px',
        background: 'var(--color-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            marginLeft: '-8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-text-primary)'
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>복약 기록</span>
        </button>
      </div>

      <div className="px-6 py-6">
        {/* Summary Card */}
        {records.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, #6366F1 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '4px' }}>
                  전체 처방 기록
                </p>
                <p style={{ fontSize: '2rem', fontWeight: '700' }}>
                  {records.length}건
                </p>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '10px',
                padding: '12px'
              }}>
                <p style={{ opacity: 0.9, fontSize: '0.75rem', marginBottom: '4px' }}>
                  총 약물 수
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                  {records.reduce((sum, r) => sum + r.medications.length, 0)}개
                </p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '10px',
                padding: '12px'
              }}>
                <p style={{ opacity: 0.9, fontSize: '0.75rem', marginBottom: '4px' }}>
                  최근 기록
                </p>
                <p style={{ fontSize: '0.9375rem', fontWeight: '600' }}>
                  {formatDate(sortedRecords[0].prescriptionDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Records by Month */}
        {records.length === 0 ? (
          <div className="card" style={{
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              background: 'var(--color-background)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar className="w-8 h-8" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <h3 style={{ marginBottom: '8px' }}>처방 기록이 없습니다</h3>
            <p style={{ 
              color: 'var(--color-text-secondary)',
              fontSize: '0.9375rem'
            }}>
              조제내역서를 촬영하여<br />첫 기록을 추가해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedRecords).sort().reverse().map((monthKey) => (
              <div key={monthKey}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
                  <h3 style={{ fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                    {formatMonthYear(monthKey)}
                  </h3>
                  <span style={{ 
                    fontSize: '0.875rem',
                    color: 'var(--color-text-tertiary)'
                  }}>
                    ({groupedRecords[monthKey].length}건)
                  </span>
                </div>

                <div className="space-y-3">
                  {groupedRecords[monthKey].map((record) => {
                    const isExpanded = expandedRecords.has(record.id);
                    const totalMeds = record.medications.length;

                    return (
                      <div key={record.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <button
                          onClick={() => toggleRecord(record.id)}
                          style={{
                            width: '100%',
                            padding: '20px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            textAlign: 'left',
                            gap: '16px'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '6px',
                              flexWrap: 'wrap'
                            }}>
                              <p style={{ fontWeight: '600', fontSize: '1rem' }}>
                                {record.hospitalName || record.pharmacyName || '병원/약국'}
                              </p>
                              {record.ocrConfidence && record.ocrConfidence < 80 && (
                                <span className="badge-verify">
                                  <AlertCircle className="w-3 h-3" />
                                  확인 필요
                                </span>
                              )}
                            </div>
                            <p style={{ 
                              fontSize: '0.875rem',
                              color: 'var(--color-text-secondary)',
                              marginBottom: '8px'
                            }}>
                              {formatDate(record.prescriptionDate)}
                            </p>
                            {record.chiefComplaint && (
                              <p style={{ 
                                fontSize: '0.875rem',
                                color: 'var(--color-text-tertiary)'
                              }}>
                                증상: {record.chiefComplaint}
                              </p>
                            )}
                            {!isExpanded && (
                              <p style={{ 
                                marginTop: '12px',
                                color: 'var(--color-accent)',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                              }}>
                                약물 {totalMeds}개
                              </p>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" style={{ 
                              color: 'var(--color-text-tertiary)',
                              flexShrink: 0,
                              marginTop: '2px'
                            }} />
                          ) : (
                            <ChevronDown className="w-5 h-5" style={{ 
                              color: 'var(--color-text-tertiary)',
                              flexShrink: 0,
                              marginTop: '2px'
                            }} />
                          )}
                        </button>

                        {isExpanded && (
                          <div style={{
                            padding: '0 20px 20px',
                            borderTop: '1px solid var(--color-border)'
                          }}>
                            {record.diagnosis && (
                              <div style={{
                                marginTop: '16px',
                                marginBottom: '16px',
                                padding: '12px 16px',
                                background: 'var(--color-accent-light)',
                                borderRadius: '10px'
                              }}>
                                <p style={{ 
                                  fontSize: '0.75rem',
                                  color: '#4338CA',
                                  marginBottom: '4px'
                                }}>
                                  진단명
                                </p>
                                <p style={{ 
                                  fontSize: '0.9375rem',
                                  color: '#4338CA',
                                  fontWeight: '600'
                                }}>
                                  {record.diagnosis}
                                </p>
                              </div>
                            )}
                            
                            <div className="space-y-2" style={{ marginTop: '16px' }}>
                              <p style={{ 
                                fontSize: '0.875rem',
                                color: 'var(--color-text-secondary)',
                                fontWeight: '600',
                                marginBottom: '8px'
                              }}>
                                처방 약물
                              </p>
                              {record.medications.map((med) => (
                                <div key={med.id} style={{
                                  padding: '14px',
                                  background: 'var(--color-background)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--color-border)'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '8px'
                                  }}>
                                    <p style={{ fontWeight: '600', fontSize: '0.9375rem' }}>
                                      {med.name}
                                    </p>
                                    {med.confidence && med.confidence < 80 && (
                                      <span className="badge-verify">
                                        {med.confidence}%
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ 
                                    fontSize: '0.875rem',
                                    color: 'var(--color-text-secondary)',
                                    marginBottom: '4px'
                                  }}>
                                    {med.dosage}
                                  </p>
                                  <p style={{ 
                                    fontSize: '0.875rem',
                                    color: 'var(--color-text-tertiary)'
                                  }}>
                                    {med.frequency}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
