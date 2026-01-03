"use client";

import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";

// 일반적인 약물 알러지
const DRUG_ALLERGIES = [
  { id: "penicillin", name: "페니실린", category: "항생제" },
  { id: "amoxicillin", name: "아목시실린", category: "항생제" },
  { id: "cephalosporin", name: "세팔로스포린", category: "항생제" },
  { id: "sulfonamide", name: "설폰아미드 (설파제)", category: "항생제" },
  { id: "quinolone", name: "퀴놀론계 (레보플록사신 등)", category: "항생제" },
  { id: "macrolide", name: "마크로라이드 (아지스로마이신 등)", category: "항생제" },
  { id: "tetracycline", name: "테트라사이클린", category: "항생제" },
  { id: "vancomycin", name: "반코마이신", category: "항생제" },
  { id: "aspirin", name: "아스피린", category: "진통소염제" },
  { id: "ibuprofen", name: "이부프로펜", category: "진통소염제" },
  { id: "naproxen", name: "나프록센", category: "진통소염제" },
  { id: "nsaids", name: "NSAIDs (비스테로이드성 소염제 전체)", category: "진통소염제" },
  { id: "acetaminophen", name: "아세트아미노펜 (타이레놀)", category: "진통제" },
  { id: "codeine", name: "코데인", category: "마약성 진통제" },
  { id: "morphine", name: "모르핀", category: "마약성 진통제" },
  { id: "tramadol", name: "트라마돌", category: "마약성 진통제" },
  { id: "lidocaine", name: "리도카인", category: "마취제" },
  { id: "local_anesthetic", name: "국소마취제", category: "마취제" },
  { id: "general_anesthetic", name: "전신마취제", category: "마취제" },
  { id: "contrast_dye", name: "조영제 (CT/MRI)", category: "진단약물" },
  { id: "iodine", name: "요오드", category: "진단약물" },
  { id: "insulin", name: "인슐린", category: "호르몬제" },
  { id: "heparin", name: "헤파린", category: "항응고제" },
  { id: "warfarin", name: "와파린", category: "항응고제" },
  { id: "statin", name: "스타틴 (고지혈증약)", category: "심혈관계" },
  { id: "ace_inhibitor", name: "ACE억제제 (혈압약)", category: "심혈관계" },
  { id: "beta_blocker", name: "베타차단제", category: "심혈관계" },
  { id: "metformin", name: "메트포르민", category: "당뇨약" },
  { id: "sulfa_diabetes", name: "설포닐우레아 (당뇨약)", category: "당뇨약" },
];

// 식품 알러지
const FOOD_ALLERGIES = [
  { id: "peanut", name: "땅콩", category: "식품" },
  { id: "tree_nut", name: "견과류 (아몬드, 호두 등)", category: "식품" },
  { id: "milk", name: "우유/유제품", category: "식품" },
  { id: "egg", name: "계란", category: "식품" },
  { id: "wheat", name: "밀 (글루텐)", category: "식품" },
  { id: "soy", name: "대두/콩", category: "식품" },
  { id: "fish", name: "생선", category: "식품" },
  { id: "shellfish", name: "갑각류 (새우, 게 등)", category: "식품" },
  { id: "sesame", name: "참깨", category: "식품" },
  { id: "buckwheat", name: "메밀", category: "식품" },
  { id: "peach", name: "복숭아", category: "식품" },
  { id: "mango", name: "망고", category: "식품" },
  { id: "kiwi", name: "키위", category: "식품" },
];

// 기타 알러지
const OTHER_ALLERGIES = [
  { id: "latex", name: "라텍스 (고무)", category: "기타" },
  { id: "bee_venom", name: "벌독", category: "기타" },
  { id: "wasp_venom", name: "말벌독", category: "기타" },
  { id: "cat", name: "고양이 털/비듬", category: "환경" },
  { id: "dog", name: "개 털/비듬", category: "환경" },
  { id: "dust_mite", name: "집먼지 진드기", category: "환경" },
  { id: "pollen", name: "꽃가루", category: "환경" },
  { id: "mold", name: "곰팡이", category: "환경" },
];

const ALL_ALLERGIES = [...DRUG_ALLERGIES, ...FOOD_ALLERGIES, ...OTHER_ALLERGIES];

type AllergySelectorProps = {
  value: string[];
  onChange: (allergies: string[]) => void;
  customAllergies?: string[];
  onCustomAllergiesChange?: (custom: string[]) => void;
};

