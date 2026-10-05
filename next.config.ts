import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy Football URL → England league
      {
        source: "/football",
        destination: "/football/england",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
