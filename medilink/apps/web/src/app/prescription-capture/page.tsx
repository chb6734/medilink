"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle } from "lucide-react";
import { previewOcr, createRecord } from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";

function PrescriptionCaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitType = searchParams.get("visitType") || "followup";

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleImageSelect = async (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrResult(null);
    setHospitalName("");

    // OCR 분석 시작
    setOcrLoading(true);
    try {
      const result = await previewOcr(file);
      setOcrResult(result);
      setHospitalName(result.hospitalName || "");
    } catch (error) {
      console.error("OCR 분석 실패:", error);
      alert("이미지 분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleConfirm = async () => {
    if (!imageFile || !ocrResult) {
      alert("이미지를 먼저 업로드해주세요.");
      return;
    }

    if (!hospitalName.trim()) {
      alert("병원명을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const patientId = getOrCreatePatientId();

      // PrescriptionRecord 생성
      const record = await createRecord({
        patientId,
        recordType: "dispensing_record",
        file: imageFile,
        facilityName: hospitalName,
        medications: ocrResult.medications?.map((m: any) => ({
          name: m.medicationName,
          dosage: m.dose,
          frequency: m.frequency,
          confidence: m.confidence,
        })),
      });

      // 문진표 페이지로 이동
      router.push(
        `/questionnaire?visitType=${visitType}&recordId=${record.id}`
      );
    } catch (error) {
      console.error("처방 기록 저장 실패:", error);
      alert("처방 기록 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "var(--color-background)" }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--gradient-card)",
          padding: "48px 24px 32px",
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
          color: "white",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            padding: "8px",
            borderRadius: "12px",
            color: "white",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "800",
            marginBottom: "8px",
          }}
        >
          약봉지/처방전 촬영
        </h1>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          약봉지 또는 처방전을 촬영하여 처방 정보를 불러옵니다
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: "24px" }}>
        {/* 이미지 업로드 */}
        {!imagePreview && (
          <div>
            <label
              htmlFor="image-upload"
              style={{
                display: "block",
                width: "100%",
                padding: "48px 24px",
                borderRadius: "16px",
                border: "2px dashed var(--color-border)",
                background: "var(--color-surface)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.background = "var(--color-accent-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "var(--color-surface)";
              }}
            >
              <Camera
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: "var(--color-accent)" }}
              />
              <p
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "700",
                  color: "var(--color-text-primary)",
                  marginBottom: "8px",
                }}
              >
                약봉지 또는 처방전 촬영
              </p>
              <p
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                사진을 촬영하거나 갤러리에서 선택해주세요
              </p>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
            </label>

            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "12px",
                background: "#FEF3C7",
                border: "1px solid #FCD34D",
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#92400E",
                  lineHeight: 1.5,
                }}
              >
                💡 <strong>촬영 팁:</strong> 약봉지나 처방전의 글씨가 선명하게
                보이도록 촬영해주세요. 조명이 밝은 곳에서 촬영하면 인식률이
                높아집니다.
              </p>
            </div>
          </div>
        )}

        {/* 이미지 미리보기 */}
        {imagePreview && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <img
                src={imagePreview}
                alt="처방전 미리보기"
                style={{
                  width: "100%",
                  borderRadius: "16px",
                  border: "2px solid var(--color-border)",
                }}
              />
              <button
                onClick={() => {
                  setImagePreview("");
                  setImageFile(null);
                  setOcrResult(null);
                  setHospitalName("");
                }}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                다시 촬영
              </button>
            </div>

            {/* OCR 분석 중 */}
            {ocrLoading && (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  borderRadius: "16px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Loader2
                  className="w-12 h-12 animate-spin mx-auto mb-4"
                  style={{ color: "#285BAA" }}
                />
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "var(--color-text-primary)",
                    marginBottom: "4px",
                  }}
                >
                  이미지 분석 중...
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                  처방 정보를 불러오고 있습니다
                </p>
              </div>
            )}

            {/* OCR 결과 */}
            {!ocrLoading && ocrResult && (
              <div>
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#D1FAE5",
                    border: "2px solid #10B981",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <CheckCircle className="w-6 h-6" style={{ color: "#059669" }} />
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "700",
                        color: "#065F46",
                      }}
                    >
                      이미지 분석 완료
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "#047857" }}>
                      처방 정보를 확인하고 병원명을 입력해주세요
                    </p>
                  </div>
                </div>

                {/* 병원명 입력 */}
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9375rem",
                      fontWeight: "700",
                      color: "var(--color-text-primary)",
                      marginBottom: "8px",
                    }}
                  >
                    병원명 <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="병원 이름을 입력하세요"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "2px solid #D1D5DB",
                      fontSize: "1rem",
                      background: "white",
                      outline: "none",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                  />
                  {ocrResult.hospitalName && (
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-text-secondary)",
                        marginTop: "6px",
                      }}
                    >
                      💡 AI가 추출한 병원명: <strong>{ocrResult.hospitalName}</strong>
                    </p>
                  )}
                </div>

                {/* 약물 정보 */}
                {ocrResult.medications && ocrResult.medications.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: "700",
                        color: "var(--color-text-primary)",
                        marginBottom: "12px",
                      }}
                    >
                      추출된 약물 정보 ({ocrResult.medications.length}개)
                    </h3>
                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {ocrResult.medications.map((med: any, index: number) => (
                        <div
                          key={index}
                          style={{
                            padding: "12px",
                            borderRadius: "12px",
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "0.9375rem",
                              fontWeight: "700",
                              color: "var(--color-text-primary)",
                              marginBottom: "4px",
                            }}
                          >
                            {med.medicationName}
                          </p>
                          {med.dose && (
                            <p
                              style={{
                                fontSize: "0.8125rem",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              용량: {med.dose} | 빈도: {med.frequency || "정보 없음"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 확인 버튼 */}
        {ocrResult && !ocrLoading && (
          <button
            onClick={handleConfirm}
            disabled={!hospitalName.trim() || saving}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "none",
              background:
                hospitalName.trim() && !saving
                  ? "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)"
                  : "#D1D5DB",
              color: "white",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: hospitalName.trim() && !saving ? "pointer" : "not-allowed",
              boxShadow:
                hospitalName.trim() && !saving
                  ? "0 4px 12px rgba(40, 91, 170, 0.3)"
                  : "none",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            {saving ? "저장 중..." : "확인하고 문진표 작성하기"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PrescriptionCapturePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      }
    >
      <PrescriptionCaptureContent />
    </Suspense>
  );
}
