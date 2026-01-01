import React, { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { searchFacilities, recommendSpecialty, getPatientInfo } from "@/shared/api";
import type { Facility } from "@/shared/api/medilink";

interface QuestionnaireProps {
  initialData?: Partial<QuestionnaireData>;
  visitType?: "new" | "followup";
  relatedRecordId?: string;
  onBack: () => void;
  onComplete: (data: QuestionnaireData) => void;
}

export function Questionnaire({
  initialData = {},
  visitType = "new",
  relatedRecordId,
  onBack,
  onComplete,
}: QuestionnaireProps) {
  // Start at step 1 if hospital is already provided, else start at step 0
  const [step, setStep] = useState(initialData.hospitalName ? 1 : 0);
  const [formData, setFormData] = useState<Partial<QuestionnaireData>>(initialData);
  const [hospitalQuery, setHospitalQuery] = useState("");
  const [symptomDetail, setSymptomDetail] = useState(
    formData.symptomDetail ?? ""
  );

  // 환자 정보 (알레르기) 자동 불러오기
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientInfo = await getPatientInfo();
        if (!cancelled && patientInfo.allergies && !formData.allergies) {
          // 알레르기 정보가 있고, 폼에 아직 입력되지 않았다면 자동 입력
          setFormData((prev) => ({
            ...prev,
            allergies: patientInfo.allergies || "",
          }));
        }
      } catch (error) {
        // 환자 정보 조회 실패 시 무시 (로그인하지 않았거나 정보 없음)
        console.log("Could not load patient allergies:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // 컴포넌트 마운트 시 1번만 실행

  const steps = useMemo(
    () => [
      {
        id: "hospitalName" as const,
        kind: "hospital" as const,
        required: true,
      },
      {
        id: "chiefComplaint" as const,
        kind: "symptom" as const,
        required: true,
      },
      {
        id: "symptomProgress" as const,
        kind: "select" as const,
        required: true,
        title: "증상이 어떻게 변했나요?",
        subtitle: "최근 며칠 사이 경과를 선택해주세요",
        options: [
          "점점 좋아지고 있어요",
          "비슷해요",
          "점점 나빠지고 있어요",
          "좋았다 나빴다 해요",
        ],
      },
      {
        id: "medicationCompliance" as const,
        kind: "select" as const,
        required: true,
        title: "처방받은 약을 드셨나요?",
        subtitle: "복약 여부는 진료 판단에 큰 도움이 됩니다",
        options: [
          "처방받은 적 없음",
          "빠짐없이 먹었어요",
          "가끔 빠뜨렸어요",
          "자주 빠뜨렸어요",
          "먹다가 중단했어요",
        ],
      },
      {
        id: "sideEffects" as const,
        kind: "textarea" as const,
        required: true,
        title: "약 먹고 이상한 점은 없었나요?",
        subtitle: "없다면 “없음”이라고 적어주세요",
        placeholder: "예: 속이 메스꺼웠어요\n(없으면 “없음” 입력)",
      },
      {
        id: "allergies" as const,
        kind: "textarea" as const,
        required: false,
        title: "알레르기가 있으신가요?",
        subtitle: "선택사항",
        placeholder: "예: 페니실린 알레르기\n(없으면 “없음” 입력)",
      },
      {
        id: "patientNotes" as const,
        kind: "textarea" as const,
        required: false,
        title: "의사에게 꼭 전할 말이 있나요?",
        subtitle: "선택사항",
        placeholder: "예: 이전에 같은 증상으로 ○○병원에서 치료받았어요",
      },
    ],
    []
  );

  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete(formData as QuestionnaireData);
  };

  const handleBackStep = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isCurrentStepValid = () => {
    if (current.kind === "hospital") {
      const v = formData.hospitalName;
      return !!v && v.trim().length > 0;
    }
    if (current.kind === "symptom") {
      const chief = formData.chiefComplaint;
      return !!chief && chief.trim().length > 0;
    }
    const value = formData[current.id as keyof QuestionnaireData];
    if (current.required) return !!value && value.trim().length > 0;
    return true;
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-background)" }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px 12px",
          background: "transparent",
        }}
      >
        <button
          onClick={handleBackStep}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--color-text-primary)",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div style={{ marginTop: "10px", marginBottom: "10px" }}>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            질문 {step + 1} / {steps.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "#E5E7EB",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background:
                "linear-gradient(90deg, var(--color-accent) 0%, #2563EB 100%)",
              width: `${progress}%`,
              transition: "width 0.3s ease",
              boxShadow: "0 0 0 1px rgba(37,99,235,0.15) inset",
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-5 pb-8" style={{ paddingTop: 8 }}>
        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 20,
            border: "1px solid var(--color-border)",
          }}
        >
          {current.kind === "hospital" && (
            <>
              <h1
                style={{
                  marginBottom: 8,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                방문하실 병원 선택
              </h1>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  marginBottom: 18,
                  lineHeight: 1.5,
                }}
              >
                병원 또는 의원을 검색해 선택해주세요
              </p>

              <div style={{ position: "relative", marginBottom: 16 }}>
                <Search
                  className="w-5 h-5"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 14,
                    color: "var(--color-text-tertiary)",
                  }}
                />
                <input
                  value={hospitalQuery}
                  onChange={(e) => {
                    setHospitalQuery(e.target.value);
                    updateFormData("hospitalName", e.target.value);
                  }}
                  placeholder="병원 또는 의원 검색..."
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    border: "2px solid #D1D5DB",
                    borderRadius: 14,
                    fontSize: "1.0625rem",
                    background: "white",
                    outline: "none",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#D1D5DB")
                  }
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {/* direct input */}
                {hospitalQuery.trim().length > 1 && (
                  <button
                    onClick={() => {
                      updateFormData("hospitalName", hospitalQuery.trim());
                      setStep((s) => Math.min(s + 1, steps.length - 1));
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "16px 16px",
                      borderRadius: 16,
                      border: "1px solid #E5E7EB",
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "#F3F4F6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Search
                          className="w-5 h-5"
                          style={{ color: "#6B7280" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.0625rem" }}>
                          {hospitalQuery.trim()}
                        </div>
                        <div
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "0.9375rem",
                          }}
                        >
                          검색어로 병원명을 직접 입력하기
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className="w-5 h-5"
                      style={{ color: "#9CA3AF", flexShrink: 0 }}
                    />
                  </button>
                )}
                {[
                  {
                    name: "삼성서울병원",
                    address: "서울특별시 강남구 일원로 81",
                  },
                  {
                    name: "아산병원",
                    address: "서울특별시 송파구 올림픽로43길 88",
                  },
                  {
                    name: "강남세브란스병원",
                    address: "서울특별시 강남구 언주로 211",
                  },
                  {
                    name: "중앙내과의원",
                    address: "서울특별시 중구 명동길 73",
                  },
                ]
                  .filter((h) => {
                    const q = hospitalQuery.trim();
                    if (!q) return true;
                    return `${h.name} ${h.address}`.includes(q);
                  })
                  .map((h) => {
                    const selected = formData.hospitalName === h.name;
                    return (
                      <button
                        key={h.name}
                        onClick={() => {
                          updateFormData("hospitalName", h.name);
                          setHospitalQuery(h.name);
                          // 선택 즉시 다음 단계로
                          setStep((s) => Math.min(s + 1, steps.length - 1));
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "16px 16px",
                          borderRadius: 16,
                          border: selected
                            ? "2px solid var(--color-accent)"
                            : "1px solid #E5E7EB",
                          background: "white",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "#EFF6FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Building2
                            className="w-6 h-6"
                            style={{ color: "#2563EB" }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: "1.0625rem",
                              marginBottom: 4,
                            }}
                          >
                            {h.name}
                          </div>
                          <div
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "0.9375rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {h.address}
                          </div>
                        </div>
                        <ChevronRight
                          className="w-5 h-5"
                          style={{ color: "#9CA3AF", flexShrink: 0 }}
                        />
                      </button>
                    );
                  })}
              </div>
            </>
          )}

          {current.kind === "symptom" && (
            <>
              <h1
                style={{
                  marginBottom: 6,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                주호소
              </h1>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  marginBottom: 18,
                  lineHeight: 1.5,
                }}
              >
                오늘 방문하신 이유를 알려주세요
              </p>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  주요 증상
                </div>
                <div style={{ position: "relative" }}>
                  <select
                    value={formData.chiefComplaint ?? ""}
                    onChange={(e) =>
                      updateFormData("chiefComplaint", e.target.value)
                    }
                    style={{
                      width: "100%",
                      appearance: "none",
                      padding: "14px 44px 14px 14px",
                      border: "2px solid #D1D5DB",
                      borderRadius: 14,
                      fontSize: "1.0625rem",
                      background: "white",
                      outline: "none",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#D1D5DB")
                    }
                  >
                    <option value="" disabled>
                      증상을 선택하세요
                    </option>
                    {[
                      "감기/기침",
                      "발열",
                      "복통/설사",
                      "두통",
                      "어지러움",
                      "피부 증상",
                      "허리/관절 통증",
                      "기타",
                    ].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="w-5 h-5"
                    style={{
                      position: "absolute",
                      right: 14,
                      top: 14,
                      color: "#9CA3AF",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  증상 상세 (선택)
                </div>
                <textarea
                  value={symptomDetail}
                  onChange={(e) => {
                    setSymptomDetail(e.target.value);
                    updateFormData("symptomDetail", e.target.value);
                  }}
                  placeholder="증상에 대해 더 자세히 설명해주세요"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "14px 14px",
                    border: "2px solid #D1D5DB",
                    borderRadius: 14,
                    fontSize: "1.0625rem",
                    background: "white",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#D1D5DB")
                  }
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  언제부터 증상이 시작되었나요?
                </div>
                <input
                  value={formData.symptomStart ?? ""}
                  onChange={(e) =>
                    updateFormData("symptomStart", e.target.value)
                  }
                  placeholder="예: 3일 전, 지난주 월요일, 2주 전"
                  style={{
                    width: "100%",
                    padding: "14px 14px",
                    border: "2px solid #D1D5DB",
                    borderRadius: 14,
                    fontSize: "1.0625rem",
                    background: "white",
                    outline: "none",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#D1D5DB")
                  }
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  {["오늘", "1-2일 전", "3-7일 전", "1-2주 전", "2주 이상"].map(
                    (t) => {
                      const selected = (formData.symptomStart ?? "") === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateFormData("symptomStart", t)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 999,
                            border: selected
                              ? "2px solid var(--color-accent)"
                              : "1px solid #E5E7EB",
                            background: selected
                              ? "var(--color-accent-light)"
                              : "white",
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            cursor: "pointer",
                          }}
                        >
                          {t}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </>
          )}

          {current.kind === "select" && (
            <>
              <h1
                style={{
                  marginBottom: 8,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {current.title}
              </h1>
              {"subtitle" in current && current.subtitle && (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  {current.subtitle}
                </p>
              )}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {current.options.map((option) => {
                  const selected = formData[current.id] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => updateFormData(current.id, option)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "16px 16px",
                        borderRadius: 16,
                        border: selected
                          ? "2px solid var(--color-accent)"
                          : "1px solid #E5E7EB",
                        background: selected
                          ? "var(--color-accent-light)"
                          : "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "1.0625rem",
                        minHeight: 56,
                      }}
                    >
                      <span style={{ fontWeight: selected ? 800 : 600 }}>
                        {option}
                      </span>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          border: selected
                            ? "6px solid var(--color-accent)"
                            : "2px solid #D1D5DB",
                          background: "white",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {current.kind === "textarea" && (
            <>
              <h1
                style={{
                  marginBottom: 8,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {current.title}
              </h1>
              {current.subtitle && (
                <p
                  style={{
                    color: "var(--color-text-tertiary)",
                    fontSize: "0.9375rem",
                    marginBottom: 12,
                  }}
                >
                  {current.subtitle}
                </p>
              )}
              <textarea
                value={formData[current.id] || ""}
                onChange={(e) => updateFormData(current.id, e.target.value)}
                placeholder={current.placeholder}
                rows={6}
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 14px",
                  border: "2px solid #D1D5DB",
                  borderRadius: 14,
                  fontSize: "1.0625rem",
                  background: "white",
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.6,
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-accent)")
                }
                onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
              />
            </>
          )}
        </div>

        <div style={{ marginTop: 14, padding: "0 4px" }}>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            입력한 정보는 의료진이 참고할 수 있도록 요약됩니다. 진단/치료 판단은
            의료진이 직접 합니다.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          padding: "14px 20px 18px",
          background:
            "linear-gradient(to top, var(--color-background) 75%, rgba(255,255,255,0))",
        }}
      >
        <button
          onClick={handleNext}
          disabled={!isCurrentStepValid()}
          className="btn-primary w-full"
          style={{
            opacity: isCurrentStepValid() ? 1 : 0.45,
            cursor: isCurrentStepValid() ? "pointer" : "not-allowed",
            minHeight: 56,
            borderRadius: 16,
            fontSize: "1.0625rem",
            fontWeight: 800,
          }}
        >
          {step < steps.length - 1 ? "다음" : "완료"}
        </button>
      </div>
    </div>
  );
}
