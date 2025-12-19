import { useState } from 'react';
import { Home } from './components/Home';
import { QuickRecord } from './components/QuickRecord';
import { FirstResult } from './components/FirstResult';
import { Questionnaire } from './components/Questionnaire';
import { ShareView } from './components/ShareView';
import { DoctorView } from './components/DoctorView';
import { MedicationHistory } from './components/MedicationHistory';

export type ViewType = 'home' | 'quick-record' | 'first-result' | 'questionnaire' | 'share' | 'doctor' | 'history';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  confidence?: number;
}

export interface PrescriptionRecord {
  id: string;
  medications: Medication[];
  hospitalName?: string;
  pharmacyName?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  prescriptionDate: string;
  imageUrl?: string;
  ocrConfidence?: number;
}

export interface QuestionnaireData {
  hospitalName: string;
  chiefComplaint: string;
  symptomStart: string;
  symptomProgress: string;
  medicationCompliance: string;
  sideEffects: string;
  allergies: string;
  patientNotes: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [prescriptionRecords, setPrescriptionRecords] = useState<PrescriptionRecord[]>([]);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [latestRecord, setLatestRecord] = useState<PrescriptionRecord | null>(null);

  const handleAddRecord = (record: PrescriptionRecord) => {
    setPrescriptionRecords([...prescriptionRecords, record]);
    setLatestRecord(record);
    setCurrentView('first-result');
  };

  const handleQuestionnaireComplete = (data: QuestionnaireData) => {
    setQuestionnaireData(data);
    const token = Math.random().toString(36).substring(2, 15);
    setShareToken(token);
    setCurrentView('share');
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  return (
    <div className="app-container">
      {currentView === 'home' && (
        <Home 
          onNavigate={handleViewChange}
          recordCount={prescriptionRecords.length}
        />
      )}
      {currentView === 'quick-record' && (
        <QuickRecord 
          onBack={() => setCurrentView('home')}
          onRecordSaved={handleAddRecord}
        />
      )}
      {currentView === 'first-result' && latestRecord && (
        <FirstResult
          record={latestRecord}
          onContinue={() => setCurrentView('home')}
        />
      )}
      {currentView === 'questionnaire' && (
        <Questionnaire 
          onBack={() => setCurrentView('home')}
          onComplete={handleQuestionnaireComplete}
        />
      )}
      {currentView === 'share' && shareToken && (
        <ShareView 
          token={shareToken}
          onBack={() => setCurrentView('home')}
          onRegenerateToken={() => {
            const newToken = Math.random().toString(36).substring(2, 15);
            setShareToken(newToken);
          }}
        />
      )}
      {currentView === 'doctor' && (
        <DoctorView 
          records={prescriptionRecords}
          questionnaireData={questionnaireData}
        />
      )}
      {currentView === 'history' && (
        <MedicationHistory 
          records={prescriptionRecords}
          onBack={() => setCurrentView('home')}
        />
      )}
    </div>
  );
}
