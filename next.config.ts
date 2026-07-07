import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: '50mb',
  },
  async redirects() {
    return [
      {
        source: "/admin/consultations/reports/evaluation-results",
        destination: "/admin/evaluations/results",
        permanent: true,
      },
      {
        source: "/dean/reports/evaluation-results",
        destination: "/dean/evaluations/results",
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
