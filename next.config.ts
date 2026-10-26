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
    const spec = (file: string) => `https://github.com/DomenikIrrgang/wowlua/blob/main/spec/${file}`;
    // Old addresses: the specification and the flat docs before wowlua's docs had sections, the pages the site dropped.
    const moved: [string, string][] = [
      ["/stdlib", "/docs/stdlib/overview"],
      ["/cli", "/docs/guide/commands"],
      ["/manifest", "/docs/reference/manifest"],
      ["/diagnostics", "/docs/reference/diagnostics"],
      ["/packages", "/docs/guide/packages"],
      ["/roadmap", spec("roadmap.md")],
      ["/docs/install", "/docs/guide/install"],
      ["/docs/getting-started", "/docs/guide/getting-started"],
      ["/docs/adopting-an-addon", "/docs/guide/adopting"],
      ["/docs/debugging-in-game", "/docs/guide/debugging"],
      ["/docs/debugging-in-the-emulator", "/docs/guide/debugging"],
      ["/docs/embedding", "/docs/reference/embedding"],
      ["/docs/diagnostics/:code", "/docs/reference/diagnostics/:code"],
      ["/docs/reference/api", "/api"],
      ["/docs/spec", spec("README.md")],
      ["/docs/spec/overview", spec("00-overview.md")],
      ["/docs/spec/language/syntax", "/docs/language/syntax"],
      ["/docs/spec/language/types", "/docs/language/types"],
      ["/docs/spec/language/classes", "/docs/language/classes"],
      ["/docs/spec/language/decorators", "/docs/language/decorators"],
      ["/docs/spec/language/modules", "/docs/language/modules"],
      ["/docs/spec/language/meta", "/docs/language/flavors"],
      ["/docs/spec/language/debugging", "/docs/language/debugging"],
      ["/docs/spec/stdlib/game", "/docs/stdlib/game"],
      ["/docs/spec/stdlib/interface", "/docs/stdlib/ui"],
      ["/docs/spec/stdlib/:chapter*", "/docs/stdlib/overview"],
      ["/docs/spec/toolchain/manifest", "/docs/reference/manifest"],
      ["/docs/spec/toolchain/cli", "/docs/guide/commands"],
      ["/docs/spec/toolchain/package-manager", "/docs/guide/packages"],
      ["/docs/spec/toolchain/publishing", "/docs/guide/publishing"],
      ["/docs/spec/toolchain/tooling", "/docs/guide/testing"],
      ["/docs/spec/toolchain/debugger", "/docs/guide/debugging"],
      ["/docs/spec/toolchain/emulator", "/docs/emulator-coverage"],
      ["/docs/spec/toolchain/:file", spec("toolchain/:file.md")],
      ["/docs/spec/appendix/diagnostics", "/docs/reference/diagnostics"],
      ["/docs/spec/appendix/:file", spec("appendix/:file.md")],
      ["/docs/spec/:path*", "https://github.com/DomenikIrrgang/wowlua/tree/main/spec"],
      // Docs versions from before the sections are no longer offered: their pages open on main.
      ["/docs/:version(0\\.[0-9]|0\\.1[0-2])/:path*", "/docs/:path*"],
    ];
    return moved.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