export function AllergySelector({
  value,
  onChange,
  customAllergies = [],
  onCustomAllergiesChange,
}: AllergySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(ALL_ALLERGIES.map((a) => a.category));
    return Array.from(cats);
  }, []);

  const filteredAllergies = useMemo(() => {
    let filtered = ALL_ALLERGIES;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query)
      );
    }

    if (activeCategory) {
      filtered = filtered.filter((a) => a.category === activeCategory);
    }

    return filtered;
  }, [searchQuery, activeCategory]);

  const toggleAllergy = (allergyName: string) => {
    if (value.includes(allergyName)) {
      onChange(value.filter((a) => a !== allergyName));
    } else {
      onChange([...value, allergyName]);
    }
  };

  const addCustomAllergy = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customAllergies.includes(trimmed) && !value.includes(trimmed)) {
      onCustomAllergiesChange?.([...customAllergies, trimmed]);
      onChange([...value, trimmed]);
      setCustomInput("");
    }
  };

  const removeCustomAllergy = (allergy: string) => {
    onCustomAllergiesChange?.(customAllergies.filter((a) => a !== allergy));
    onChange(value.filter((a) => a !== allergy));
  };

  const selectedCount = value.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 검색창 */}
      <div style={{ position: "relative" }}>
        <Search
          className="w-5 h-5"
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9CA3AF",
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="알러지 검색 (예: 페니실린, 땅콩)"
          style={{
            width: "100%",
            padding: "14px 14px 14px 44px",
            borderRadius: "14px",
            border: "2px solid #E5E7EB",
            fontSize: "1rem",
            background: "white",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
        />
      </div>

      {/* 선택된 알러지 표시 */}
      {selectedCount > 0 && (
        <div
          style={{
            background: "#FEF3C7",
            borderRadius: "12px",
            padding: "12px 14px",
            border: "1px solid #FCD34D",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: "700",
              color: "#92400E",
              marginBottom: "8px",
            }}
          >
            선택된 알러지 ({selectedCount}개)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {value.map((allergy) => (
              <span
                key={allergy}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "#F59E0B",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                {allergy}
                <button
                  onClick={() => {
                    if (customAllergies.includes(allergy)) {
                      removeCustomAllergy(allergy);
                    } else {
                      toggleAllergy(allergy);
                    }
                  }}
                  style={{
                    background: "rgba(255,255,255,0.3)",
                    border: "none",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X className="w-3 h-3" style={{ color: "white" }} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 필터 */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            background: !activeCategory ? "#285BAA" : "#F3F4F6",
            color: !activeCategory ? "white" : "#6B7280",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category === activeCategory ? null : category)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "none",
              background: activeCategory === category ? "#285BAA" : "#F3F4F6",
              color: activeCategory === category ? "white" : "#6B7280",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* 알러지 목록 */}
      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          border: "2px solid #E5E7EB",
          borderRadius: "14px",
          background: "white",
        }}
      >
        {filteredAllergies.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center" }}>
            <p style={{ color: "#9CA3AF", fontSize: "0.9375rem" }}>
              검색 결과가 없습니다
            </p>
          </div>
        ) : (
          filteredAllergies.map((allergy, index) => {
            const isSelected = value.includes(allergy.name);
            return (
              <button
                key={allergy.id}
                onClick={() => toggleAllergy(allergy.name)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isSelected ? "#EFF6FF" : "white",
                  border: "none",
                  borderBottom:
                    index < filteredAllergies.length - 1 ? "1px solid #F3F4F6" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? "#285BAA" : "#111827",
                      marginBottom: "2px",
                    }}
                  >
                    {allergy.name}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                    {allergy.category}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5" style={{ color: "#285BAA" }} />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 직접 입력 */}
      <div>
        <p
          style={{
            fontSize: "0.8125rem",
            fontWeight: "600",
            color: "#6B7280",
            marginBottom: "8px",
          }}
        >
          목록에 없는 알러지 직접 입력
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomAllergy();
              }
            }}
            placeholder="알러지명 입력"
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: "12px",
              border: "2px solid #E5E7EB",
              fontSize: "0.9375rem",
              background: "white",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          />
          <button
            onClick={addCustomAllergy}
            disabled={!customInput.trim()}
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              background: customInput.trim() ? "#285BAA" : "#E5E7EB",
              color: customInput.trim() ? "white" : "#9CA3AF",
              fontSize: "0.9375rem",
              fontWeight: "600",
              cursor: customInput.trim() ? "pointer" : "not-allowed",
            }}
          >
            추가
          </button>
        </div>
      </div>

      {/* 알러지 없음 옵션 */}
      <button
        onClick={() => {
          onChange([]);
          onCustomAllergiesChange?.([]);
        }}
        style={{
          padding: "14px",
          borderRadius: "12px",
          border: "2px solid #E5E7EB",
          background: selectedCount === 0 ? "#F0FDF4" : "white",
          color: selectedCount === 0 ? "#065F46" : "#6B7280",
          fontSize: "0.9375rem",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {selectedCount === 0 && <Check className="w-5 h-5" />}
        알러지 없음
      </button>
    </div>
  );
}
