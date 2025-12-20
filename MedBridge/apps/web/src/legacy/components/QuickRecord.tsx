import React, { useState } from "react";
import { ArrowLeft, Camera, AlertCircle, CheckCircle } from "lucide-react";
import { PrescriptionRecord, Medication } from "../App";
import { previewOcr, createRecord } from "@/shared/api";
import { getOrCreatePatientId } from "../lib/patient";

interface QuickRecordProps {
  onBack: () => void;
  onRecordSaved: (record: PrescriptionRecord) => void;
}

interface OCRResult {
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    confidence: number | null;
  }>;
  prescriptionDate?: string;
  pharmacyName?: string;
  confidence: number | null;
}

export function QuickRecord({ onBack, onRecordSaved }: QuickRecordProps) {
  const [step, setStep] = useState<"upload" | "analyzing" | "review">("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [symptom, setSymptom] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setStep("analyzing");
      try {
        const preview = await previewOcr(file);
        const meds = preview.meds.map((m) => ({
          name: m.nameRaw,
          dosage: "",
          frequency: "",
          confidence: m.confidence,
        }));
        const result: OCRResult = {
          medications: meds,
          prescriptionDate: new Date().toISOString().split("T")[0],
          confidence: preview.overallConfidence,
        };
        setOcrResult(result);
        setStep("review");
      } catch (e) {
        // fallback to allow UX test even if API isn't configured
        const mockOCR: OCRResult = {
          medications: [
            {
              name: "분석 실패(테스트)",
              dosage: "",
              frequency: "",
              confidence: null,
            },
          ],
          prescriptionDate: new Date().toISOString().split("T")[0],
          confidence: null,
        };
        setOcrResult(mockOCR);
        setStep("review");
      }
    }
  };

  const handleSave = async () => {
    if (!ocrResult) return;

    const medications: Medication[] = ocrResult.medications.map((med, idx) => ({
      id: `med-${Date.now()}-${idx}`,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      startDate:
        ocrResult.prescriptionDate || new Date().toISOString().split("T")[0],
      prescribedBy: hospitalName || pharmacyName || "미입력",
      confidence: med.confidence ?? undefined,
    }));

    const record: PrescriptionRecord = {
      id: `record-${Date.now()}`,
      medications,
      hospitalName: hospitalName || undefined,
      pharmacyName: pharmacyName || undefined,
      chiefComplaint: symptom || undefined,
      prescriptionDate:
        ocrResult.prescriptionDate || new Date().toISOString().split("T")[0],
      imageUrl: imagePreview || undefined,
      ocrConfidence: ocrResult.confidence ?? undefined,
    };

    // Persist on server (optional in local dev)
    if (file) {
      try {
        await createRecord({
          patientId: getOrCreatePatientId(),
          recordType: "dispensing_record",
          file,
          chiefComplaint: symptom || undefined,
          facilityName: hospitalName || pharmacyName || undefined,
          facilityType: pharmacyName ? "pharmacy" : "unknown",
          noteDoctorSaid: undefined,
        });
      } catch {
        // if auth required, redirect to login but still allow local UI flow
        window.location.href = "/login";
      }
    }

    onRecordSaved(record);
  };

  if (step === "analyzing") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ padding: "24px" }}
      >
        <div
          className="text-center animate-slide-up"
          style={{ maxWidth: "320px" }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 32px",
              borderRadius: "24px",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Camera
              className="w-10 h-10 animate-pulse"
              style={{ color: "white" }}
            />
            <div
              style={{
                position: "absolute",
                inset: "-8px",
                borderRadius: "28px",
                border: "3px solid var(--color-primary-light)",
                opacity: 0.3,
                animation: "pulse 2s infinite",
              }}
            />
          </div>
          <h2 style={{ marginBottom: "16px" }}>사진 분석중</h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              lineHeight: "1.6",
              marginBottom: "32px",
            }}
          >
            약물 정보를 읽고 있어요
            <br />
            잠시만 기다려주세요
          </p>
          <div
            className="card"
            style={{
              padding: "16px",
              background: "var(--color-primary-bg)",
              border: "2px solid #E9D5FF",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-primary)",
                fontWeight: "600",
              }}
            >
              🔒 사진은 분석 후 즉시 삭제됩니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "review" && ocrResult) {
    return (
      <div className="min-h-screen pb-32">
        {/* Header */}
        <div
          style={{
            background: "var(--gradient-card)",
            padding: "16px 24px 24px",
            color: "white",
            borderBottomLeftRadius: "24px",
            borderBottomRightRadius: "24px",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              padding: "10px",
              borderRadius: "12px",
              cursor: "pointer",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              color: "white",
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 style={{ color: "white", marginBottom: "8px" }}>분석 결과</h2>
          <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
            정보를 확인해주세요
          </p>
        </div>

        <div style={{ padding: "24px", marginTop: "-12px" }}>
          <div className="space-y-4">
            {/* Confidence Badge */}
            <div
              className="card"
              style={{
                background:
                  (ocrResult.confidence ?? 0) >= 80
                    ? "#D1FAE5"
                    : "var(--color-verify-bg)",
                border: `2px solid ${
                  (ocrResult.confidence ?? 0) >= 80 ? "#A7F3D0" : "#FDE68A"
                }`,
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {(ocrResult.confidence ?? 0) >= 80 ? (
                <CheckCircle
                  className="w-6 h-6"
                  style={{ color: "#059669", flexShrink: 0 }}
                />
              ) : (
                <AlertCircle
                  className="w-6 h-6"
                  style={{ color: "#D97706", flexShrink: 0 }}
                />
              )}
              <div>
                <p
                  style={{
                    color:
                      (ocrResult.confidence ?? 0) >= 80 ? "#065F46" : "#92400E",
                    fontWeight: "700",
                    marginBottom: "2px",
                  }}
                >
                  분석 정확도 {ocrResult.confidence ?? 0}%
                </p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color:
                      (ocrResult.confidence ?? 0) >= 80 ? "#065F46" : "#92400E",
                    opacity: 0.8,
                  }}
                >
                  {(ocrResult.confidence ?? 0) >= 80
                    ? "정확도가 높아요"
                    : "일부 항목을 확인해주세요"}
                </p>
              </div>
            </div>

            {/* Medications */}
            <div className="card">
              <h3 style={{ marginBottom: "16px" }}>
                확인된 약물 ({ocrResult.medications.length}개)
              </h3>
              <div className="space-y-3">
                {ocrResult.medications.map((med, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      background: "var(--color-background)",
                      borderRadius: "14px",
                      border:
                        (med.confidence ?? 0) < 80
                          ? "2px solid #FDE68A"
                          : "2px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <p style={{ fontWeight: "700", fontSize: "1.0625rem" }}>
                        {med.name}
                      </p>
                      {(med.confidence ?? 0) < 80 && (
                        <span
                          className="badge-verify"
                          style={{ fontSize: "0.6875rem" }}
                        >
                          <AlertCircle className="w-3 h-3" />
                          확인 필요
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "0.9375rem",
                        lineHeight: "1.5",
                      }}
                    >
                      {med.dosage}
                    </p>
                    <p
                      style={{
                        color: "var(--color-text-tertiary)",
                        fontSize: "0.875rem",
                        marginTop: "4px",
                      }}
                    >
                      {med.frequency}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="card">
              <h3 style={{ marginBottom: "16px" }}>추가 정보 (선택)</h3>
              <div className="space-y-4">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                    }}
                  >
                    병원/의원명
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="예: 서울내과의원"
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                    }}
                  >
                    약국명
                  </label>
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="자동으로 인식됨"
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                    }}
                  >
                    증상
                  </label>
                  <input
                    type="text"
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    placeholder="예: 목감기"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Buttons */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "428px",
            padding: "16px 24px 24px",
            background:
              "linear-gradient(to top, var(--color-background) 90%, transparent)",
            display: "flex",
            gap: "12px",
          }}
        >
          <button
            onClick={() => {
              setStep("upload");
              setImagePreview(null);
              setOcrResult(null);
            }}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            다시 촬영
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ flex: 2 }}
          >
            저장하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div
        style={{
          background: "var(--gradient-card)",
          padding: "16px 24px 24px",
          color: "white",
          borderBottomLeftRadius: "24px",
          borderBottomRightRadius: "24px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            padding: "10px",
            borderRadius: "12px",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            color: "white",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 style={{ color: "white", marginBottom: "8px" }}>조제내역서 촬영</h2>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          약국에서 받은 종이를 찍어주세요
        </p>
      </div>

      <div style={{ padding: "24px" }}>
        {/* Upload Area */}
        <div
          style={{
            border: "3px dashed #E9D5FF",
            borderRadius: "24px",
            padding: "64px 24px",
            textAlign: "center",
            background: "var(--color-surface)",
          }}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            style={{ cursor: "pointer", display: "block" }}
          >
            <div
              style={{
                width: "88px",
                height: "88px",
                margin: "0 auto 24px",
                borderRadius: "24px",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(124, 58, 237, 0.25)",
              }}
            >
              <Camera className="w-11 h-11" style={{ color: "white" }} />
            </div>
            <h2 style={{ marginBottom: "12px" }}>사진 촬영하기</h2>
            <p
              style={{
                color: "var(--color-text-secondary)",
                lineHeight: "1.6",
                marginBottom: "28px",
              }}
            >
              조제내역서 전체가 잘 보이도록
              <br />
              촬영해주세요
            </p>
            <div
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              사진 선택하기
            </div>
          </label>
        </div>

        {/* Tips Card */}
        <div
          className="card"
          style={{
            marginTop: "24px",
            background: "var(--color-primary-bg)",
            border: "2px solid #E9D5FF",
          }}
        >
          <h3
            style={{
              marginBottom: "16px",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📸 촬영 팁
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              color: "var(--color-text-secondary)",
              fontSize: "0.9375rem",
              lineHeight: "1.8",
            }}
          >
            <li style={{ paddingLeft: "24px", position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  color: "var(--color-primary)",
                }}
              >
                •
              </span>
              밝은 곳에서 촬영하세요
            </li>
            <li style={{ paddingLeft: "24px", position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  color: "var(--color-primary)",
                }}
              >
                •
              </span>
              문서 전체가 보이게 찍어주세요
            </li>
            <li style={{ paddingLeft: "24px", position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  color: "var(--color-primary)",
                }}
              >
                •
              </span>
              글씨가 선명한지 확인하세요
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
