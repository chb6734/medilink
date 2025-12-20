import { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import type { PrescriptionRecord } from '@/entities/record/model/types';

interface FirstResultProps {
  record: PrescriptionRecord;
  onContinue: () => void;
}

export function FirstResult({ record, onContinue }: FirstResultProps) {
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const handleEnableReminder = () => {
    setReminderEnabled(true);
  };

  const activeMedications = record.medications.slice(0, 3);
  const hasMore = record.medications.length > 3;

  if (reminderEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: '24px' }}>
        <div className="text-center animate-slide-up" style={{ maxWidth: '360px' }}>
          <div style={{
            width: '96px',
            height: '96px',
            margin: '0 auto 32px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
            position: 'relative'
          }}>
            <CheckCircle className="w-12 h-12" style={{ color: 'white' }} />
            <div style={{
              position: 'absolute',
              inset: '-12px',
              borderRadius: '32px',
              border: '4px solid #6EE7B7',
              opacity: 0.3
            }} />
          </div>
          
          <h1 style={{ marginBottom: '16px' }}>설정 완료!</h1>
          <p style={{ 
            color: 'var(--color-text-secondary)',
            lineHeight: '1.6',
            marginBottom: '40px',
            fontSize: '1.0625rem'
          }}>
            매일 복약 시간에<br />
            알림을 보내드릴게요
          </p>

          <button
            onClick={onContinue}
            className="btn-primary w-full"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header with Celebration */}
      <div style={{
        background: 'var(--gradient-card)',
        padding: '48px 24px 32px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          opacity: 0.2
        }}>
          <Sparkles className="w-8 h-8" />
        </div>
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '30px',
          opacity: 0.2
        }}>
          <Sparkles className="w-6 h-6" />
        </div>
        
        <div style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 20px',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CheckCircle className="w-9 h-9" />
        </div>
        <h1 style={{ color: 'white', marginBottom: '8px' }}>등록 완료!</h1>
        <p style={{ opacity: 0.9, fontSize: '1rem' }}>
          약 {record.medications.length}개가 등록되었어요
        </p>
      </div>

      <div style={{ padding: '24px', marginTop: '-12px' }}>
        <div className="space-y-4">
          {/* Title */}
          <h2 className="section-title">현재 복용중</h2>

          {/* Medications Cards */}
          <div className="space-y-3">
            {activeMedications.map((med, idx) => (
              <div 
                key={med.id}
                className="card"
                style={{
                  padding: '20px',
                  background: idx === 0 ? 'var(--gradient-primary)' : 'var(--color-surface)',
                  color: idx === 0 ? 'white' : 'var(--color-text-primary)',
                  border: idx === 0 ? 'none' : undefined,
                  boxShadow: idx === 0 ? '0 8px 24px rgba(124, 58, 237, 0.25)' : undefined
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontWeight: '700',
                      fontSize: '1.125rem',
                      marginBottom: '4px',
                      color: idx === 0 ? 'white' : 'var(--color-text-primary)'
                    }}>
                      {med.name}
                    </p>
                    {idx === 0 && (
                      <span style={{
                        fontSize: '0.75rem',
                        background: 'rgba(255,255,255,0.25)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: '700'
                      }}>
                        주요 약물
                      </span>
                    )}
                  </div>
                  {med.confidence && med.confidence < 80 && (
                    <span className="badge-verify" style={{ fontSize: '0.6875rem' }}>
                      <AlertCircle className="w-3 h-3" />
                      확인
                    </span>
                  )}
                </div>
                <p style={{ 
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: idx === 0 ? 'rgba(255,255,255,0.95)' : 'var(--color-text-secondary)',
                  marginBottom: '6px'
                }}>
                  {med.dosage}
                </p>
                <p style={{ 
                  fontSize: '0.9375rem',
                  color: idx === 0 ? 'rgba(255,255,255,0.85)' : 'var(--color-text-tertiary)'
                }}>
                  {med.frequency}
                </p>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={onContinue}
                className="card"
                style={{
                  width: '100%',
                  border: '2px dashed var(--color-primary-light)',
                  background: 'var(--color-primary-bg)',
                  cursor: 'pointer',
                  padding: '20px',
                  textAlign: 'center'
                }}
              >
                <p style={{ 
                  color: 'var(--color-primary)',
                  fontWeight: '600'
                }}>
                  +{record.medications.length - 3}개 더보기
                </p>
              </button>
            )}
          </div>

          {/* Reminder CTA Card */}
          <div className="card" style={{
            marginTop: '32px',
            background: 'var(--gradient-primary)',
            border: 'none',
            color: 'white',
            padding: '28px 24px',
            boxShadow: '0 8px 24px rgba(40, 91, 170, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.25)',
                borderRadius: '14px',
                padding: '12px',
                flexShrink: 0
              }}>
                <Bell className="w-7 h-7" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: 'white', marginBottom: '8px' }}>복약 알림 켜기</h3>
                <p style={{ 
                  fontSize: '0.9375rem',
                  opacity: 0.95,
                  lineHeight: '1.6'
                }}>
                  아침, 점심, 저녁 식사 시간에<br />
                  약 먹을 시간을 알려드려요
                </p>
              </div>
            </div>

            <button
              onClick={handleEnableReminder}
              style={{
                width: '100%',
                padding: '16px',
                background: 'white',
                color: 'var(--color-primary)',
                border: 'none',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                marginBottom: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              알림 켜기
            </button>

            <button
              onClick={onContinue}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: 'white',
                border: 'none',
                fontSize: '0.9375rem',
                cursor: 'pointer',
                opacity: 0.8
              }}
            >
              나중에 하기
            </button>
          </div>

          {/* Trust Message */}
          <div className="trust-badge" style={{
            marginTop: '20px',
            width: '100%',
            justifyContent: 'center',
            padding: '16px'
          }}>
            🔒 사진은 분석 후 즉시 삭제되었어요
          </div>
        </div>
      </div>
    </div>
  );
}