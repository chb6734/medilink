import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Google OAuth/GIS popup + postMessage 호환을 위해 COOP를 완화합니다.
      // (COOP: same-origin 이면 OAuth 팝업에서 opener/postMessage가 막힐 수 있음)
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      // Login only: 가장 호환성이 높은 설정(Chrome 경고/차단 회피)
      // NOTE: 규칙이 겹치면 "뒤에 있는 규칙"이 우선 적용되는 케이스가 있어,
      // /login 규칙을 마지막에 둡니다.
      {
        source: "/login",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
        ],
      },
      {
        source: "/login/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
