import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the container image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  redirects() {
    return [
      { source: "/stdlib", destination: "/docs/spec/stdlib", permanent: false },
      { source: "/cli", destination: "/docs/spec/toolchain/cli", permanent: false },
      { source: "/manifest", destination: "/docs/spec/toolchain/manifest", permanent: false },
      { source: "/diagnostics", destination: "/docs/spec/appendix/diagnostics", permanent: false },
    ];
  },
};

export default nextConfig;
