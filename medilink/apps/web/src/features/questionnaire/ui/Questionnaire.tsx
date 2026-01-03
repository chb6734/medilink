import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { getPatientInfo } from "@/shared/api";

interface QuestionnaireProps {
  initialData?: Partial<QuestionnaireData>;
  visitType?: "new" | "followup";
  relatedRecordId?: string;
  onBack: () => void;
  onComplete: (data: QuestionnaireData) => void;
}

export function Questionnaire(props: QuestionnaireProps) {
  const { initialData = {}, visitType = "new", onBack, onComplete } = props;

  // sessionStorage에서 이전 데이터 복원 (병원 선택에서 뒤로가기 시)
  const getInitialState = () => {
    if (typeof window === "undefined") return { step: 0, data: initialData };

    const savedData = sessionStorage.getItem("questionnaireData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // 데이터가 있으면 마지막 step으로 이동 (step은 6개이므로 5)
        return { step: 5, data: parsed };
      } catch {
        return { step: 0, data: initialData };
      }
    }
    return { step: 0, data: initialData };
  };

  const initial = getInitialState();
  const [step, setStep] = useState(initial.step);
  const [formData, setFormData] = useState<Partial<QuestionnaireData>>(
    initial.data
  );
  const [symptomDetail, setSymptomDetail] = useState(
    initial.data.symptomDetail ?? ""
  );

  // 환자 정보 (알레르기) 자동 불러오기
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientInfo = await getPatientInfo();
        if (cancelled || !patientInfo.allergies) return;
        // 알레르기 정보가 있고, 폼에 아직 입력되지 않았다면 자동 입력
        setFormData((prev) =>
          prev.allergies
            ? prev
            : {
                ...prev,
                allergies: patientInfo.allergies || "",
              }
        );
      } catch (error) {
        // 환자 정보 조회 실패 시 무시 (로그인하지 않았거나 정보 없음)
        console.log("Could not load patient allergies:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // 컴포넌트 마운트 시 1번만 실행

  // 약 복용 여부 확인 (부작용 질문 스킵 여부 결정)
  const didTakeMedication = () => {
    const compliance = formData.medicationCompliance;
    if (!compliance) return false;
    // "아니요, 먹지 않았어요" 또는 "처방받은 적 없음"인 경우 약을 먹지 않은 것으로 간주
    return !compliance.includes("아니요") && !compliance.includes("처방받은 적 없음");
  };

  type Step = {
    id: string;
    kind: "symptom" | "select" | "textarea";
    required: boolean;
    title?: string;
    subtitle?: string;
    options?: string[];
    placeholder?: string;
    skipIf?: () => boolean;
  };

  const steps = useMemo((): Step[] => {
    const medicationStep: Step = visitType === "new"
      ? {
          id: "medicationCompliance",
          kind: "select",
          required: true,
          title: "약국에서 약을 사서 드셨나요?",
          subtitle: "처방 없이 직접 구매한 약이 있는지 알려주세요",
          options: [
            "아니요, 먹지 않았어요",
            "네, 사서 먹었어요",
          ],
        }
      : {
          id: "medicationCompliance",
          kind: "select",
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
        };

    return [
      {
        id: "chiefComplaint",
        kind: "symptom",
        required: true,
      },
      {
        id: "symptomProgress",
        kind: "select",
        required: true,
        title: "증상이 어떻게 변했나요?",
        subtitle: "최근 며칠 사이 경과를 선택해주세요",
        options: [
          "점점 좋아지고 있어요",
          "비슷해요",
          "점점 나빠지고 있어요",
          "좋았다 나빠다 해요",
        ],
      },
      medicationStep,
      {
        id: "sideEffects",
        kind: "textarea",
        required: true,
        title: "약 먹고 이상한 점은 없었나요?",
        subtitle: '없다면 "없음"이라고 적어주세요',
        placeholder: '예: 속이 메스꺼웠어요\n(없으면 "없음" 입력)',
        skipIf: () => !didTakeMedication(), // 약을 먹지 않았으면 스킵
      },
      {
        id: "allergies",
        kind: "textarea",
        required: false,
        title: "알레르기가 있으신가요?",
        subtitle: "선택사항",
        placeholder: '예: 페니실린 알레르기\n(없으면 "없음" 입력)',
      },
      {
        id: "patientNotes",
        kind: "textarea",
        required: false,
        title: "의사에게 꼭 전할 말이 있나요?",
        subtitle: "선택사항",
        placeholder: "예: 이전에 같은 증상으로 ○○병원에서 치료받았어요",
      },
    ];
  }, [visitType, formData.medicationCompliance]);

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      // 다음 스텝 찾기 (skipIf 조건 체크)
      let nextStep = step + 1;
      while (nextStep < steps.length) {
        const nextStepData = steps[nextStep] as any;
        if (nextStepData.skipIf && nextStepData.skipIf()) {
          // 스킵되는 스텝의 기본값 설정
          if (nextStepData.id === "sideEffects") {
            updateFormData("sideEffects", "없음");
          }
          nextStep++;
        } else {
          break;
        }
      }
      if (nextStep < steps.length) {
        setStep(nextStep);
      } else {
        onComplete(formData as QuestionnaireData);
      }
    } else {
      onComplete(formData as QuestionnaireData);
    }
  };

  const handleBackStep = () => {
    if (step > 0) {
      // 이전 스텝 찾기 (skipIf 조건 체크)
      let prevStep = step - 1;
      while (prevStep >= 0) {
        const prevStepData = steps[prevStep] as any;
        if (prevStepData.skipIf && prevStepData.skipIf()) {
          prevStep--;
        } else {
          break;
        }
      }
      if (prevStep >= 0) {
        setStep(prevStep);
      } else {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isCurrentStepValid = () => {
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

        {/* Progress Steps */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "10px",
          }}
        >
          {steps.map((_, idx) => {
            const isCompleted = idx < step;
            const isCurrent = idx === step;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: "6px",
                  borderRadius: "999px",
                  background: isCompleted
                    ? "linear-gradient(90deg, #10B981 0%, #34D399 100%)"
                    : isCurrent
                      ? "linear-gradient(90deg, var(--color-accent) 0%, #3B82F6 100%)"
                      : "#E5E7EB",
                  transition: "all 0.3s ease",
                  boxShadow: isCompleted
                    ? "0 0 8px rgba(16, 185, 129, 0.4)"
                    : isCurrent
                      ? "0 0 8px rgba(59, 130, 246, 0.3)"
                      : "none",
                }}
              />
            );
          })}
        </div>

        <div style={{ marginTop: "12px", marginBottom: "6px" }}>
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
          {current.kind === "symptom" && (
            <>
              <h1
                style={{
                  marginBottom: 6,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#222222",
                }}
              >
                방문 사유
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
                            padding: "10px 14px",
                            borderRadius: 999,
                            border: selected
                              ? "2px solid #2563EB"
                              : "1px solid #E5E7EB",
                            background: selected
                              ? "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
                              : "white",
                            color: selected ? "white" : "inherit",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: selected
                              ? "0 2px 8px rgba(37, 99, 235, 0.3)"
                              : "none",
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
                {current.options?.map((option) => {
                  const selected = (formData as Record<string, string>)[current.id] === option;
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
                          ? "2px solid #2563EB"
                          : "1px solid #E5E7EB",
                        background: selected
                          ? "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)"
                          : "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "1.0625rem",
                        minHeight: 56,
                        transition: "all 0.2s ease",
                        boxShadow: selected
                          ? "0 4px 12px rgba(37, 99, 235, 0.15)"
                          : "none",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: selected ? 800 : 600,
                          color: selected ? "#1E40AF" : "inherit",
                        }}
                      >
                        {option}
                      </span>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          border: selected ? "none" : "2px solid #D1D5DB",
                          background: selected
                            ? "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
                            : "white",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {selected && (
                          <Check
                            className="w-4 h-4"
                            style={{ color: "white", strokeWidth: 3 }}
                          />
                        )}
                      </div>
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
                value={(formData as Record<string, string>)[current.id] || ""}
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
