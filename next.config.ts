import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the container image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  // `npm run dev:lan` serves the dev build to phones on the same network; Next blocks
  // its dev resources (hot reload, chunks) for hosts not listed here.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  headers() {
    return [
      // Embedded on other sites: let browsers and CDNs keep them for a day.
      { source: "/badge/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
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
