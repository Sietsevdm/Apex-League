import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  experimental: { agentUpgrade: "security" },
  outputFileTracingExcludes: { "/*": ["./.data/**/*"] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};
export default config;
