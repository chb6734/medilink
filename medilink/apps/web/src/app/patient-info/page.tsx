"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPatientInfo, updatePatientInfo, authMe } from "@/shared/api";
import type { PatientInfo } from "@/shared/api/medilink";
import { ArrowLeft, User, Calendar, Droplet, Ruler, Weight, AlertCircle, Phone } from "lucide-react";
import { AllergySelector } from "@/features/allergy";

export default function PatientInfoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);

  // Form fields
  const [birthDate, setBirthDate] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [emergencyContact, setEmergencyContact] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 인증 확인
        const me = await authMe();
        if (!me.user && !cancelled) {
          router.push("/login?returnTo=/patient-info");
          return;
        }

        // 환자 정보 조회
        const info = await getPatientInfo();
        if (cancelled) return;

        setPatientInfo(info);

        // 폼 필드 초기화
        if (info.birthDate) {
          // ISO 8601 날짜를 YYYY-MM-DD 형식으로 변환
          setBirthDate(info.birthDate.split("T")[0]);
        }
        setBloodType(info.bloodType || "");
        setHeightCm(info.heightCm?.toString() || "");
        setWeightKg(info.weightKg?.toString() || "");
        // 알러지 문자열을 배열로 파싱
        if (info.allergies && info.allergies !== "없음") {
          const allergyList = info.allergies
            .split(/[,、，\n]/)
            .map((a) => a.trim())
            .filter((a) => a.length > 0);
          setSelectedAllergies(allergyList);
        }
        setEmergencyContact(info.emergencyContact || "");
      } catch (error) {
        console.error("Failed to load patient info:", error);
        // 정보 없으면 빈 폼 표시
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 알러지 배열을 문자열로 변환
      const allergiesString =
        selectedAllergies.length > 0 ? selectedAllergies.join(", ") : "없음";

      const updatedInfo = await updatePatientInfo({
        birthDate: birthDate || undefined,
        bloodType: bloodType || undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        allergies: allergiesString,
        emergencyContact: emergencyContact || undefined,
      });

      setPatientInfo(updatedInfo);
      alert("환자 정보가 저장되었습니다.");
      router.back();
    } catch (error) {
      console.error("Failed to save patient info:", error);
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-background)" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <User className="w-8 h-8" />
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "white" }}>
            환자 정보
          </h1>
        </div>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          의료진에게 공유될 기본 정보를 입력해주세요
        </p>
      </div>

      <div style={{ padding: "24px" }}>
        {/* 생년월일 & 만나이 */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: "var(--color-text-secondary)",
              marginBottom: "8px",
            }}
          >
            <Calendar className="w-5 h-5" />
            생년월일
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "2px solid #D1D5DB",
              fontSize: "1.0625rem",
              background: "white",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
          />
          {patientInfo?.age !== null && patientInfo?.age !== undefined && (
            <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              만 {patientInfo.age}세
            </p>
          )}
        </div>

        {/* 혈액형 */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: "var(--color-text-secondary)",
              marginBottom: "8px",
            }}
          >
            <Droplet className="w-5 h-5" />
            혈액형
          </label>
          <select
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "2px solid #D1D5DB",
              fontSize: "1.0625rem",
              background: "white",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
          >
            <option value="">선택하세요</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        {/* 키 & 몸무게 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {/* 키 */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.9375rem",
                fontWeight: "700",
                color: "var(--color-text-secondary)",
                marginBottom: "8px",
              }}
            >
              <Ruler className="w-5 h-5" />
              키 (cm)
            </label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="175.5"
              step="0.1"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "2px solid #D1D5DB",
                fontSize: "1.0625rem",
                background: "white",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
          </div>

          {/* 몸무게 */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.9375rem",
                fontWeight: "700",
                color: "var(--color-text-secondary)",
                marginBottom: "8px",
              }}
            >
              <Weight className="w-5 h-5" />
              몸무게 (kg)
            </label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="70.2"
              step="0.1"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "2px solid #D1D5DB",
                fontSize: "1.0625rem",
                background: "white",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
          </div>
        </div>

        {/* 알레르기 */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: "var(--color-text-secondary)",
              marginBottom: "12px",
            }}
          >
            <AlertCircle className="w-5 h-5" />
            알레르기 정보
          </label>
          <AllergySelector
            value={selectedAllergies}
            onChange={setSelectedAllergies}
            customAllergies={customAllergies}
            onCustomAllergiesChange={setCustomAllergies}
          />
          <p style={{ marginTop: "12px", fontSize: "0.875rem", color: "var(--color-text-tertiary)" }}>
            문진표 작성 시 자동으로 불러옵니다
          </p>
        </div>

        {/* 비상연락처 */}
        <div style={{ marginBottom: "32px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: "var(--color-text-secondary)",
              marginBottom: "8px",
            }}
          >
            <Phone className="w-5 h-5" />
            비상연락처
          </label>
          <input
            type="tel"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="010-1234-5678"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "2px solid #D1D5DB",
              fontSize: "1.0625rem",
              background: "white",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "16px",
            border: "none",
            background: saving ? "#9CA3AF" : "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)",
            color: "white",
            fontSize: "1rem",
            fontWeight: "700",
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(40, 91, 170, 0.3)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(40, 91, 170, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 91, 170, 0.3)";
            }
          }}
        >
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}
