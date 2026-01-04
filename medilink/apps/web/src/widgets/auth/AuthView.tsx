import { ArrowLeft, Eye, EyeOff, Calendar, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  authMe,
  authLogin,
  authRegister,
  authFindPhone,
  authResetPasswordStart,
  authResetPasswordComplete,
} from "@/shared/api";
import { getApiBaseUrl } from "@/shared/lib/config";
import { getErrorMessage } from "@/shared/lib/error";
import { formatPhoneNumber, toE164Kr } from "@/features/auth/lib";

type SessionUser = {
  id: string;
  provider: "google" | "phone" | "password";
  subject: string;
  displayName?: string;
  phoneE164?: string;
};

type AuthMode = "login" | "register" | "find-phone" | "reset-password";

export function AuthView({
  onBack,
  onDone,
}: {
  onBack?: () => void;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ??
    "";

  const [googleLoading, setGoogleLoading] = useState(false);

  // 인증 모드
  const [mode, setMode] = useState<AuthMode>("login");

  // 공통
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 회원가입/비밀번호 재설정
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");

  // 아이디 찾기
  const [findName, setFindName] = useState("");
  const [findBirthDate, setFindBirthDate] = useState("");
  const [foundPhone, setFoundPhone] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [socialHover, setSocialHover] = useState<
    "google" | "kakao" | "naver" | null
  >(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const me = await authMe();
      setAuthEnabled(!!me.authEnabled);
      setUser(me.user as SessionUser | null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // server-side redirect에서 전달된 에러 메시지 표시 (/login?error=...&message=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const e = sp.get("error");
    if (!e) return;
    const msg = sp.get("message");
    if (e === "google_oauth_not_configured") {
      setError(
        `Google OAuth 설정이 필요해요. API 서버 환경변수(GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI)를 확인하세요.\n${msg ? `(${msg})` : ""}`
      );
      setGoogleLoading(false);
      return;
    }
    setError(`${e}${msg ? `: ${msg}` : ""}`);
    setGoogleLoading(false);
  }, []);

  // 로그인 성공 시 자동으로 홈으로 이동
  useEffect(() => {
    if (!user) return;
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    onDone();
  }, [user, onDone]);

  const canUseGoogle = useMemo(
    () => !!googleClientId && !!authEnabled,
    [googleClientId, authEnabled]
  );

  const isLoading = actionLoading || googleLoading;

  // 모드 변경 시 입력값 초기화
  const changeMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setChallengeId(null);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setFoundPhone(null);
  };

  // 비밀번호 로그인
  const handleLogin = async () => {
    setError(null);
    setActionLoading(true);
    try {
      await authLogin({
        phoneE164: toE164Kr(phone),
        password,
      });
      await refresh();
    } catch (e) {
      const msg = getErrorMessage(e);
      if (msg.includes("invalid_credentials")) {
        setError("전화번호 또는 비밀번호가 일치하지 않습니다.");
      } else {
        setError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 회원가입
  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      await authRegister({
        phoneE164: toE164Kr(phone),
        password,
        name: name || undefined,
      });
      await refresh();
    } catch (e) {
      const msg = getErrorMessage(e);
      if (msg.includes("phone_already_registered")) {
        setError("이미 가입된 전화번호입니다.");
      } else {
        setError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 아이디 찾기
  const handleFindPhone = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const r = await authFindPhone({
        name: findName,
        birthDate: findBirthDate,
      });
      setFoundPhone(r.maskedPhone);
    } catch (e) {
      const msg = getErrorMessage(e);
      if (msg.includes("user_not_found")) {
        setError("일치하는 회원 정보를 찾을 수 없습니다.");
      } else {
        setError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 비밀번호 재설정 - 인증번호 요청
  const handleResetStart = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const r = await authResetPasswordStart({
        phoneE164: toE164Kr(phone),
      });
      setChallengeId(r.challengeId);
      setSuccess("인증번호가 발송되었습니다.");
    } catch (e) {
      const msg = getErrorMessage(e);
      if (msg.includes("user_not_found")) {
        setError("가입되지 않은 전화번호입니다.");
      } else {
        setError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 비밀번호 재설정 - 완료
  const handleResetComplete = async () => {
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      await authResetPasswordComplete({
        challengeId: challengeId!,
        code,
        newPassword: password,
      });
      setSuccess("비밀번호가 변경되었습니다. 로그인해주세요.");
      setTimeout(() => {
        changeMode("login");
      }, 1500);
    } catch (e) {
      const msg = getErrorMessage(e);
      if (msg.includes("invalid_code")) {
        setError("인증번호가 올바르지 않습니다.");
      } else if (msg.includes("challenge_expired")) {
        setError("인증번호가 만료되었습니다. 다시 시도해주세요.");
        setChallengeId(null);
      } else {
        setError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ padding: 24 }}
      >
        <div className="card" style={{ padding: 20, maxWidth: 520 }}>
          <h3 style={{ marginBottom: 8 }}>불러오는 중</h3>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            로그인 상태를 확인하고 있어요.
          </p>
        </div>
      </div>
    );
  }

  const getModeTitle = () => {
    switch (mode) {
      case "login":
        return "로그인";
      case "register":
        return "회원가입";
      case "find-phone":
        return "아이디 찾기";
      case "reset-password":
        return "비밀번호 찾기";
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case "login":
        return "연속진료 서비스를 이용하시려면 로그인이 필요해요";
      case "register":
        return "휴대폰 번호로 간편하게 가입하세요";
      case "find-phone":
        return "이름과 생년월일로 휴대폰 번호를 찾아드려요";
      case "reset-password":
        return "휴대폰 인증 후 새 비밀번호를 설정하세요";
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-background)" }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px 24px",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => {
            if (mode !== "login") {
              changeMode("login");
            } else {
              onBack?.();
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            color: "var(--color-text-primary)",
          }}
          aria-label="뒤로"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 style={{ marginBottom: "8px" }}>{getModeTitle()}</h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.9375rem",
          }}
        >
          {getModeDescription()}
        </p>
      </div>

      <div style={{ padding: "32px 24px" }}>
        {error && (
          <div
            className="card"
            style={{ padding: 16, border: "2px solid #FDE68A", marginBottom: 20 }}
          >
            <p style={{ margin: 0, color: "#92400E", fontWeight: 700 }}>에러</p>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: "#92400E",
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
          </div>
        )}

        {success && (
          <div
            className="card"
            style={{ padding: 16, border: "2px solid #86EFAC", marginBottom: 20 }}
          >
            <p style={{ margin: 0, color: "#166534", fontWeight: 700 }}>성공</p>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: "#166534",
                lineHeight: 1.5,
              }}
            >
              {success}
            </p>
          </div>
        )}

        {/* 로그인 화면 */}
        {mode === "login" && (
          <div className="space-y-5">
            {/* Phone Number */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                }}
              >
                휴대폰 번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                maxLength={13}
                className="input-field"
                style={{ fontSize: "1.0625rem" }}
                disabled={!authEnabled || isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                }}
              >
                비밀번호
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="input-field"
                  style={{ fontSize: "1.0625rem", paddingRight: "52px" }}
                  disabled={!authEnabled || isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phone && password) {
                      handleLogin();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-tertiary)",
                    padding: "8px",
                  }}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {!authEnabled && (
                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    color: "var(--color-text-tertiary)",
                    fontSize: "0.875rem",
                  }}
                >
                  서버에서 인증이 꺼져 있어요. (AUTH_ENABLED=false)
                </p>
              )}
            </div>

            {/* Login Button */}
            <button
              disabled={!authEnabled || isLoading || !phone || !password}
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: "24px",
                opacity: !authEnabled || isLoading || !phone || !password ? 0.6 : 1,
                cursor: !authEnabled || isLoading || !phone || !password ? "not-allowed" : "pointer",
              }}
              onClick={handleLogin}
            >
              {actionLoading ? "처리 중..." : "로그인"}
            </button>

            {/* Links */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => changeMode("find-phone")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-secondary)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                아이디 찾기
              </button>
              <span style={{ color: "var(--color-border)" }}>|</span>
              <button
                type="button"
                onClick={() => changeMode("reset-password")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-secondary)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                비밀번호 찾기
              </button>
              <span style={{ color: "var(--color-border)" }}>|</span>
              <button
                type="button"
                onClick={() => changeMode("register")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-primary)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                회원가입
              </button>
            </div>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                margin: "48px 0 32px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "var(--color-border)",
                }}
              />
              <span
                style={{
                  color: "var(--color-text-tertiary)",
                  fontSize: "0.875rem",
                  whiteSpace: "nowrap",
                }}
              >
                간편 로그인
              </span>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "var(--color-border)",
                }}
              />
            </div>

            {/* Social Login Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button
                type="button"
                disabled={!canUseGoogle || isLoading}
                onMouseEnter={() => setSocialHover("google")}
                onMouseLeave={() => setSocialHover(null)}
                onClick={() => {
                  if (!canUseGoogle) return;
                  try {
                    setGoogleLoading(true);
                    const apiBase = getApiBaseUrl();
                    const returnTo =
                      typeof window === "undefined"
                        ? ""
                        : window.location.origin + "/";
                    const url = new URL("/api/auth/google/start", apiBase);
                    url.searchParams.set("returnTo", returnTo);
                    window.location.href = url.toString();
                  } catch (e) {
                    setGoogleLoading(false);
                    setError(getErrorMessage(e));
                  }
                }}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "var(--color-surface)",
                  border:
                    socialHover === "google"
                      ? "2px solid #4285F4"
                      : "2px solid var(--color-border)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  cursor: !canUseGoogle || isLoading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "var(--color-text-primary)",
                  transition: "all 0.2s",
                  minHeight: "56px",
                  boxShadow:
                    socialHover === "google"
                      ? "0 8px 18px rgba(66, 133, 244, 0.14)"
                      : "0 2px 8px rgba(40, 91, 170, 0.06)",
                  transform:
                    socialHover === "google" ? "translateY(-1px)" : "translateY(0)",
                  opacity: !canUseGoogle || isLoading ? 0.6 : 1,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M19.8 10.2273C19.8 9.51818 19.7364 8.83636 19.6182 8.18182H10V12.05H15.4727C15.2273 13.3 14.5227 14.3591 13.4727 15.0682V17.5773H16.7636C18.6727 15.8318 19.8 13.2727 19.8 10.2273Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M10 20C12.7 20 14.9636 19.1045 16.7636 17.5773L13.4727 15.0682C12.5909 15.6682 11.4455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H0.995453V14.4909C2.78636 18.0591 6.10909 20 10 20Z"
                    fill="#34A853"
                  />
                  <path
                    d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H0.995453C0.359091 6.77273 0 8.19545 0 10C0 11.8045 0.359091 13.2273 0.995453 14.4909L4.40455 11.9Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M10 3.97727C11.5682 3.97727 12.9682 4.48182 14.0682 5.52727L17.0227 2.57273C14.9591 0.636364 12.6955 -0.5 10 -0.5C6.10909 -0.5 2.78636 1.44091 0.995453 5.00909L4.40455 7.6C5.19091 5.23636 7.39545 3.97727 10 3.97727Z"
                    fill="#EA4335"
                  />
                </svg>
                {googleLoading ? "이동 중..." : "구글로 계속하기"}
              </button>

              <div
                title="준비중"
                onMouseEnter={() => setSocialHover("kakao")}
                onMouseLeave={() => setSocialHover(null)}
                style={{ borderRadius: 14 }}
              >
                <button
                  type="button"
                  disabled
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "#FEE500",
                    border: "none",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    cursor: "not-allowed",
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "#191919",
                    transition: "all 0.2s",
                    minHeight: "56px",
                    opacity: 0.55,
                    boxShadow:
                      socialHover === "kakao"
                        ? "0 8px 18px rgba(0,0,0,0.08)"
                        : "0 2px 8px rgba(40, 91, 170, 0.06)",
                    transform:
                      socialHover === "kakao"
                        ? "translateY(-1px)"
                        : "translateY(0)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 0C4.477 0 0 3.566 0 7.975C0 10.595 1.654 12.903 4.194 14.285L3.228 17.838C3.137 18.142 3.488 18.386 3.739 18.198L7.931 15.234C8.604 15.328 9.296 15.378 10 15.378C15.523 15.378 20 11.812 20 7.403C20 2.994 15.523 0 10 0Z"
                      fill="#191919"
                    />
                  </svg>
                  카카오톡으로 계속하기 (준비중)
                </button>
              </div>

              <div
                title="준비중"
                onMouseEnter={() => setSocialHover("naver")}
                onMouseLeave={() => setSocialHover(null)}
                style={{ borderRadius: 14 }}
              >
                <button
                  type="button"
                  disabled
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "#03C75A",
                    border: "none",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    cursor: "not-allowed",
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "white",
                    transition: "all 0.2s",
                    minHeight: "56px",
                    opacity: 0.55,
                    boxShadow:
                      socialHover === "naver"
                        ? "0 8px 18px rgba(0,0,0,0.08)"
                        : "0 2px 8px rgba(40, 91, 170, 0.06)",
                    transform:
                      socialHover === "naver"
                        ? "translateY(-1px)"
                        : "translateY(0)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M13.75 7.5L10 12.5L6.25 7.5H13.75Z" fill="white" />
                    <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2" />
                  </svg>
                  네이버로 계속하기 (준비중)
                </button>
              </div>
            </div>

            {!canUseGoogle && (
              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  color: "var(--color-text-tertiary)",
                  fontSize: "0.875rem",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Google 로그인을 사용하려면 <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
                와 서버의 <code>AUTH_ENABLED=true</code>가 필요해요.
              </p>
            )}
          </div>
        )}

        {/* 회원가입 화면 */}
        {mode === "register" && (
          <div className="space-y-5">
            {/* 이름 (선택) */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                }}
              >
                <User className="w-4 h-4" />
                이름 (선택)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="input-field"
                style={{ fontSize: "1.0625rem" }}
                disabled={isLoading}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                }}
              >
                휴대폰 번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                maxLength={13}
                className="input-field"
                style={{ fontSize: "1.0625rem" }}
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                }}
              >
                비밀번호
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  className="input-field"
                  style={{ fontSize: "1.0625rem", paddingRight: "52px" }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-tertiary)",
                    padding: "8px",
                  }}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                }}
              >
                비밀번호 확인
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  className="input-field"
                  style={{ fontSize: "1.0625rem", paddingRight: "52px" }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-tertiary)",
                    padding: "8px",
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              disabled={isLoading || !phone || !password || !confirmPassword}
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: "24px",
                opacity: isLoading || !phone || !password || !confirmPassword ? 0.6 : 1,
                cursor: isLoading || !phone || !password || !confirmPassword ? "not-allowed" : "pointer",
              }}
              onClick={handleRegister}
            >
              {actionLoading ? "처리 중..." : "가입하기"}
            </button>
          </div>
        )}

        {/* 아이디 찾기 화면 */}
        {mode === "find-phone" && (
          <div className="space-y-5">
            {foundPhone ? (
              <div
                className="card"
                style={{
                  padding: 24,
                  textAlign: "center",
                  background: "var(--color-primary-bg)",
                  border: "2px solid var(--color-primary)",
                }}
              >
                <p
                  style={{
                    marginBottom: 16,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  가입된 휴대폰 번호
                </p>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "var(--color-primary)",
                    marginBottom: 0,
                  }}
                >
                  {foundPhone}
                </p>
              </div>
            ) : (
              <>
                {/* Name */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                      color: "var(--color-text-primary)",
                      fontSize: "0.9375rem",
                      fontWeight: "600",
                    }}
                  >
                    <User className="w-4 h-4" />
                    이름
                  </label>
                  <input
                    type="text"
                    value={findName}
                    onChange={(e) => setFindName(e.target.value)}
                    placeholder="이름 입력"
                    className="input-field"
                    style={{ fontSize: "1.0625rem" }}
                    disabled={isLoading}
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                      color: "var(--color-text-primary)",
                      fontSize: "0.9375rem",
                      fontWeight: "600",
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    생년월일
                  </label>
                  <input
                    type="date"
                    value={findBirthDate}
                    onChange={(e) => setFindBirthDate(e.target.value)}
                    className="input-field"
                    style={{ fontSize: "1.0625rem" }}
                    disabled={isLoading}
                  />
                </div>

                <button
                  disabled={isLoading || !findName || !findBirthDate}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    opacity: isLoading || !findName || !findBirthDate ? 0.6 : 1,
                    cursor: isLoading || !findName || !findBirthDate ? "not-allowed" : "pointer",
                  }}
                  onClick={handleFindPhone}
                >
                  {actionLoading ? "조회 중..." : "아이디 찾기"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => changeMode("login")}
              style={{
                width: "100%",
                padding: "16px",
                background: "transparent",
                border: "2px solid var(--color-border)",
                borderRadius: "14px",
                color: "var(--color-text-primary)",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              로그인으로 돌아가기
            </button>
          </div>
        )}

        {/* 비밀번호 찾기 화면 */}
        {mode === "reset-password" && (
          <div className="space-y-5">
            {/* Phone Number */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                }}
              >
                휴대폰 번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                maxLength={13}
                className="input-field"
                style={{ fontSize: "1.0625rem" }}
                disabled={!!challengeId || isLoading}
              />
            </div>

            {!challengeId ? (
              <button
                disabled={isLoading || !phone}
                className="btn-primary"
                style={{
                  width: "100%",
                  marginTop: "24px",
                  opacity: isLoading || !phone ? 0.6 : 1,
                  cursor: isLoading || !phone ? "not-allowed" : "pointer",
                }}
                onClick={handleResetStart}
              >
                {actionLoading ? "발송 중..." : "인증번호 받기"}
              </button>
            ) : (
              <>
                {/* OTP */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "10px",
                      color: "var(--color-text-primary)",
                      fontSize: "0.9375rem",
                      fontWeight: "600",
                    }}
                  >
                    인증번호
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCode ? "text" : "password"}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="인증번호 6자리"
                      className="input-field"
                      style={{ fontSize: "1.0625rem", paddingRight: "52px" }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-tertiary)",
                        padding: "8px",
                      }}
                    >
                      {showCode ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "10px",
                      color: "var(--color-text-primary)",
                      fontSize: "0.9375rem",
                      fontWeight: "600",
                    }}
                  >
                    새 비밀번호
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="새 비밀번호 (6자 이상)"
                      className="input-field"
                      style={{ fontSize: "1.0625rem", paddingRight: "52px" }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-tertiary)",
                        padding: "8px",
                      }}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "10px",
                      color: "var(--color-text-primary)",
                      fontSize: "0.9375rem",
                      fontWeight: "600",
                    }}
                  >
                    새 비밀번호 확인
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="새 비밀번호 재입력"
                      className="input-field"
                      style={{ fontSize: "1.0625rem", paddingRight: "52px" }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-tertiary)",
                        padding: "8px",
                      }}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  disabled={isLoading || !code || !password || !confirmPassword}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    opacity: isLoading || !code || !password || !confirmPassword ? 0.6 : 1,
                    cursor: isLoading || !code || !password || !confirmPassword ? "not-allowed" : "pointer",
                  }}
                  onClick={handleResetComplete}
                >
                  {actionLoading ? "처리 중..." : "비밀번호 변경"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => changeMode("login")}
              style={{
                width: "100%",
                padding: "16px",
                background: "transparent",
                border: "2px solid var(--color-border)",
                borderRadius: "14px",
                color: "var(--color-text-primary)",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              로그인으로 돌아가기
            </button>
          </div>
        )}

        {/* Trust Message */}
        <div
          style={{
            marginTop: "32px",
            padding: "16px",
            background: "var(--color-primary-bg)",
            borderRadius: "14px",
            border: "2px solid #D1E3F8",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-primary)",
              fontWeight: "600",
              lineHeight: "1.6",
            }}
          >
            🔒 안전한 로그인
            <br />
            <span style={{ fontWeight: "400", fontSize: "0.8125rem" }}>
              모든 정보는 암호화되어 안전하게 보호됩니다
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
