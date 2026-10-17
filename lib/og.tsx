// Link previews (Discord, Slack, iMessage, X…): one 1200×630 card per page,
// prerendered by app/og/[...path]/route.tsx, and the Open Graph metadata
// pointing at it.
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LOGO_FULL_SVG } from "@/components/Logo";

export const OG_SIZE = { width: 1200, height: 630 };

export type Card = {
  eyebrow: string; // "docs · toolchain"
  title: string;
  subtitle?: string;
  tag?: string; // bottom left, e.g. "v0.9 · latest release"
  tone?: "amber" | "error" | "warning" | "success";
};

/** URL of a page's card: "/" → "/og/image.png", "/docs/x" → "/og/docs/x/image.png". */
export const ogImagePath = (pagePath: string) => `/og${pagePath === "/" ? "" : pagePath}/image.png`;

/** Canonical URL, Open Graph and Twitter metadata for a page, with its card. */
export function ogMetadata(pagePath: string, pageTitle: string, description?: string): Metadata {
  // Chat apps show og:title alone, so it names the site.
  const title = /wowlua/i.test(pageTitle) ? pageTitle : `${pageTitle} · wowlua`;
  const image = { url: ogImagePath(pagePath), width: OG_SIZE.width, height: OG_SIZE.height, alt: title };
  return {
    alternates: { canonical: pagePath },
    openGraph: { title, description, url: pagePath, siteName: "wowlua", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

const C = {
  bg: "#14120e",
  bg2: "#1a1813",
  line: "#353027",
  grid: "#1f1c17",
  ink: "#ece6d6",
  muted: "#a39b8a",
  faint: "#756d5f",
  amber: "#ffb547",
  error: "#ff7262",
  warning: "#e8c547",
  success: "#6fdcb4",
};

// Literal paths, so the server bundle traces just these files.
const FONTS = [
  { name: "Martian", data: readFileSync(path.join(process.cwd(), "lib/og-fonts/MartianMono-StdBd.ttf")), weight: 700 as const, style: "normal" as const },
  { name: "Martian", data: readFileSync(path.join(process.cwd(), "lib/og-fonts/MartianMono-StdxBd.ttf")), weight: 800 as const, style: "normal" as const },
  { name: "Plex", data: readFileSync(path.join(process.cwd(), "app/fonts/IBMPlexMono-Regular.ttf")), weight: 400 as const, style: "normal" as const },
  { name: "Plex", data: readFileSync(path.join(process.cwd(), "app/fonts/IBMPlexMono-SemiBold.ttf")), weight: 600 as const, style: "normal" as const },
];

// The wowlua wordmark from the design system, with the theme colours filled in.
const LOGO = LOGO_FULL_SVG.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
  .replace(' aria-hidden="true"', "")
  .replaceAll("currentColor", C.ink)
  .replaceAll("var(--amber-ink)", C.amber);
const LOGO_URL = `data:image/svg+xml;base64,${Buffer.from(LOGO).toString("base64")}`;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

export function renderCard(card: Card): ImageResponse {
  const accent = C[card.tone ?? "amber"];
  const title = clip(card.title, 80);
  const titleSize = title.length > 48 ? 54 : title.length > 26 ? 64 : 80;
  // The design's amber caret, when the title fits on one line (it would wrap alone otherwise).
  const caret = title.length * titleSize * 0.62 < 960;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: C.bg,
          backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          backgroundPosition: "-1px -1px",
          padding: "56px 72px",
          fontFamily: "Plex",
          color: C.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} width={245} height={60} alt="" />
          <div style={{ display: "flex", fontSize: 26, color: C.muted }}>wowlua.dev</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: accent }}>[ {card.eyebrow} ]</div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", fontFamily: "Martian", fontWeight: 800, fontSize: titleSize, lineHeight: 1.12, letterSpacing: "-0.03em", maxWidth: 1050 }}>
            {title}
            {caret && <div style={{ display: "flex", width: titleSize * 0.5, height: titleSize * 0.85, marginLeft: 12, marginBottom: titleSize * 0.1, background: C.amber }} />}
          </div>
          {card.subtitle && <div style={{ display: "flex", fontSize: 28, lineHeight: 1.45, color: C.muted, maxWidth: 1000 }}>{clip(card.subtitle, 150)}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, color: C.faint }}>
          <div style={{ display: "flex" }}>{card.tag ?? "typed Lua for World of Warcraft AddOns"}</div>
          <div style={{ display: "flex", height: 8, width: 160, background: accent }} />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: FONTS },
  );
}
