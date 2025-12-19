import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Clock, Pill, User, FileText } from 'lucide-react';
import { PrescriptionRecord, QuestionnaireData } from '../App';

interface DoctorViewProps {
  records: PrescriptionRecord[];
  questionnaireData: QuestionnaireData | null;
}

export function DoctorView({ records, questionnaireData }: DoctorViewProps) {
  const [timelineDays, setTimelineDays] = useState<30 | 90>(90);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isSectionExpanded = (section: string) => expandedSections.has(section);

  // Filter records based on timeline
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timelineDays);
  const filteredRecords = records.filter(r => new Date(r.prescriptionDate) >= cutoffDate);

  // Check for items needing verification
  const needsVerification = filteredRecords.some(r => 
    r.ocrConfidence && r.ocrConfidence < 80 || 
    r.medications.some(m => m.confidence && m.confidence < 80)
  );

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-accent)',
        color: 'white',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FileText className="w-6 h-6" />
            <h1 style={{ color: 'white' }}>환자 진료 요약</h1>
          </div>
          <p style={{ opacity: 0.9, fontSize: '0.9375rem' }}>
            연속진료를 위한 1장 요약
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <div className="space-y-4">
          {/* Verification Alert */}
          {needsVerification && (
            <div style={{
              padding: '16px 20px',
              background: 'var(--color-verify-bg)',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertCircle className="w-5 h-5" style={{ color: '#92400E', flexShrink: 0 }} />
              <p style={{ color: '#92400E', fontSize: '0.9375rem' }}>
                일부 항목은 환자와 확인이 필요합니다
              </p>
            </div>
          )}

          {/* Timeline Toggle */}
          <div className="card" style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: 'var(--color-text-primary)' }}>약력 조회 기간</span>
            <div style={{
              display: 'flex',
              background: 'var(--color-background)',
              borderRadius: '8px',
              padding: '4px',
              gap: '4px'
            }}>
              <button
                onClick={() => setTimelineDays(30)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: timelineDays === 30 ? 'var(--color-accent)' : 'transparent',
                  color: timelineDays === 30 ? 'white' : 'var(--color-text-primary)',
                  fontWeight: timelineDays === 30 ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                30일
              </button>
              <button
                onClick={() => setTimelineDays(90)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: timelineDays === 90 ? 'var(--color-accent)' : 'transparent',
                  color: timelineDays === 90 ? 'white' : 'var(--color-text-primary)',
                  fontWeight: timelineDays === 90 ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                90일
              </button>
            </div>
          </div>

          {/* Patient Info */}
          {questionnaireData && (
            <div className="card" style={{
              padding: '20px',
              borderLeft: '4px solid var(--color-accent)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <User className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <h3>환자 정보</h3>
              </div>
              <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: '600' }}>
                  {questionnaireData.hospitalName}
                </span> 방문 예정
              </div>
            </div>
          )}

          {/* Chief Complaint */}
          {questionnaireData && (
            <SummaryCard
              title="주요 증상"
              icon={<AlertCircle className="w-5 h-5" style={{ color: '#DC2626' }} />}
              expanded={isSectionExpanded('complaint')}
              onToggle={() => toggleSection('complaint')}
              summary={questionnaireData.chiefComplaint}
              alert
            >
              <div className="space-y-3" style={{ fontSize: '0.9375rem' }}>
                <InfoRow label="증상 시작" value={questionnaireData.symptomStart} />
                <InfoRow label="증상 경과" value={questionnaireData.symptomProgress} />
              </div>
            </SummaryCard>
          )}

          {/* Medication Timeline */}
          <SummaryCard
            title={`약력 타임라인 (최근 ${timelineDays}일)`}
            icon={<Pill className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />}
            expanded={isSectionExpanded('medications')}
            onToggle={() => toggleSection('medications')}
            summary={`${filteredRecords.length}건의 처방 기록`}
          >
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div key={record.id} style={{
                  padding: '16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  background: 'var(--color-background)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9375rem' }}>
                        {record.hospitalName || record.pharmacyName || '병원/약국'}
                      </p>
                      <p style={{ 
                        fontSize: '0.875rem',
                        color: 'var(--color-text-tertiary)',
                        marginTop: '2px'
                      }}>
                        {record.prescriptionDate}
                      </p>
                    </div>
                    {record.ocrConfidence && record.ocrConfidence < 80 && (
                      <span className="badge-verify">
                        <AlertCircle className="w-3 h-3" />
                        확인 필요
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {record.medications.map((med) => (
                      <div key={med.id} style={{
                        padding: '12px',
                        background: 'var(--color-surface)',
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '6px'
                        }}>
                          <p style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{med.name}</p>
                          {med.confidence && med.confidence < 80 && (
                            <span className="badge-verify">
                              <AlertCircle className="w-3 h-3" />
                              {med.confidence}%
                            </span>
                          )}
                        </div>
                        <p style={{ 
                          fontSize: '0.875rem',
                          color: 'var(--color-text-secondary)'
                        }}>
                          {med.dosage} · {med.frequency}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <p style={{
                  textAlign: 'center',
                  padding: '32px',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.9375rem'
                }}>
                  최근 {timelineDays}일 내 처방 기록이 없습니다
                </p>
              )}
            </div>
          </SummaryCard>

          {/* Compliance */}
          {questionnaireData && (
            <SummaryCard
              title="복약 순응도"
              icon={<Clock className="w-5 h-5" style={{ color: '#059669' }} />}
              expanded={isSectionExpanded('compliance')}
              onToggle={() => toggleSection('compliance')}
              summary={questionnaireData.medicationCompliance}
            >
              <div className="space-y-3" style={{ fontSize: '0.9375rem' }}>
                <InfoRow 
                  label="부작용" 
                  value={questionnaireData.sideEffects}
                  highlight={questionnaireData.sideEffects !== '없음'}
                />
              </div>
            </SummaryCard>
          )}

          {/* Allergies */}
          {questionnaireData && questionnaireData.allergies && (
            <SummaryCard
              title="알레르기 정보"
              icon={<AlertCircle className="w-5 h-5" style={{ color: '#DC2626' }} />}
              expanded={isSectionExpanded('allergies')}
              onToggle={() => toggleSection('allergies')}
              summary={questionnaireData.allergies}
              alert={questionnaireData.allergies !== '없음'}
            />
          )}

          {/* Patient Notes - 특별 강조 */}
          {questionnaireData && questionnaireData.patientNotes && (
            <div style={{
              padding: '20px',
              background: 'var(--color-verify-bg)',
              border: '2px solid #FDE68A',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <User className="w-5 h-5" style={{ 
                  color: '#92400E',
                  marginTop: '2px',
                  flexShrink: 0 
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    fontWeight: '600',
                    color: '#92400E',
                    marginBottom: '8px'
                  }}>
                    환자 메모
                  </p>
                  <p style={{ 
                    color: '#92400E',
                    fontSize: '0.9375rem',
                    lineHeight: '1.5',
                    marginBottom: '12px'
                  }}>
                    {questionnaireData.patientNotes}
                  </p>
                  <p style={{ 
                    fontSize: '0.875rem',
                    color: '#78350F'
                  }}>
                    ⚠️ 환자가 직접 작성한 내용입니다
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: 'var(--color-background)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--color-text-tertiary)',
              lineHeight: '1.5'
            }}>
              본 정보는 환자가 제공한 자료를 기반으로 구성되었습니다.<br />
              진료 시 환자와 직접 확인하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  icon: React.ReactNode;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  alert?: boolean;
}

function SummaryCard({ title, icon, summary, expanded, onToggle, children, alert }: SummaryCardProps) {
  return (
    <div className="card" style={{
      padding: 0,
      overflow: 'hidden',
      border: alert ? '2px solid #FEE2E2' : '1px solid var(--color-border)',
      background: alert ? '#FEF2F2' : 'var(--color-surface)'
    }}>
      <button
        onClick={onToggle}
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
        <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
          {icon}
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: expanded ? 0 : '8px' }}>{title}</h3>
            {!expanded && (
              <p style={{ 
                color: 'var(--color-text-secondary)',
                fontSize: '0.9375rem',
                lineHeight: '1.5'
              }}>
                {summary}
              </p>
            )}
          </div>
        </div>
        {expanded ? (
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
      {expanded && children && (
        <div style={{
          padding: '0 20px 20px',
          borderTop: '1px solid var(--color-border)'
        }}>
          <div style={{ paddingTop: '16px' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingBottom: '12px',
      borderBottom: '1px solid var(--color-border)'
    }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{
        textAlign: 'right',
        maxWidth: '60%',
        color: highlight ? '#DC2626' : 'var(--color-text-primary)',
        fontWeight: highlight ? '600' : '400'
      }}>
        {value}
      </span>
    </div>
  );
}
