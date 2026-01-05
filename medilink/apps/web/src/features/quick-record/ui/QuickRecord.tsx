import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  AlertCircle,
  CheckCircle,
  Edit3,
  Check,
  X,
  Bell,
  Sparkles,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react";
import type {
  PrescriptionRecord,
  Medication,
} from "@/entities/record/model/types";
import { previewOcr, createRecord, getMyIntakeForms, authMe } from "@/shared/api";
import type { IntakeForm } from "@/shared/api/medilink";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";

interface QuickRecordProps {
  onBack: () => void;
  onRecordSaved: (record: PrescriptionRecord) => void;
}

interface OCRResult {
  patientName?: string;
  prescriptionDate?: string;
  dispensingDate?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    confidence: number | null;
  }>;
  daysSupply?: number;
  hospitalName?: string;
  pharmacyName?: string;
  completionDate?: string;
  confidence: number | null;
  rawText?: string; // 원본 OCR 텍스트 (위치 추정용)
  textAnnotations?: Array<{
    text: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>; // Vision API bounding box 정보
}

// 목업 데이터 (테스트용)
const MOCK_OCR_RESULT: OCRResult = {
  prescriptionDate: "2025.04.15",
  dispensingDate: "2025.04.15",
  medications: [
    {
      name: "염소론정5mg",
      dosage: "1정",
      frequency: "1일 3회",
      confidence: 95,
    },
    {
      name: "세파클러캡슐250mg",
      dosage: "1캡슐",
      frequency: "1일 3회",
      confidence: 92,
    },
    {
      name: "무코스타정100mg",
      dosage: "1정",
      frequency: "1일 3회",
      confidence: 90,
    },
    {
      name: "아세트아미노펜정500mg",
      dosage: "1정",
      frequency: "1일 3회",
      confidence: 93,
    },
  ],
  daysSupply: 3,
  hospitalName: "조치원약국",
  completionDate: "2025.04.18",
  confidence: 92.5,
  rawText: "조치원약국 처방전...",
  textAnnotations: [],
};

