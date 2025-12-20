import { useEffect, useMemo, useRef, useState } from "react";
import {
  authGoogle,
  authMe,
  authPhoneStart,
  authPhoneVerify,
  authLogout,
} from "../lib/api";

export function AuthView({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"google" | "phone">("phone");

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ??
    "";
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleScriptLoadedRef = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Phone OTP (dev)
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const me = await authMe();
      setAuthEnabled(!!me.authEnabled);
      setUser(me.user);
    } catch (e) {
      setError(String((e as any)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const canUseGoogle = useMemo(
    () => !!googleClientId && !!authEnabled,
    [googleClientId, authEnabled]
  );

  useEffect(() => {
    if (tab !== "google") return;
    if (!googleClientId) return;
    if (!authEnabled) return;
    if (!googleButtonRef.current) return;

    const init = async () => {
      try {
        setGoogleReady(false);

        if (!googleScriptLoadedRef.current) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector(
              'script[src="https://accounts.google.com/gsi/client"]'
            );
            if (existing) {
              googleScriptLoadedRef.current = true;
              resolve();
              return;
            }
            const s = document.createElement("script");
            s.src = "https://accounts.google.com/gsi/client";
            s.async = true;
            s.defer = true;
            s.onload = () => {
              googleScriptLoadedRef.current = true;
              resolve();
            };
            s.onerror = () =>
              reject(new Error("Failed to load Google Identity script"));
            document.head.appendChild(s);
          });
        }

        const g = (window as any).google?.accounts?.id;
        if (!g) throw new Error("Google Identity not available");

        // Clear any previous button
        googleButtonRef.current!.innerHTML = "";

        g.initialize({
          client_id: googleClientId,
          callback: async (resp: any) => {
            try {
              setGoogleLoading(true);
              setError(null);
              await authGoogle({ idToken: resp.credential });
              await refresh();
            } catch (e) {
              setError(String((e as any)?.message ?? e));
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        g.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text: "continue_with",
          shape: "pill",
        });

        setGoogleReady(true);
      } catch (e) {
        setError(String((e as any)?.message ?? e));
      }
    };

    init();
  }, [tab, googleClientId, authEnabled]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 24 }}>
        <div className="card" style={{ padding: 20, maxWidth: 520 }}>
          <h3 style={{ marginBottom: 8 }}>불러오는 중</h3>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            로그인 상태를 확인하고 있어요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
      <div style={{ padding: "24px 20px 12px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          로그인
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 8, lineHeight: 1.5 }}>
          인증은 Phase 1 옵션입니다. 현재 데모에서는 로그인 없이도 QR 공유가 동작할 수 있어요.
        </p>
      </div>

      <div style={{ padding: "0 20px 24px" }}>
        {!authEnabled && (
          <div className="card" style={{ padding: 16, border: "1px solid #E5E7EB", marginBottom: 14 }}>
            <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              서버에서 인증이 꺼져 있어요. (AUTH_ENABLED=false)
            </p>
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 16, border: "2px solid #FDE68A", marginBottom: 14 }}>
            <p style={{ margin: 0, color: "#92400E", fontWeight: 700 }}>에러</p>
            <p style={{ marginTop: 8, marginBottom: 0, color: "#92400E", lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {user ? (
          <div className="card" style={{ padding: 18, borderRadius: 18 }}>
            <p style={{ margin: 0, fontWeight: 900, fontSize: "1.1rem" }}>
              로그인됨
            </p>
            <p style={{ marginTop: 8, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {user.provider === "google" ? "Google" : "Phone"} · {user.displayName ?? user.phoneE164 ?? user.subject}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={async () => { await authLogout(); await refresh(); }}>
                로그아웃
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={onDone}>
                계속하기
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 18, borderRadius: 18 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                onClick={() => setTab("phone")}
                style={{
                  flex: 1,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: tab === "phone" ? "2px solid var(--color-accent)" : "1px solid #E5E7EB",
                  background: tab === "phone" ? "var(--color-accent-light)" : "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                휴대폰
              </button>
              <button
                onClick={() => setTab("google")}
                style={{
                  flex: 1,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: tab === "google" ? "2px solid var(--color-accent)" : "1px solid #E5E7EB",
                  background: tab === "google" ? "var(--color-accent-light)" : "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Google
              </button>
            </div>

            {tab === "phone" ? (
              <>
                <p style={{ marginTop: 0, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  (DEV) OTP는 서버 로그에 출력됩니다.
                </p>

                <label style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>휴대폰 번호(E.164)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+821012345678"
                  style={{
                    width: "100%",
                    padding: "14px 14px",
                    border: "2px solid #D1D5DB",
                    borderRadius: 14,
                    fontSize: "1.0625rem",
                    background: "white",
                    outline: "none",
                  }}
                />

                {challengeId && (
                  <>
                    <div style={{ height: 12 }} />
                    <label style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>인증번호</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="6자리"
                      style={{
                        width: "100%",
                        padding: "14px 14px",
                        border: "2px solid #D1D5DB",
                        borderRadius: 14,
                        fontSize: "1.0625rem",
                        background: "white",
                        outline: "none",
                      }}
                    />
                  </>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  {!challengeId ? (
                    <button
                      className="btn-primary"
                      style={{ width: "100%" }}
                      onClick={async () => {
                        setError(null);
                        try {
                          const r = await authPhoneStart({ phoneE164: phone });
                          setChallengeId(r.challengeId);
                        } catch (e) {
                          setError(String((e as any)?.message ?? e));
                        }
                      }}
                    >
                      인증번호 받기
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setChallengeId(null);
                          setCode("");
                        }}
                      >
                        다시
                      </button>
                      <button
                        className="btn-primary"
                        style={{ flex: 2 }}
                        onClick={async () => {
                          setError(null);
                          try {
                            await authPhoneVerify({ challengeId, code });
                            await refresh();
                          } catch (e) {
                            setError(String((e as any)?.message ?? e));
                          }
                        }}
                      >
                        확인
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {!googleClientId ? (
                  <div
                    className="card"
                    style={{ padding: 16, border: "2px solid #FDE68A" }}
                  >
                    <p style={{ margin: 0, color: "#92400E", fontWeight: 800 }}>
                      Google Client ID가 필요해요
                    </p>
                    <p
                      style={{
                        marginTop: 8,
                        marginBottom: 0,
                        color: "#92400E",
                        lineHeight: 1.6,
                      }}
                    >
                      웹 환경변수에{" "}
                      <code style={{ fontWeight: 800 }}>
                        NEXT_PUBLIC_GOOGLE_CLIENT_ID
                      </code>
                      를 설정하세요.
                    </p>
                  </div>
                ) : !authEnabled ? (
                  <div
                    className="card"
                    style={{ padding: 16, border: "2px solid #FDE68A" }}
                  >
                    <p style={{ margin: 0, color: "#92400E", fontWeight: 800 }}>
                      서버 인증이 꺼져 있어요
                    </p>
                    <p
                      style={{
                        marginTop: 8,
                        marginBottom: 0,
                        color: "#92400E",
                        lineHeight: 1.6,
                      }}
                    >
                      먼저 서버에서 <code style={{ fontWeight: 800 }}>AUTH_ENABLED=true</code>
                      를 켜주세요.
                    </p>
                  </div>
                ) : (
                  <>
                    <p
                      style={{
                        marginTop: 0,
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      Google 버튼을 눌러 로그인하세요.
                    </p>

                    <div
                      className="card"
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        border: "1px solid #E5E7EB",
                        background: "white",
                      }}
                    >
                      <div ref={googleButtonRef} />
                      {!googleReady && (
                        <p
                          style={{
                            marginTop: 10,
                            marginBottom: 0,
                            color: "var(--color-text-tertiary)",
                            fontSize: "0.875rem",
                          }}
                        >
                          버튼을 불러오는 중…
                        </p>
                      )}
                      {googleLoading && (
                        <p
                          style={{
                            marginTop: 10,
                            marginBottom: 0,
                            color: "var(--color-text-tertiary)",
                            fontSize: "0.875rem",
                          }}
                        >
                          로그인 처리 중…
                        </p>
                      )}
                    </div>

                    {!canUseGoogle && (
                      <p
                        style={{
                          marginTop: 10,
                          marginBottom: 0,
                          color: "var(--color-text-tertiary)",
                          fontSize: "0.875rem",
                          lineHeight: 1.5,
                        }}
                      >
                        로컬 개발에서는 Google Console에{" "}
                        <code>http://127.0.0.1:5173</code>를 Origin으로 등록해야
                        합니다.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


