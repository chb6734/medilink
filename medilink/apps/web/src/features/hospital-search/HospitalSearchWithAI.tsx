"use client";

import React, { useState, useEffect } from "react";
import { Search, Building2, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { searchFacilities, recommendSpecialty } from "@/shared/api";
import type { Facility } from "@/shared/api/medilink";

interface HospitalSearchWithAIProps {
  chiefComplaint?: string; // 주요 증상
  symptomDetail?: string; // 증상 상세 (선택)
  onSelect: (hospital: Facility) => void;
  initialKeyword?: string;
}

export function HospitalSearchWithAI({
  chiefComplaint,
  symptomDetail,
  onSelect,
  initialKeyword = "",
}: HospitalSearchWithAIProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [recommendedSpecialty, setRecommendedSpecialty] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  // 증상 기반 AI 과별 추천
  useEffect(() => {
    // 주요 증상이 없으면 추천하지 않음
    if (!chiefComplaint || chiefComplaint.trim().length < 2) {
      setRecommendedSpecialty(null);
      setAiReasoning(null);
      return;
    }

    let cancelled = false;
    setAiLoading(true);

    (async () => {
      try {
        const result = await recommendSpecialty({
          chiefComplaint: chiefComplaint.trim(),
          symptomDetail: symptomDetail?.trim() || undefined,
        });
        if (!cancelled) {
          setRecommendedSpecialty(result.primarySpecialty);
          setAiReasoning(result.reasoning);
        }
      } catch (error) {
        console.error("Failed to recommend specialty:", error);
        if (!cancelled) {
          setRecommendedSpecialty(null);
          setAiReasoning(null);
        }
      } finally {
        if (!cancelled) {
          setAiLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chiefComplaint, symptomDetail]);

  // 병원 검색 - 키워드로만 검색 (specialty 자동 필터링 제거)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const result = await searchFacilities({
          keyword: keyword.trim() || undefined,
        });

        if (!cancelled) {
          setFacilities(result.facilities);
        }
      } catch (error) {
        console.error("Failed to search facilities:", error);
        if (!cancelled) {
          setFacilities([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keyword]);

  return (
    <div>
      {/* AI 추천 과목 표시 */}
      {aiLoading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "16px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
            border: "1px solid #BFDBFE",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#3B82F6" }} />
            <p style={{ fontSize: "0.9375rem", fontWeight: "600", color: "#1E40AF" }}>
              AI가 증상을 분석하고 있습니다...
            </p>
          </div>
        </div>
      )}

      {recommendedSpecialty && !aiLoading && (
        <button
          type="button"
          onClick={() => setKeyword(recommendedSpecialty)}
          style={{
            width: "100%",
            marginBottom: "16px",
            padding: "16px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
            border: "2px solid #7DD3FC",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "white" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "#0C4A6E", marginBottom: "4px" }}>
                AI 추천 과
              </p>
              <p style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0369A1", marginBottom: "6px" }}>
                {recommendedSpecialty}
              </p>
              {aiReasoning && (
                <p style={{ fontSize: "0.875rem", color: "#075985", lineHeight: 1.5, marginBottom: "8px" }}>
                  {aiReasoning}
                </p>
              )}
              <p style={{ fontSize: "0.75rem", color: "#0EA5E9", fontWeight: "600" }}>
                탭하여 검색하기
              </p>
            </div>
          </div>
        </button>
      )}

      {/* 병원 검색창 */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
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
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="병원 이름 또는 진료과 검색..."
          style={{
            width: "100%",
            padding: "14px 14px 14px 44px",
            border: "2px solid #D1D5DB",
            borderRadius: 14,
            fontSize: "1.0625rem",
            background: "white",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
        />
      </div>

      {/* 병원 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px" }}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: "#3B82F6" }} />
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              병원 검색 중...
            </p>
          </div>
        ) : facilities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ fontSize: "0.9375rem", color: "var(--color-text-secondary)" }}>
              검색 결과가 없습니다
            </p>
          </div>
        ) : (
          facilities.map((facility) => (
            <button
              key={facility.id}
              onClick={() => onSelect(facility)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "16px 16px",
                borderRadius: 16,
                border: "1px solid #E5E7EB",
                background: "white",
                display: "flex",
                alignItems: "center",
                gap: 14,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.transform = "translateX(0)";
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
                <Building2 className="w-6 h-6" style={{ color: "#2563EB" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.0625rem" }}>
                    {facility.name}
                  </div>
                  <div
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "#EFF6FF",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "#1E40AF",
                    }}
                  >
                    {facility.typeLabel}
                  </div>
                </div>
                {facility.specialty && (
                  <div style={{ fontSize: "0.875rem", color: "#059669", fontWeight: "600", marginBottom: 2 }}>
                    {facility.specialty}
                  </div>
                )}
                {facility.address && (
                  <div
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.8125rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {facility.address}
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: "#9CA3AF", flexShrink: 0 }} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
