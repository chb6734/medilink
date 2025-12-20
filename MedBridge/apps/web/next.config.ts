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
    ];
  },
};

export default nextConfig;
