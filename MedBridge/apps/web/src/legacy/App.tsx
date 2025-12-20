"use client";

import { useEffect, useState } from "react";
import { Home } from "./components/Home";
import { QuickRecord } from "./components/QuickRecord";
import { FirstResult } from "./components/FirstResult";
import { Questionnaire } from "./components/Questionnaire";
import { ShareView } from "./components/ShareView";
import { DoctorView } from "./components/DoctorView";
import { AuthView } from "./components/AuthView";
import { MedicationHistory } from "./components/MedicationHistory";
import { getOrCreatePatientId } from "./lib/patient";
import { createShareToken } from "@/shared/api";

export type ViewType =
  | "home"
  | "quick-record"
  | "first-result"
  | "questionnaire"
  | "share"
  | "doctor"
  | "history";

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
  symptomDetail?: string;
  symptomStart: string;
  symptomProgress: string;
  medicationCompliance: string;
  sideEffects: string;
  allergies: string;
  patientNotes: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [prescriptionRecords, setPrescriptionRecords] = useState<
    PrescriptionRecord[]
  >([]);
  const [questionnaireData, setQuestionnaireData] =
    useState<QuestionnaireData | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [latestRecord, setLatestRecord] = useState<PrescriptionRecord | null>(
    null
  );
  const [pendingShareAfterLogin, setPendingShareAfterLogin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    // SSR/SSG 안전: window/localStorage 접근은 클라이언트에서만
    setPatientId(getOrCreatePatientId());
  }, []);

  const handleAddRecord = (record: PrescriptionRecord) => {
    setPrescriptionRecords([...prescriptionRecords, record]);
    setLatestRecord(record);
    setCurrentView("first-result");
  };

  const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
    setQuestionnaireData(data);
    try {
      const pid = patientId ?? getOrCreatePatientId();
      setPatientId(pid);
      const resp = await createShareToken({ patientId: pid });
      setShareToken(resp.token);
      setCurrentView("share");
    } catch (e) {
      const msg = String((e as any)?.message ?? e);
      // if auth is enabled on server, unauthenticated calls may fail; send user to login
      if (msg.includes("401") || msg.includes("unauthorized")) {
        setPendingShareAfterLogin(true);
        setShowLogin(true);
        return;
      }
      // fallback (offline/dev)
      const token = Math.random().toString(36).substring(2, 15);
      setShareToken(token);
      setCurrentView("share");
    }
  };

  const handleAuthDone = async () => {
    setShowLogin(false);
    if (!pendingShareAfterLogin) return;
    setPendingShareAfterLogin(false);
    if (!questionnaireData) return;
    try {
      const pid = patientId ?? getOrCreatePatientId();
      setPatientId(pid);
      const resp = await createShareToken({ patientId: pid });
      setShareToken(resp.token);
      setCurrentView("share");
    } catch {
      // still allow UI demo
      const token = Math.random().toString(36).substring(2, 15);
      setShareToken(token);
      setCurrentView("share");
    }
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  return (
    <div className="app-container">
      {showLogin ? (
        <AuthView onDone={handleAuthDone} />
      ) : (
        <>
          {currentView === "home" && (
            <Home
              onNavigate={handleViewChange}
              onLogin={() => setShowLogin(true)}
              recordCount={prescriptionRecords.length}
            />
          )}
          {currentView === "quick-record" && (
            <QuickRecord
              onBack={() => setCurrentView("home")}
              onRecordSaved={handleAddRecord}
            />
          )}
          {currentView === "first-result" && latestRecord && (
            <FirstResult
              record={latestRecord}
              onContinue={() => setCurrentView("home")}
            />
          )}
          {currentView === "questionnaire" && (
            <Questionnaire
              onBack={() => setCurrentView("home")}
              onComplete={handleQuestionnaireComplete}
            />
          )}
          {currentView === "share" && shareToken && (
            <ShareView
              token={shareToken}
              onBack={() => setCurrentView("home")}
              onRegenerateToken={() => {
                (async () => {
                  try {
                    const pid = patientId ?? getOrCreatePatientId();
                    setPatientId(pid);
                    const resp = await createShareToken({ patientId: pid });
                    setShareToken(resp.token);
                  } catch (e) {
                    const msg = String((e as any)?.message ?? e);
                    if (msg.includes("401") || msg.includes("unauthorized")) {
                      setPendingShareAfterLogin(true);
                      setShowLogin(true);
                      return;
                    }
                    const newToken = Math.random()
                      .toString(36)
                      .substring(2, 15);
                    setShareToken(newToken);
                  }
                })();
              }}
            />
          )}
          {currentView === "doctor" && (
            <DoctorView
              records={prescriptionRecords}
              questionnaireData={questionnaireData}
            />
          )}
          {currentView === "history" && (
            <MedicationHistory
              records={prescriptionRecords}
              onBack={() => setCurrentView("home")}
            />
          )}
        </>
      )}
    </div>
  );
}