export function QuickRecord({ onBack, onRecordSaved }: QuickRecordProps) {
  const [step, setStep] = useState<
    "upload" | "analyzing" | "review" | "success" | "reminder-setup"
  >("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hospitalName, setHospitalName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [symptom, setSymptom] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<PrescriptionRecord | null>(
    null
  );
  const [reminderEnabled, setReminderEnabled] = useState(false);

  // 최근 문진표 관련 상태
  const [recentIntakeForms, setRecentIntakeForms] = useState<IntakeForm[]>([]);
  const [selectedIntakeForm, setSelectedIntakeForm] = useState<IntakeForm | null>(null);
  const [loadingIntakeForms, setLoadingIntakeForms] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 최근 문진표 불러오기
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authMe();
        if (cancelled) return;
        if (me.user) {
          setIsLoggedIn(true);
          const forms = await getMyIntakeForms();
          if (!cancelled) {
            setRecentIntakeForms(forms);
          }
        }
      } catch (e) {
        console.error("Failed to load intake forms:", e);
      } finally {
        if (!cancelled) {
          setLoadingIntakeForms(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 문진표 선택 시 관련 정보 자동 입력
  const handleSelectIntakeForm = (form: IntakeForm) => {
    setSelectedIntakeForm(form);
    // 증상 자동 입력
    if (form.chiefComplaint) {
      setSymptom(form.chiefComplaint);
    }
    // 병원명 자동 입력
    if (form.facility?.name) {
      setHospitalName(form.facility.name);
    }
  };

  // 문진표 선택 해제
  const handleClearIntakeForm = () => {
    setSelectedIntakeForm(null);
    setSymptom("");
    setHospitalName("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      setImageLoaded(false); // 새 이미지 업로드 시 로드 상태 리셋
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setStep("analyzing");
      try {
        const preview = await previewOcr(file);

        // AI OCR 결과 로그 출력 (상세)
        const separator = "=".repeat(80);
        console.log("\n" + separator);
        console.log("🔍 AI OCR 결과 (원본) - 브라우저 콘솔");
        console.log(separator);
        console.log("\n📋 전체 응답:");
        console.log(JSON.stringify(preview, null, 2));
        console.log("\n💊 약물 목록:");
        if (preview.medications && preview.medications.length > 0) {
          preview.medications.forEach((med, idx) => {
            console.log(
              `  ${idx + 1}. ${med.medicationName} (신뢰도: ${med.confidence}%)`
            );
            console.log(`     - 용량: ${med.dose || "없음"}`);
            console.log(`     - 빈도: ${med.frequency || "없음"}`);
            console.log(`     - 기간: ${med.duration || "없음"}`);
            console.log(`     - 처방일: ${med.prescriptionDate || "없음"}`);
            console.log(`     - 조제일: ${med.dispensingDate || "없음"}`);
          });
        } else {
          console.log("  ⚠️ 약물이 추출되지 않았습니다!");
        }
        console.log("\n🏥 병원명:", preview.hospitalName || "없음");
        console.log("🩺 진단명:", preview.patientCondition || "없음");
        console.log("\n📝 전체 텍스트 (처음 1000자):");
        console.log(preview.rawText?.substring(0, 1000) || "없음");
        if (preview.rawText && preview.rawText.length > 1000) {
          console.log(`... (전체 길이: ${preview.rawText.length}자)`);
        }
        console.log("\n📊 신뢰도:", preview.overallConfidence || "없음");
        console.log(separator + "\n");

        // 날짜 형식 변환 함수 (YYYY-MM-DD -> YYYY.MM.DD)
        const formatDateForDisplay = (
          dateStr: string | null | undefined
        ): string | undefined => {
          if (!dateStr) return undefined;
          // 이미 YYYY.MM.DD 형식이면 그대로 반환
          if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) return dateStr;
          // YYYY-MM-DD 형식을 YYYY.MM.DD로 변환
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr.replace(/-/g, ".");
          }
          // 다른 형식도 시도
          const dateMatch = dateStr.match(
            /(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/
          );
          if (dateMatch) {
            return `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
          }
          return dateStr;
        };

        // 약물명 필터링: 실제 약물명만 추출 (빈 문자열, 너무 짧은 텍스트 제외)
        const meds =
          preview.medications && preview.medications.length > 0
            ? preview.medications
                .filter((m) => {
                  const name = m.medicationName?.trim();
                  // 약물명이 없거나 너무 짧으면 제외
                  if (!name || name.length < 2) return false;
                  // 일반적인 약물명이 아닌 텍스트 제외 (이미 서버에서 필터링되지만 추가 검증)
                  const excludePatterns = [
                    /^(환자명|이름|성명|처방일|조제일|발행일|병원|약국|주소|전화|번호|영수증|약제비|본인부담|보험자부담|비급여|카드|계산서|서식|복약안내|환자정보)/i,
                    /^\d+$/, // 숫자만
                    /^[가-힣]{1,2}$/, // 1-2글자 한글만
                  ];
                  return !excludePatterns.some((pattern) => pattern.test(name));
                })
                .map((m) => ({
                  name: m.medicationName.trim(),
                  dosage: m.dose?.trim() ?? "",
                  frequency: m.frequency?.trim() ?? "",
                  confidence:
                    typeof m.confidence === "number" ? m.confidence : null,
                }))
            : preview.meds
                .filter((m) => {
                  const name = m.nameRaw?.trim();
                  return name && name.length >= 2;
                })
                .map((m) => ({
                  name: m.nameRaw.trim(),
                  dosage: "",
                  frequency: "",
                  confidence: m.confidence,
                }));

        // 모든 약물에서 날짜 추출 및 가장 적절한 날짜 선택
        const allPrescriptionDates =
          preview.medications
            ?.map((m) => m.prescriptionDate)
            .filter((d): d is string => !!d) || [];
        const allDispensingDates =
          preview.medications
            ?.map((m) => m.dispensingDate)
            .filter((d): d is string => !!d) || [];

        // 날짜 정규화 함수 (YYYY-MM-DD 또는 YYYY.MM.DD 형식 지원)
        const normalizeDate = (dateStr: string): string => {
          if (!dateStr) return "";
          // YYYY-MM-DD 형식으로 통일
          return dateStr.replace(/\./g, "-").trim();
        };

        // 처방일: 가장 많이 나타나는 날짜 선택 (공통된 날짜)
        let prescriptionDate: string | undefined = undefined;
        if (allPrescriptionDates.length > 0) {
          // 날짜별 빈도 계산
          const dateCounts = new Map<string, number>();
          allPrescriptionDates.forEach((date) => {
            const normalized = normalizeDate(date);
            dateCounts.set(normalized, (dateCounts.get(normalized) || 0) + 1);
          });

          // 가장 많이 나타나는 날짜 선택
          let maxCount = 0;
          let mostCommonDate = "";
          dateCounts.forEach((count, date) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonDate = date;
            }
          });

          prescriptionDate = mostCommonDate || allPrescriptionDates[0];
        }

        // 처방일이 없으면 오늘 날짜 사용
        if (!prescriptionDate) {
          prescriptionDate = new Date().toISOString().split("T")[0];
        }

        // 조제일: 가장 많이 나타나는 날짜 선택 (공통된 날짜)
        let dispensingDate: string | undefined = undefined;
        if (allDispensingDates.length > 0) {
          // 날짜별 빈도 계산
          const dateCounts = new Map<string, number>();
          allDispensingDates.forEach((date) => {
            const normalized = normalizeDate(date);
            dateCounts.set(normalized, (dateCounts.get(normalized) || 0) + 1);
          });

          // 가장 많이 나타나는 날짜 선택
          let maxCount = 0;
          let mostCommonDate = "";
          dateCounts.forEach((count, date) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonDate = date;
            }
          });

          dispensingDate = mostCommonDate || allDispensingDates[0];
        }

        // 날짜 추출 로그
        console.log("\n📅 날짜 추출 로그:");
        console.log("  - 모든 처방일:", allPrescriptionDates);
        console.log("  - 선택된 처방일:", prescriptionDate);
        console.log("  - 모든 조제일:", allDispensingDates);
        console.log("  - 선택된 조제일:", dispensingDate);

        // 투약일수: 모든 약물의 평균 또는 첫 번째 약물의 값
        const firstMed = preview.medications?.[0];
        const daysSupply = firstMed?.totalDoses
          ? Math.ceil(firstMed.totalDoses / (firstMed.dosesPerDay || 1))
          : undefined;

        // 복용완료일 계산 (조제일이 있으면 조제일 + 투약일수, 없으면 처방일 + 투약일수)
        let completionDate: string | undefined = undefined;
        // 조제일을 우선 사용 (조제일이 더 정확한 기준일)
        const baseDate = dispensingDate || prescriptionDate;
        if (baseDate) {
          try {
            // 날짜 파싱 (YYYY-MM-DD 또는 YYYY.MM.DD 형식 지원)
            const dateStr = baseDate.replace(/\./g, "-");
            const startDate = new Date(dateStr);

            // 투약일수가 있으면 추가, 없으면 duration에서 추출 시도
            let daysToAdd = daysSupply || 0;
            if (daysToAdd === 0 && firstMed?.duration) {
              // duration에서 일수 추출 시도 (예: "3일분" -> 3, "7일" -> 7)
              const durationMatch = firstMed.duration.match(/(\d+)\s*일/);
              if (durationMatch) {
                daysToAdd = parseInt(durationMatch[1]) || 0;
              } else {
                // "일" 없이 숫자만 있는 경우
                const numMatch = firstMed.duration.match(/(\d+)/);
                if (numMatch) {
                  daysToAdd = parseInt(numMatch[1]) || 0;
                }
              }
            }

            // 기본값: 7일 (투약일수가 없을 경우)
            if (daysToAdd === 0) {
              daysToAdd = 7;
            }

            if (!isNaN(startDate.getTime())) {
              startDate.setDate(startDate.getDate() + daysToAdd);
              completionDate = formatDateForDisplay(
                startDate.toISOString().split("T")[0]
              );
            }
          } catch {
            // 날짜 파싱 실패 시 무시
          }
        }

        // textAnnotations 확인 로그
        console.log("\n📥 프론트엔드에서 받은 preview 데이터:");
        console.log(
          "  - textAnnotations:",
          preview.textAnnotations
            ? `${preview.textAnnotations.length}개`
            : "없음"
        );
        console.log(
          "  - textAnnotations 타입:",
          typeof preview.textAnnotations
        );
        console.log(
          "  - textAnnotations 배열 여부:",
          Array.isArray(preview.textAnnotations)
        );
        if (preview.textAnnotations && preview.textAnnotations.length > 0) {
          console.log(
            "  - 샘플 (처음 3개):",
            preview.textAnnotations.slice(0, 3).map((a) => ({
              text: a.text?.substring(0, 20),
              bbox: a.boundingBox,
            }))
          );
        }

        const result: OCRResult = {
          patientName: undefined, // OCR에서 추출 불가능하면 undefined
          prescriptionDate:
            formatDateForDisplay(prescriptionDate) ||
            new Date().toISOString().split("T")[0].replace(/-/g, "."),
          dispensingDate: formatDateForDisplay(dispensingDate),
          medications: meds,
          daysSupply,
          hospitalName: preview.hospitalName || undefined,
          pharmacyName: undefined,
          completionDate,
          confidence: preview.overallConfidence,
          rawText: preview.rawText, // 원본 OCR 텍스트 저장
          textAnnotations: preview.textAnnotations || [], // bounding box 정보 저장 (빈 배열로 기본값 설정)
        };

        console.log(
          "  - result.textAnnotations:",
          result.textAnnotations ? `${result.textAnnotations.length}개` : "없음"
        );

        // 처리된 OCR 결과 로그 출력 (상세)
        const separator2 = "=".repeat(80);
        console.log("\n" + separator2);
        console.log("✅ 처리된 OCR 결과 - 브라우저 콘솔");
        console.log(separator2);
        console.log("\n📅 최종 날짜 정보:");
        console.log("  - 처방일:", result.prescriptionDate || "없음");
        console.log("  - 조제일:", result.dispensingDate || "없음");
        console.log("  - 복용완료일:", result.completionDate || "없음");
        console.log(
          "  - 투약일수:",
          result.daysSupply ? `${result.daysSupply}일` : "없음"
        );

        // 날짜 검증: 조제일이 처방일보다 이전이면 경고
        if (result.prescriptionDate && result.dispensingDate) {
          const presDate = new Date(
            result.prescriptionDate.replace(/\./g, "-")
          );
          const dispDate = new Date(result.dispensingDate.replace(/\./g, "-"));
          if (dispDate < presDate) {
            console.warn(
              "⚠️ 경고: 조제일이 처방일보다 이전입니다. 날짜가 잘못 추출되었을 수 있습니다."
            );
          }
        }
        console.log("\n🏥 병원명:", result.hospitalName || "없음");
        console.log("\n💊 약물 목록 (처리 후):");
        if (result.medications.length > 0) {
          result.medications.forEach((med, idx) => {
            console.log(
              `  ${idx + 1}. ${med.name} (신뢰도: ${med.confidence || "없음"}%)`
            );
            console.log(`     - 용량: ${med.dosage || "없음"}`);
            console.log(`     - 빈도: ${med.frequency || "없음"}`);
          });
        } else {
          console.log("  ⚠️ 약물이 없습니다!");
        }
        console.log("\n📊 통계:");
        console.log("  - 약물 개수:", result.medications.length);
        console.log("  - 전체 신뢰도:", result.confidence || "없음");
        console.log(separator2 + "\n");

        setOcrResult(result);
        setHospitalName(preview.hospitalName || "");
        setPharmacyName("");
        if (preview.patientCondition) {
          setSymptom(preview.patientCondition);
        }
        setStep("review");
      } catch (e: any) {
        // 인증 에러 발생 시 로그인 페이지로 리다이렉트
        if (e.message === "unauthorized" || e.status === 401) {
          const returnTo = window.location.pathname;
          window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
          return;
        }

        // 이미지 검증 실패 처리 - 의료 문서가 아닌 경우
        if (e.error === "invalid_medical_document" || e.message?.includes("올바른 의료 문서")) {
          console.error("❌ 이미지 검증 실패:", e.reason || e.message);
          alert(
            `${e.message || "처방전, 약봉투, 조제전이 아닌 사진입니다."}\n\n올바른 의료 문서 사진을 선택해주세요.${e.reason ? `\n\n사유: ${e.reason}` : ""}`
          );
          // 사진 선택 단계로 되돌아가기
          setStep("upload");
          setImagePreview(null);
          setFile(null);
          return;
        }

        // fallback to allow UX test 심각한 에러가 아닌 경우에만 mock 사용
        const mockOCR: OCRResult = {
          medications: [
            {
              name: "분석 실패(테스트)",
              dosage: "",
              frequency: "",
              confidence: null,
            },
          ],
          prescriptionDate: new Date()
            .toISOString()
            .split("T")[0]
            .replace(/-/g, "."),
          confidence: null,
        };
        setOcrResult(mockOCR);
        setStep("review");
      }
    }
  };

  // 목업 데이터 로드 함수
  const handleLoadMockData = () => {
    if (!imagePreview) {
      alert("먼저 사진을 선택해주세요.");
      return;
    }

    setStep("analyzing");

    // 실제 API 호출처럼 약간의 지연 추가
    setTimeout(() => {
      setOcrResult(MOCK_OCR_RESULT);
      setHospitalName(MOCK_OCR_RESULT.hospitalName || "");
      setPharmacyName("");
      setStep("review");
    }, 500);
  };

  const handleSave = async () => {
    if (!ocrResult) return;

    const medications: Medication[] = ocrResult.medications.map((med, idx) => ({
      id: `med-${Date.now()}-${idx}`,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      startDate:
        ocrResult.prescriptionDate?.replace(/\./g, "-") ||
        new Date().toISOString().split("T")[0],
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
        ocrResult.prescriptionDate?.replace(/\./g, "-") ||
        new Date().toISOString().split("T")[0],
      imageUrl: imagePreview || undefined,
      ocrConfidence: ocrResult.confidence ?? undefined,
    };

    // Persist on server
    if (file) {
      try {
        await createRecord({
          patientId: getOrCreatePatientId(),
          recordType: "dispensing_record",
          file,
          chiefComplaint: symptom || undefined,
          facilityName: hospitalName || ocrResult.hospitalName || undefined,
          facilityType: pharmacyName ? "pharmacy" : "unknown",
          noteDoctorSaid: undefined,
          // 사용자가 확인한 데이터를 추가로 전송
          prescribedAt: ocrResult.prescriptionDate
            ? new Date(
                ocrResult.prescriptionDate.replace(/\./g, "-")
              ).toISOString()
            : undefined,
          dispensedAt: ocrResult.dispensingDate
            ? new Date(
                ocrResult.dispensingDate.replace(/\./g, "-")
              ).toISOString()
            : undefined,
          // 상세 약물 정보 포함
          medications: ocrResult.medications.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            confidence: m.confidence ?? undefined,
          })),
          daysSupply: ocrResult.daysSupply,
        });
      } catch (e: any) {
        console.error("저장 실패:", e);
        // if auth required, redirect to login but still allow local UI flow
        if (e.message === "unauthorized" || e.status === 401) {
          window.location.href = "/login";
          return;
        }
      }
    }

    setSavedRecord(record);
    setStep("success");
  };

  const handleEnableReminder = () => {
    setReminderEnabled(true);
    setStep("reminder-setup");
  };

  const handleContinue = () => {
    if (savedRecord) {
      onRecordSaved(savedRecord);
    } else {
      onBack();
    }
  };

  // 복약알림 설정 완료 화면
  if (step === "reminder-setup") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ padding: "24px" }}
      >
        <div
          className="text-center animate-slide-up"
          style={{ maxWidth: "360px" }}
        >
          <div
            style={{
              width: "96px",
              height: "96px",
              margin: "0 auto 32px",
              borderRadius: "28px",
              background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 32px rgba(16, 185, 129, 0.3)",
              position: "relative",
            }}
          >
            <CheckCircle className="w-12 h-12" style={{ color: "white" }} />
            <div
              style={{
                position: "absolute",
                inset: "-12px",
                borderRadius: "32px",
                border: "4px solid #6EE7B7",
                opacity: 0.3,
              }}
            />
          </div>

          <h1 style={{ marginBottom: "16px" }}>설정 완료!</h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              lineHeight: "1.6",
              marginBottom: "40px",
              fontSize: "1.0625rem",
            }}
          >
            매일 복약 시간에
            <br />
            알림을 보내드릴게요
          </p>

          <button onClick={handleContinue} className="btn-primary w-full">
            확인
          </button>
        </div>
      </div>
    );
  }

  // 등록완료 화면
  if (step === "success" && savedRecord) {
    const activeMedications = savedRecord.medications.slice(0, 3);
    const hasMore = savedRecord.medications.length > 3;

    return (
      <div className="min-h-screen pb-8">
        {/* Header with Celebration */}
        <div
          style={{
            background: "var(--gradient-card)",
            padding: "48px 24px 32px",
            borderBottomLeftRadius: "32px",
            borderBottomRightRadius: "32px",
            color: "white",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              opacity: 0.2,
            }}
          >
            <Sparkles className="w-8 h-8" />
          </div>
          <div
            style={{
              position: "absolute",
              top: "40px",
              right: "30px",
              opacity: 0.2,
            }}
          >
            <Sparkles className="w-6 h-6" />
          </div>

          <div
            style={{
              width: "72px",
              height: "72px",
              margin: "0 auto 20px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle className="w-9 h-9" />
          </div>
          <h1 style={{ color: "white", marginBottom: "8px" }}>등록 완료!</h1>
          <p style={{ opacity: 0.9, fontSize: "1rem" }}>
            약 {savedRecord.medications.length}개가 등록되었어요
          </p>
        </div>

        <div style={{ padding: "24px", marginTop: "-12px" }}>
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
                    padding: "20px",
                    background:
                      idx === 0
                        ? "var(--gradient-primary)"
                        : "var(--color-surface)",
                    color: idx === 0 ? "white" : "var(--color-text-primary)",
                    border: idx === 0 ? "none" : undefined,
                    boxShadow:
                      idx === 0
                        ? "0 8px 24px rgba(124, 58, 237, 0.25)"
                        : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontWeight: "700",
                          fontSize: "1.125rem",
                          marginBottom: "4px",
                          color:
                            idx === 0 ? "white" : "var(--color-text-primary)",
                        }}
                      >
                        {med.name}
                      </p>
                      {idx === 0 && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            background: "rgba(255,255,255,0.25)",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontWeight: "700",
                          }}
                        >
                          주요 약물
                        </span>
                      )}
                    </div>
                    {med.confidence && med.confidence < 80 && (
                      <span
                        className="badge-verify"
                        style={{ fontSize: "0.6875rem" }}
                      >
                        <AlertCircle className="w-3 h-3" />
                        확인
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "1rem",
                      lineHeight: "1.6",
                      color:
                        idx === 0
                          ? "rgba(255,255,255,0.95)"
                          : "var(--color-text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    {med.dosage}
                  </p>
                  <p
                    style={{
                      fontSize: "0.9375rem",
                      color:
                        idx === 0
                          ? "rgba(255,255,255,0.85)"
                          : "var(--color-text-tertiary)",
                    }}
                  >
                    {med.frequency}
                  </p>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={handleContinue}
                  className="card"
                  style={{
                    width: "100%",
                    border: "2px dashed var(--color-primary-light)",
                    background: "var(--color-primary-bg)",
                    cursor: "pointer",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      color: "var(--color-primary)",
                      fontWeight: "600",
                    }}
                  >
                    +{savedRecord.medications.length - 3}개 더보기
                  </p>
                </button>
              )}
            </div>

            {/* Reminder CTA Card */}
            <div
              className="card"
              style={{
                marginTop: "32px",
                background: "var(--gradient-primary)",
                border: "none",
                color: "white",
                padding: "28px 24px",
                boxShadow: "0 8px 24px rgba(40, 91, 170, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: "14px",
                    padding: "12px",
                    flexShrink: 0,
                  }}
                >
                  <Bell className="w-7 h-7" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: "white", marginBottom: "8px" }}>
                    복약 알림 켜기
                  </h3>
                  <p
                    style={{
                      fontSize: "0.9375rem",
                      opacity: 0.95,
                      lineHeight: "1.6",
                    }}
                  >
                    아침, 점심, 저녁 식사 시간에
                    <br />약 먹을 시간을 알려드려요
                  </p>
                </div>
              </div>

              <button
                onClick={handleEnableReminder}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "white",
                  color: "var(--color-primary)",
                  border: "none",
                  borderRadius: "14px",
                  fontWeight: "700",
                  fontSize: "1rem",
                  cursor: "pointer",
                  marginBottom: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                알림 켜기
              </button>

              <button
                onClick={handleContinue}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "transparent",
                  color: "white",
                  border: "none",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  opacity: 0.8,
                }}
              >
                나중에 하기
              </button>
            </div>

            {/* Trust Message */}
            <div
              className="trust-badge"
              style={{
                marginTop: "20px",
                width: "100%",
                justifyContent: "center",
                padding: "16px",
              }}
            >
              🔒 사진은 분석 후 즉시 삭제되었어요
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 분석중 화면
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

  // 확인 화면
  if (step === "review" && ocrResult) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #285BAA 0%, #1e4680 100%)",
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
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              color: "white",
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 style={{ color: "white", marginBottom: "8px" }}>
            처방전/조제내역서 확인
          </h2>
          <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
            정보를 확인해주세요
          </p>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Image Preview with Highlights */}
          {imagePreview && (
            <div
              style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                marginBottom: "20px",
                background: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  ref={(img) => {
                    if (img) setImageRef(img);
                  }}
                  src={imagePreview}
                  alt="Prescription"
                  style={{
                    width: "100%",
                    display: "block",
                  }}
                  onLoad={(e) => {
                    // 이미지 로드 완료 후 ref 업데이트 및 로드 상태 설정
                    const img = e.currentTarget;
                    if (img.complete && img.naturalWidth > 0) {
                      setImageRef(img);
                      setImageLoaded(true);
                    }
                  }}
                />
                {showHighlights &&
                  ocrResult &&
                  imageRef &&
                  imageLoaded &&
                  imageRef.complete &&
                  imageRef.naturalWidth > 0 && (
                    <ImageHighlights
                      imageRef={imageRef}
                      ocrResult={ocrResult}
                    />
                  )}
              </div>
              <button
                onClick={() => setShowHighlights(!showHighlights)}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  background: showHighlights
                    ? "var(--color-primary)"
                    : "rgba(0,0,0,0.6)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {showHighlights ? "✓ 하이라이트" : "하이라이트"}
              </button>
            </div>
          )}

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
              marginBottom: "20px",
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

          {/* Extracted Data Fields - Compact */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              border: "1px solid var(--color-border)",
              marginBottom: "20px",
            }}
          >
            {ocrResult.patientName && (
              <CompactOCRField
                label="이름"
                value={ocrResult.patientName}
                isEditing={editingField === "patientName"}
                onEdit={() =>
                  setEditingField(
                    editingField === "patientName" ? null : "patientName"
                  )
                }
                onChange={(val) =>
                  setOcrResult({ ...ocrResult, patientName: val })
                }
                color="#3B82F6"
              />
            )}
            <div
              className="card"
              style={{
                background: "rgba(168, 85, 247, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "#A855F7",
                    flexShrink: 0,
                    boxShadow: "0 0 0 2px rgba(168, 85, 247, 0.08)",
                  }}
                />
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: "var(--color-text-primary)",
                    margin: 0,
                  }}
                >
                  확인된 약물 ({ocrResult.medications.length}개)
                </h3>
              </div>
              <div className="space-y-3">
                {ocrResult.medications.length > 0 ? (
                  ocrResult.medications.map((med, idx) => {
                    const isEditingMed = editingField === `medication-${idx}`;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "16px",
                          background: "var(--color-background)",
                          borderRadius: "0px",
                          border:
                            med.confidence && med.confidence < 80
                              ? "2px solid #FDE68A"
                              : "2px solid var(--color-border)",
                          position: "relative",
                        }}
                      >
                        {isEditingMed ? (
                          <div className="space-y-3">
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <input
                                type="text"
                                value={med.name}
                                onChange={(e) => {
                                  const updated = [...ocrResult.medications];
                                  updated[idx] = {
                                    ...updated[idx],
                                    name: e.target.value,
                                  };
                                  setOcrResult({
                                    ...ocrResult,
                                    medications: updated,
                                  });
                                }}
                                placeholder="약물명"
                                style={{
                                  flex: 1,
                                  padding: "8px 12px",
                                  border: "2px solid var(--color-primary)",
                                  borderRadius: "8px",
                                  fontSize: "0.9375rem",
                                  fontWeight: "600",
                                  color: "var(--color-text-primary)",
                                  background: "white",
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  const updated = [...ocrResult.medications];
                                  updated.splice(idx, 1);
                                  setOcrResult({
                                    ...ocrResult,
                                    medications: updated,
                                  });
                                  setEditingField(null);
                                }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  padding: "8px",
                                  cursor: "pointer",
                                  color: "#EF4444",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingField(null)}
                                style={{
                                  background: "var(--color-primary)",
                                  border: "none",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input
                                type="text"
                                value={med.frequency || ""}
                                onChange={(e) => {
                                  const updated = [...ocrResult.medications];
                                  updated[idx] = {
                                    ...updated[idx],
                                    frequency: e.target.value,
                                  };
                                  setOcrResult({
                                    ...ocrResult,
                                    medications: updated,
                                  });
                                }}
                                placeholder="투약횟수 (예: 식후 3회)"
                                style={{
                                  flex: 1,
                                  padding: "8px 12px",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: "8px",
                                  fontSize: "0.875rem",
                                  color: "var(--color-text-secondary)",
                                  background: "white",
                                }}
                              />
                              <input
                                type="text"
                                value={
                                  ocrResult.daysSupply
                                    ? `${ocrResult.daysSupply}일`
                                    : ""
                                }
                                onChange={(e) => {
                                  const daysMatch =
                                    e.target.value.match(/(\d+)/);
                                  if (daysMatch) {
                                    setOcrResult({
                                      ...ocrResult,
                                      daysSupply: parseInt(daysMatch[1]),
                                    });
                                  }
                                }}
                                placeholder="투약일수"
                                style={{
                                  flex: 1,
                                  padding: "8px 12px",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: "8px",
                                  fontSize: "0.875rem",
                                  color: "var(--color-text-secondary)",
                                  background: "white",
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: "10px",
                              }}
                            >
                              <p
                                style={{
                                  fontWeight: "700",
                                  fontSize: "1.0625rem",
                                  color: "var(--color-text-primary)",
                                }}
                              >
                                {med.name}
                              </p>
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  onClick={() =>
                                    setEditingField(`medication-${idx}`)
                                  }
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    padding: "6px",
                                    cursor: "pointer",
                                    color: "var(--color-text-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = [...ocrResult.medications];
                                    updated.splice(idx, 1);
                                    setOcrResult({
                                      ...ocrResult,
                                      medications: updated,
                                    });
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    padding: "6px",
                                    cursor: "pointer",
                                    color: "#EF4444",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p
                              style={{
                                color: "var(--color-text-secondary)",
                                fontSize: "0.9375rem",
                                lineHeight: "1.5",
                              }}
                            >
                              {med.frequency && ocrResult.daysSupply
                                ? `${med.frequency} / ${ocrResult.daysSupply}일`
                                : med.frequency || ocrResult.daysSupply
                                  ? `${med.frequency || ""}${ocrResult.daysSupply ? ` / ${ocrResult.daysSupply}일` : ""}`.trim()
                                  : "투약 정보 없음"}
                            </p>
                            {med.confidence && med.confidence < 80 && (
                              <span
                                className="badge-verify"
                                style={{
                                  fontSize: "0.6875rem",
                                  marginTop: "8px",
                                  display: "inline-block",
                                }}
                              >
                                확인 필요
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p
                    style={{
                      color: "var(--color-text-tertiary)",
                      fontSize: "0.875rem",
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    약물 정보 없음
                  </p>
                )}
              </div>
            </div>
            {ocrResult.daysSupply && (
              <CompactOCRField
                label="투약일수"
                value={`${ocrResult.daysSupply}일`}
                isEditing={editingField === "daysSupply"}
                onEdit={() =>
                  setEditingField(
                    editingField === "daysSupply" ? null : "daysSupply"
                  )
                }
                onChange={(val) =>
                  setOcrResult({
                    ...ocrResult,
                    daysSupply: parseInt(val) || 0,
                  })
                }
                color="#10B981"
              />
            )}
            <CompactOCRField
              label="처방 병원(발행기관)"
              value={hospitalName || ocrResult.hospitalName || ""}
              isEditing={editingField === "hospitalName"}
              onEdit={() =>
                setEditingField(
                  editingField === "hospitalName" ? null : "hospitalName"
                )
              }
              onChange={(val) => {
                setHospitalName(val);
                setOcrResult({ ...ocrResult, hospitalName: val });
              }}
              color="#EF4444"
            />
            {ocrResult.dispensingDate && (
              <CompactOCRField
                label="조제일자"
                value={ocrResult.dispensingDate}
                isEditing={editingField === "dispensingDate"}
                onEdit={() =>
                  setEditingField(
                    editingField === "dispensingDate" ? null : "dispensingDate"
                  )
                }
                onChange={(val) =>
                  setOcrResult({ ...ocrResult, dispensingDate: val })
                }
                color="#F59E0B"
              />
            )}
            {ocrResult.completionDate && (
              <CompactOCRField
                label="복용완료일"
                value={ocrResult.completionDate}
                isEditing={editingField === "completionDate"}
                onEdit={() =>
                  setEditingField(
                    editingField === "completionDate" ? null : "completionDate"
                  )
                }
                onChange={(val) =>
                  setOcrResult({ ...ocrResult, completionDate: val })
                }
                color="#6366F1"
                isLast={true}
              />
            )}
            {!ocrResult.completionDate && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 16px",
                  background: "transparent",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#6366F1",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "var(--color-text-secondary)",
                    minWidth: "110px",
                    flexShrink: 0,
                  }}
                >
                  복용완료일
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  자동 계산됨
                </span>
              </div>
            )}
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

          {/* Action Buttons */}
          <div
            style={{
              padding: "24px",
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
      </div>
    );
  }

  // 업로드 화면
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
        {/* 최근 문진표 선택 영역 */}
        {isLoggedIn && !loadingIntakeForms && recentIntakeForms.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{
              fontSize: "1rem",
              fontWeight: "700",
              color: "var(--color-text-primary)",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <FileText className="w-5 h-5" style={{ color: "#7C3AED" }} />
              최근 병원 방문 기록 연결
            </h3>
            <p style={{
              fontSize: "0.875rem",
              color: "var(--color-text-secondary)",
              marginBottom: "16px"
            }}>
              문진표와 연결하면 증상 정보가 자동으로 입력됩니다
            </p>

            {/* 선택된 문진표 표시 */}
            {selectedIntakeForm ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
                  border: "2px solid #0EA5E9",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <CheckCircle className="w-5 h-5" style={{ color: "#0EA5E9" }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#0369A1" }}>
                        선택됨
                      </span>
                    </div>
                    <p style={{ fontSize: "1rem", fontWeight: "700", color: "#0C4A6E", marginBottom: "4px" }}>
                      {selectedIntakeForm.chiefComplaint}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "#0369A1" }}>
                      {selectedIntakeForm.facility?.name || "병원 미지정"} · {new Date(selectedIntakeForm.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <button
                    onClick={handleClearIntakeForm}
                    style={{
                      background: "rgba(255,255,255,0.8)",
                      border: "none",
                      padding: "8px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <X className="w-4 h-4" style={{ color: "#64748B" }} />
                  </button>
                </div>
              </div>
            ) : (
              /* 문진표 목록 */
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recentIntakeForms.slice(0, 3).map((form) => (
                  <button
                    key={form.id}
                    onClick={() => handleSelectIntakeForm(form)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: "14px",
                      border: "1px solid #E5E7EB",
                      background: "white",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#7C3AED";
                      e.currentTarget.style.background = "#FAF5FF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.background = "white";
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "#F3E8FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: "#7C3AED" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "0.9375rem",
                        fontWeight: "700",
                        color: "var(--color-text-primary)",
                        marginBottom: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {form.chiefComplaint}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        {form.facility?.name || "병원 미지정"} · {new Date(form.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5" style={{ color: "#9CA3AF", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}

            {/* 구분선 */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "20px",
              marginBottom: "4px"
            }}>
              <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-tertiary)", fontWeight: "500" }}>
                또는
              </span>
              <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          style={{
            border: "3px dashed #E9D5FF",
            borderRadius: "24px",
            padding: selectedIntakeForm ? "40px 24px" : "64px 24px",
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

          {/* 목업 데이터 버튼 (사진 선택 후 표시) */}
          {imagePreview && (
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                onClick={handleLoadMockData}
                className="btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  background: "#F3F4F6",
                  border: "2px solid #D1D5DB",
                  borderRadius: "12px",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                <Sparkles className="w-4 h-4" />
                목업 데이터로 테스트
              </button>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#9CA3AF",
                  marginTop: "8px",
                }}
              >
                AI API 호출 없이 샘플 데이터로 테스트합니다
              </p>
            </div>
          )}
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

// 이미지 위에 텍스트 위치를 색상으로 표시하는 컴포넌트
interface ImageHighlightsProps {
  imageRef: HTMLImageElement | null;
  ocrResult: OCRResult;
}

function ImageHighlights({ imageRef, ocrResult }: ImageHighlightsProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!imageRef || !canvasRef.current || !ocrResult) return;

    // 이미지가 완전히 로드되지 않았으면 대기
    if (
      !imageRef.complete ||
      imageRef.naturalWidth === 0 ||
      imageRef.naturalHeight === 0
    ) {
      console.log("⏳ 이미지 로딩 대기 중...");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas 크기를 이미지 표시 크기와 동일하게 설정
    const displayWidth = imageRef.offsetWidth || imageRef.clientWidth;
    const displayHeight = imageRef.offsetHeight || imageRef.clientHeight;

    // 표시 크기가 0이면 아직 레이아웃이 완료되지 않은 것
    if (displayWidth === 0 || displayHeight === 0) {
      console.log("⏳ 레이아웃 대기 중...");
      return;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // 이미지 원본 크기와 표시 크기 비율 계산
    const imageNaturalWidth = imageRef.naturalWidth;
    const imageNaturalHeight = imageRef.naturalHeight;

    // 디버깅 로그
    console.log("\n" + "=".repeat(80));
    console.log("🔍 ImageHighlights 디버깅");
    console.log("=".repeat(80));
    console.log("표시 크기:", { width: displayWidth, height: displayHeight });
    console.log("원본 크기:", {
      width: imageNaturalWidth,
      height: imageNaturalHeight,
    });
    console.log("스케일 비율:", {
      scaleX: displayWidth / imageNaturalWidth,
      scaleY: displayHeight / imageNaturalHeight,
    });
    console.log(
      "textAnnotations 개수:",
      ocrResult.textAnnotations?.length || 0
    );
    console.log("rawText 길이:", ocrResult.rawText?.length || 0);

    if (ocrResult.textAnnotations && ocrResult.textAnnotations.length > 0) {
      console.log("\n📋 textAnnotations 샘플 (처음 20개):");
      ocrResult.textAnnotations.slice(0, 20).forEach((ann, idx) => {
        console.log(
          `  ${idx + 1}. "${ann.text}" -> 좌표: (${ann.boundingBox.x}, ${ann.boundingBox.y}, ${ann.boundingBox.width}, ${ann.boundingBox.height})`
        );
      });
    }
    console.log("=".repeat(80) + "\n");

    if (imageNaturalWidth === 0 || imageNaturalHeight === 0) {
      console.warn(
        "⚠️ 이미지 원본 크기를 가져올 수 없습니다. 이미지가 완전히 로드되었는지 확인하세요."
      );
      return;
    }

    const scaleX = displayWidth / imageNaturalWidth;
    const scaleY = displayHeight / imageNaturalHeight;

    // 필드별 색상 정의
    const fieldColors: Record<string, string> = {
      prescriptionDate: "#10B981", // 초록색
      dispensingDate: "#F59E0B", // 주황색
      daysSupply: "#EC4899", // 핑크색
      hospitalName: "#EF4444", // 빨간색
      completionDate: "#6366F1", // 인디고색
      medications: "#A855F7", // 보라색
    };

    // Vision API의 bounding box를 사용하여 텍스트 위치 찾기
    const findTextPositionFromAnnotations = (
      searchText: string,
      fieldName: string
    ): { x: number; y: number; width: number; height: number } | null => {
      if (
        !ocrResult.textAnnotations ||
        !searchText ||
        ocrResult.textAnnotations.length === 0
      ) {
        console.log(
          `❌ ${fieldName}: textAnnotations 없음 (${ocrResult.textAnnotations?.length || 0}개)`
        );
        return null;
      }

      // 검색 텍스트 정규화 (여러 형식 지원)
      const normalizeText = (txt: string) => {
        return txt
          .replace(/\./g, "")
          .replace(/-/g, "")
          .replace(/\s/g, "")
          .replace(/일/g, "") // "3일" -> "3"
          .toLowerCase()
          .trim();
      };

      const normalizedSearch = normalizeText(searchText);
      console.log(`\n🔍 ${fieldName} 검색 시작:`, {
        원본텍스트: searchText,
        정규화텍스트: normalizedSearch,
        전체annotations수: ocrResult.textAnnotations.length,
      });

      // textAnnotations에서 매칭되는 텍스트 찾기
      let bestMatch: {
        annotation: (typeof ocrResult.textAnnotations)[0];
        score: number;
        combined?: Array<(typeof ocrResult.textAnnotations)[0]>;
      } | null = null;

      // 1단계: 정확한 매칭 또는 포함 관계 확인
      for (const annotation of ocrResult.textAnnotations) {
        const normalizedAnnotation = normalizeText(annotation.text);

        // 정확한 매칭
        if (normalizedAnnotation === normalizedSearch) {
          bestMatch = { annotation, score: 100 };
          console.log(`✅ ${fieldName} 정확한 매칭: "${annotation.text}"`);
          break;
        }

        // 검색어가 annotation에 포함되는 경우
        if (
          normalizedAnnotation.includes(normalizedSearch) &&
          normalizedSearch.length >= 2
        ) {
          const score =
            (normalizedSearch.length /
              Math.max(normalizedAnnotation.length, 1)) *
            100;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { annotation, score };
          }
        }

        // annotation이 검색어에 포함되는 경우 (짧은 텍스트 매칭)
        if (
          normalizedSearch.includes(normalizedAnnotation) &&
          normalizedAnnotation.length >= 2
        ) {
          const score =
            (normalizedAnnotation.length /
              Math.max(normalizedSearch.length, 1)) *
            90;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { annotation, score };
          }
        }
      }

      // 2단계: 여러 annotation을 합쳐서 찾기 (날짜, 약물명 등)
      if (!bestMatch || bestMatch.score < 70) {
        // 인접한 annotations를 합쳐서 검색
        for (let i = 0; i < ocrResult.textAnnotations.length - 1; i++) {
          const combined = [
            ocrResult.textAnnotations[i],
            ocrResult.textAnnotations[i + 1],
          ];
          const combinedText = combined.map((a) => a.text).join("");
          const normalizedCombined = normalizeText(combinedText);

          if (
            normalizedCombined.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedCombined)
          ) {
            const score = Math.min(
              (normalizedSearch.length /
                Math.max(normalizedCombined.length, 1)) *
                100,
              (normalizedCombined.length /
                Math.max(normalizedSearch.length, 1)) *
                90
            );

            if (!bestMatch || score > bestMatch.score) {
              // 여러 annotation의 bounding box를 합치기
              const xs = combined.flatMap((a) => [
                a.boundingBox.x,
                a.boundingBox.x + a.boundingBox.width,
              ]);
              const ys = combined.flatMap((a) => [
                a.boundingBox.y,
                a.boundingBox.y + a.boundingBox.height,
              ]);

              const combinedBbox = {
                x: Math.min(...xs),
                y: Math.min(...ys),
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys),
              };

              bestMatch = {
                annotation: {
                  ...combined[0],
                  text: combinedText,
                  boundingBox: combinedBbox,
                },
                score,
                combined,
              };
            }
          }
        }
      }

      if (bestMatch && bestMatch.score > 20) {
        const { annotation, combined } = bestMatch;
        let bbox = annotation.boundingBox;

        // 여러 annotation을 합친 경우, 더 정확한 bounding box 계산
        if (combined && combined.length > 1) {
          const xs = combined.flatMap((a) => [
            a.boundingBox.x,
            a.boundingBox.x + a.boundingBox.width,
          ]);
          const ys = combined.flatMap((a) => [
            a.boundingBox.y,
            a.boundingBox.y + a.boundingBox.height,
          ]);

          bbox = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        }

        // bounding box에 여유 공간 추가 (텍스트가 잘리지 않도록)
        const paddingX = Math.max(bbox.width * 0.1, 4); // 너비의 10% 또는 최소 4px
        const paddingY = Math.max(bbox.height * 0.2, 3); // 높이의 20% 또는 최소 3px

        // bounding box 좌표를 canvas 크기에 맞게 스케일링
        const scaledX = bbox.x * scaleX;
        const scaledY = bbox.y * scaleY;
        const scaledWidth = bbox.width * scaleX;
        const scaledHeight = bbox.height * scaleY;
        const scaledPaddingX = paddingX * scaleX;
        const scaledPaddingY = paddingY * scaleY;

        const result = {
          x: Math.max(0, scaledX - scaledPaddingX), // 음수 방지
          y: Math.max(0, scaledY - scaledPaddingY), // 음수 방지
          width: Math.min(
            scaledWidth + scaledPaddingX * 2,
            displayWidth - Math.max(0, scaledX - scaledPaddingX)
          ), // 화면 밖으로 나가지 않도록
          height: Math.min(
            scaledHeight + scaledPaddingY * 2,
            displayHeight - Math.max(0, scaledY - scaledPaddingY)
          ), // 화면 밖으로 나가지 않도록
        };

        // 최소 크기 보장
        result.width = Math.max(result.width, 30);
        result.height = Math.max(result.height, 20);

        console.log(`✅ ${fieldName} 매칭됨:`, {
          원본텍스트: annotation.text,
          원본좌표: bbox,
          패딩: { paddingX, paddingY },
          스케일: { scaleX, scaleY },
          결과좌표: result,
          점수: bestMatch.score.toFixed(1),
        });

        return result;
      }

      console.log(`❌ ${fieldName}: 매칭 실패`, {
        최고점수: bestMatch?.score?.toFixed(1) || 0,
        최고매칭텍스트: bestMatch?.annotation?.text || "없음",
        샘플annotations: ocrResult.textAnnotations.slice(0, 10).map((a) => ({
          텍스트: a.text,
          좌표: a.boundingBox,
        })),
      });
      return null;
    };

    // 텍스트 매칭을 통한 위치 추정 (fallback)
    const rawText = ocrResult.rawText || "";
    const findTextPosition = (
      searchText: string,
      fieldName: string
    ): { x: number; y: number; width: number; height: number } | null => {
      // 먼저 Vision API annotations에서 찾기
      const annotationPos = findTextPositionFromAnnotations(
        searchText,
        fieldName
      );
      if (annotationPos) return annotationPos;

      // 없으면 텍스트 매칭으로 추정
      if (!searchText || !rawText) return null;

      const normalizedSearch = searchText.replace(/\./g, "").replace(/-/g, "");
      const normalizedRaw = rawText.replace(/\./g, "").replace(/-/g, "");

      const index = normalizedRaw.indexOf(normalizedSearch);
      if (index === -1) return null;

      const textRatio = index / normalizedRaw.length;
      const textLengthRatio = normalizedSearch.length / normalizedRaw.length;

      const x = canvas.width * 0.1;
      const y = canvas.height * (0.1 + textRatio * 0.7);
      const width = canvas.width * Math.min(textLengthRatio * 0.8, 0.6);
      const height = canvas.height * 0.03;

      return { x, y, width, height };
    };

    const drawHighlight = (
      text: string,
      color: string,
      position: { x: number; y: number; width: number; height: number } | null,
      fieldName: string
    ) => {
      if (!text) {
        console.log(`⚠️ ${fieldName}: 텍스트 없음`);
        return;
      }

      if (position && position.width > 0 && position.height > 0) {
        // 찾은 위치에 하이라이트 그리기
        // 배경색 (더 투명하게)
        ctx.fillStyle = color + "30"; // 19% 투명도 (더 연하게)
        ctx.fillRect(position.x, position.y, position.width, position.height);

        // 테두리 (더 두껍고 진하게)
        ctx.strokeStyle = color;
        ctx.lineWidth = 4; // 더 두껍게
        ctx.setLineDash([]); // 실선
        ctx.strokeRect(position.x, position.y, position.width, position.height);

        // 모서리 강조 (선택사항)
        const cornerSize = 8;
        ctx.lineWidth = 3;
        // 왼쪽 위 모서리
        ctx.beginPath();
        ctx.moveTo(position.x, position.y + cornerSize);
        ctx.lineTo(position.x, position.y);
        ctx.lineTo(position.x + cornerSize, position.y);
        ctx.stroke();
        // 오른쪽 위 모서리
        ctx.beginPath();
        ctx.moveTo(position.x + position.width - cornerSize, position.y);
        ctx.lineTo(position.x + position.width, position.y);
        ctx.lineTo(position.x + position.width, position.y + cornerSize);
        ctx.stroke();
        // 왼쪽 아래 모서리
        ctx.beginPath();
        ctx.moveTo(position.x, position.y + position.height - cornerSize);
        ctx.lineTo(position.x, position.y + position.height);
        ctx.lineTo(position.x + cornerSize, position.y + position.height);
        ctx.stroke();
        // 오른쪽 아래 모서리
        ctx.beginPath();
        ctx.moveTo(
          position.x + position.width - cornerSize,
          position.y + position.height
        );
        ctx.lineTo(position.x + position.width, position.y + position.height);
        ctx.lineTo(
          position.x + position.width,
          position.y + position.height - cornerSize
        );
        ctx.stroke();

        console.log(`✅ ${fieldName} 하이라이트 그리기:`, {
          텍스트: text.substring(0, 30),
          위치: position,
          색상: color,
        });
      } else {
        console.log(`❌ ${fieldName}: 위치 정보 없음, 하이라이트 건너뜀`);
      }
    };

    // Canvas 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 각 필드별로 하이라이트 그리기
    let highlightCount = 0;

    // 처방일: 여러 형식 시도
    if (ocrResult.prescriptionDate) {
      const dateVariants = [
        ocrResult.prescriptionDate,
        ocrResult.prescriptionDate.replace(/\./g, "-"),
        ocrResult.prescriptionDate.replace(/\./g, ""),
        ocrResult.prescriptionDate.replace(/-/g, "."),
      ];
      let pos = null;
      for (const variant of dateVariants) {
        pos = findTextPosition(variant, "처방일");
        if (pos) break;
      }
      if (pos) {
        drawHighlight(
          ocrResult.prescriptionDate,
          fieldColors.prescriptionDate,
          pos,
          "처방일"
        );
        highlightCount++;
      }
    }

    // 조제일: 여러 형식 시도
    if (ocrResult.dispensingDate) {
      const dateVariants = [
        ocrResult.dispensingDate,
        ocrResult.dispensingDate.replace(/\./g, "-"),
        ocrResult.dispensingDate.replace(/\./g, ""),
        ocrResult.dispensingDate.replace(/-/g, "."),
      ];
      let pos = null;
      for (const variant of dateVariants) {
        pos = findTextPosition(variant, "조제일");
        if (pos) break;
      }
      if (pos) {
        drawHighlight(
          ocrResult.dispensingDate,
          fieldColors.dispensingDate,
          pos,
          "조제일"
        );
        highlightCount++;
      }
    }

    // 병원명: 부분 매칭 허용
    if (ocrResult.hospitalName) {
      const pos = findTextPosition(ocrResult.hospitalName, "병원명");
      if (pos) {
        drawHighlight(
          ocrResult.hospitalName,
          fieldColors.hospitalName,
          pos,
          "병원명"
        );
        highlightCount++;
      } else {
        // 병원명의 일부만 매칭 시도
        const nameParts = ocrResult.hospitalName.split(/[약국|병원|의원]/);
        for (const part of nameParts) {
          if (part.trim().length >= 2) {
            const pos = findTextPosition(part.trim(), "병원명(부분)");
            if (pos) {
              drawHighlight(
                ocrResult.hospitalName,
                fieldColors.hospitalName,
                pos,
                "병원명"
              );
              highlightCount++;
              break;
            }
          }
        }
      }
    }

    // 투약일수: 여러 형식 시도
    if (ocrResult.daysSupply) {
      const daysVariants = [
        `${ocrResult.daysSupply}일`,
        String(ocrResult.daysSupply),
        `${ocrResult.daysSupply}일분`,
      ];
      let pos = null;
      for (const variant of daysVariants) {
        pos = findTextPosition(variant, "투약일수");
        if (pos) break;
      }
      if (pos) {
        drawHighlight(
          `${ocrResult.daysSupply}일`,
          fieldColors.daysSupply,
          pos,
          "투약일수"
        );
        highlightCount++;
      }
    }

    // 약물: 각 약물명의 주요 부분만 매칭 시도
    if (ocrResult.medications && ocrResult.medications.length > 0) {
      ocrResult.medications.forEach((med, idx) => {
        // 약물명에서 주요 부분 추출 (예: "염솔론정" -> "염솔론")
        const medName = med.name;
        const medNameWithoutSuffix = medName.replace(
          /정|캡슐|앰플|시럽|연고|점안액|주사액|과립|포/g,
          ""
        );

        // 여러 변형 시도: 전체 이름, 접미사 제거, 공백 제거 등
        const variants = [
          medName,
          medNameWithoutSuffix,
          medName.replace(/\s/g, ""),
          medNameWithoutSuffix.replace(/\s/g, ""),
        ].filter((v) => v.length >= 2);

        let pos = null;
        let bestVariant = null;
        for (const variant of variants) {
          pos = findTextPosition(variant, `약물${idx + 1}(${variant})`);
          if (pos) {
            bestVariant = variant;
            break;
          }
        }

        if (pos) {
          // 약물명은 같은 색상이지만 각각 다른 박스로 표시
          drawHighlight(
            medName,
            fieldColors.medications,
            pos,
            `약물${idx + 1}: ${medName}`
          );
          highlightCount++;
        } else {
          console.log(`⚠️ 약물${idx + 1} (${medName}) 매칭 실패`);
        }
      });
    }

    console.log(`📊 총 ${highlightCount}개 필드 하이라이트 완료`);
  }, [imageRef, ocrResult]);

  if (!imageRef) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

interface CompactOCRFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  color: string;
  isLast?: boolean;
  multiline?: boolean;
}

function CompactOCRField({
  label,
  value,
  isEditing,
  onEdit,
  onChange,
  color,
  isLast,
  multiline = false,
}: CompactOCRFieldProps) {
  // 날짜 필드 확인 (label에 "일자", "일", "날짜"가 포함되어 있으면 날짜 필드)
  const isDateField = /일자|날짜|일$/.test(label);

  // 색상에 따른 배경색 생성 (투명도 적용)
  // hex 색상을 rgba로 변환
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const backgroundColor = hexToRgba(color, 0.08); // 8% 투명도
  const borderColor = hexToRgba(color, 0.25); // 25% 투명도

  // 날짜 필드인 경우 YYYY.MM.DD 형식을 YYYY-MM-DD로 변환 (date input용)
  const convertToDateInputFormat = (dateStr: string): string => {
    if (!dateStr) return "";
    // YYYY.MM.DD -> YYYY-MM-DD
    return dateStr.replace(/\./g, "-");
  };

  // date input 값을 YYYY.MM.DD 형식으로 변환
  const convertToDisplayFormat = (dateStr: string): string => {
    if (!dateStr) return "";
    // YYYY-MM-DD -> YYYY.MM.DD
    return dateStr.replace(/-/g, ".");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: multiline ? "flex-start" : "center",
        gap: "8px",
        padding: "12px 16px",
        background: backgroundColor,
        borderBottom: isLast ? "none" : `1px solid ${borderColor}`,
        transition: "all 0.2s ease",
      }}
    >
      {/* Color Indicator - 더 크게 */}
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${backgroundColor}`,
        }}
      />

      {/* Label */}
      <span
        style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color: "var(--color-text-secondary)",
          minWidth: "110px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      {/* Value or Input */}
      {isEditing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              padding: "6px 8px",
              border: "2px solid var(--color-primary)",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--color-text-primary)",
              background: "white",
              minHeight: "80px",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        ) : isDateField ? (
          <input
            type="date"
            value={convertToDateInputFormat(value)}
            onChange={(e) => onChange(convertToDisplayFormat(e.target.value))}
            autoFocus
            style={{
              flex: 1,
              padding: "6px 8px",
              border: "2px solid var(--color-primary)",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--color-text-primary)",
              background: "white",
            }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              padding: "6px 8px",
              border: "2px solid var(--color-primary)",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--color-text-primary)",
              background: "white",
            }}
          />
        )
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--color-text-primary)",
            overflow: multiline ? "visible" : "hidden",
            textOverflow: multiline ? "clip" : "ellipsis",
            whiteSpace: multiline ? "pre-line" : "nowrap",
            lineHeight: multiline ? "1.8" : "1.5",
          }}
        >
          {value}
        </span>
      )}

      {/* Edit Icon */}
      <button
        onClick={onEdit}
        style={{
          background: "transparent",
          border: "none",
          padding: "6px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isEditing ? (
          <Check
            className="w-5 h-5"
            style={{ color: "var(--color-primary)" }}
          />
        ) : (
          <Edit3
            className="w-5 h-5"
            style={{ color: "var(--color-text-secondary)" }}
          />
        )}
      </button>
    </div>
  );
}
