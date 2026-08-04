import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버/DB 없는 정적 데모 — Vercel에 순수 정적 파일로 배포한다.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
