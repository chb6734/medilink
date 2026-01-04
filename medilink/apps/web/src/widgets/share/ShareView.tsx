"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, QrCode, RefreshCw, Clock, CheckCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  SHARE_TOKEN_EXPIRY_SECONDS,
  LOW_TIME_WARNING_THRESHOLD,
  SECONDS_PER_MINUTE,
} from "./lib/constants";

interface ShareViewProps {
  token: string;
  onBack: () => void;
  onRegenerateToken: () => void;
}

export function ShareView({
  token,
  onBack,
  onRegenerateToken,
}: ShareViewProps) {
  const [timeLeft, setTimeLeft] = useState(SHARE_TOKEN_EXPIRY_SECONDS);
  const origin = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.origin),
    []
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [token]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / SECONDS_PER_MINUTE);
    const secs = seconds % SECONDS_PER_MINUTE;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRegenerate = () => {
    onRegenerateToken();
    setTimeLeft(SHARE_TOKEN_EXPIRY_SECONDS);
  };

  const isLowTime = timeLeft < LOW_TIME_WARNING_THRESHOLD;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--color-border)",
          padding: "16px 24px",
          background: "var(--color-surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            marginLeft: "-8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--color-text-primary)",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>의사에게 공유</span>
        </button>
      </div>

      <div className="px-6 py-8">
        {/* Success Message */}
        <div
          style={{
            padding: "20px",
            background: "var(--color-success-bg)",
            border: "1px solid #A7F3D0",
            borderRadius: "12px",
            marginBottom: "32px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <CheckCircle
            className="w-5 h-5"
            style={{
              color: "var(--color-success)",
              marginTop: "2px",
              flexShrink: 0,
            }}
          />
          <div>
            <p
              style={{
                color: "#065F46",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              설문 완료!
            </p>
            <p
              style={{
                color: "#065F46",
                fontSize: "0.9375rem",
              }}
            >
              아래 QR 코드를 의사에게 보여주세요
            </p>
          </div>
        </div>

        {/* Timer */}
        <div
          className="card"
          style={{
            padding: "20px",
            marginBottom: "24px",
            background:
              isLowTime ? "var(--color-alert-bg)" : "var(--color-surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Clock
                className="w-5 h-5"
                style={{
                  color:
                    isLowTime
                      ? "var(--color-alert)"
                      : "var(--color-text-secondary)",
                }}
              />
              <span
                style={{
                  color:
                    isLowTime
                      ? "var(--color-alert)"
                      : "var(--color-text-primary)",
                }}
              >
                남은 시간
              </span>
            </div>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                fontFamily: "monospace",
                color:
                  isLowTime ? "var(--color-alert)" : "var(--color-accent)",
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          {isLowTime && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "0.875rem",
                color: "var(--color-alert)",
              }}
            >
              곧 만료됩니다. 새로 발급받으세요.
            </p>
          )}
        </div>

        {/* QR Code - 크게 */}
        <div
          className="card"
          style={{
            padding: "32px 24px",
            marginBottom: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* 라벨 - QR 코드 위에 위치 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--color-accent-light)",
              color: "#4338CA",
              padding: "8px 16px",
              borderRadius: "8px",
              marginBottom: "24px",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}
          >
            <QrCode className="w-4 h-4" />
            <span>의료진 전용 코드</span>
          </div>

          {/* QR 코드 */}
          <div
            style={{
              padding: "24px",
              background: "white",
              borderRadius: "16px",
              border: "4px solid var(--color-border)",
              marginBottom: "24px",
            }}
          >
            <QRCodeSVG
              value={`${origin}/doctor/${encodeURIComponent(token)}`}
              size={240}
              level="M"
            />
          </div>

          {/* 안내 텍스트 */}
          <p
            style={{
              color: "var(--color-text-secondary)",
              lineHeight: "1.5",
              fontSize: "1rem",
              textAlign: "center",
              margin: 0,
            }}
          >
            진료실에서 의사나 간호사에게
            <br />이 화면을 보여주세요
          </p>
        </div>

        {/* Regenerate Button */}
        <button
          onClick={handleRegenerate}
          style={{
            width: "100%",
            padding: "16px",
            background: "transparent",
            border: "2px solid var(--color-accent)",
            borderRadius: "12px",
            color: "var(--color-accent)",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            minHeight: "56px",
          }}
        >
          <RefreshCw className="w-5 h-5" />
          <span>새 코드 발급받기</span>
        </button>

        {/* Info */}
        <div
          style={{
            marginTop: "24px",
            padding: "20px",
            background: "var(--color-accent-light)",
            borderRadius: "12px",
            border: "1px solid #E0E7FF",
          }}
        >
          <h3
            style={{
              marginBottom: "12px",
              fontSize: "1rem",
              color: "var(--color-text-primary)",
            }}
          >
            📌 안내사항
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              color: "var(--color-text-secondary)",
              fontSize: "0.9375rem",
              lineHeight: "1.6",
            }}
          >
            <li style={{ marginBottom: "8px" }}>• 코드는 10분간 유효해요</li>
            <li style={{ marginBottom: "8px" }}>
              • 10분 안에는 여러 번 볼 수 있어요
            </li>
            <li style={{ marginBottom: "8px" }}>
              • 새 코드를 받으면 이전 코드는 사용할 수 없어요
            </li>
            <li>• 진료가 끝나면 자동으로 삭제돼요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
