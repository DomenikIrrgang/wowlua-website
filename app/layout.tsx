import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/tokens.css";
import "@/styles/design-system.css";
import "@/styles/site.css";
import "@/styles/markdown.css";
import "@/styles/api.css";
import "@/styles/mobile/chrome.css";
import "@/styles/mobile/landing.css";
import "@/styles/mobile/docs.css";
import "@/styles/mobile/news.css";
import "@/styles/mobile/tools.css";
import { Enhance } from "@/components/Enhance";
import { SearchPalette } from "@/components/SearchPalette";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { DISCORD_URL, REPO_URL, latestRelease } from "@/lib/content";
import { ogMetadata } from "@/lib/og";

// wowlua's content changes while the server runs (instrumentation.ts): pages
// are regenerated from it in the background, at most once a minute.
export const revalidate = 60;

const martian = localFont({
  src: [
    { path: "./fonts/MartianMono-StdRg.woff2", weight: "400" },
    { path: "./fonts/MartianMono-StdMd.woff2", weight: "500" },
    { path: "./fonts/MartianMono-StdBd.woff2", weight: "700" },
    { path: "./fonts/MartianMono-StdxBd.woff2", weight: "800" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-martian",
});

const plex = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-Italic.ttf", weight: "400", style: "italic" },
    { path: "./fonts/IBMPlexMono-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexMono-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-plex",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "wowlua · typed Lua for World of Warcraft AddOns", template: "%s · wowlua" },
  description: "A language, compiler, framework and package manager for World of Warcraft AddOns.",
  // Pages set their own; this is the home page's card, used by anything without one.
  ...ogMetadata("/", "wowlua · typed Lua for World of Warcraft AddOns", "A language, compiler, framework and package manager for World of Warcraft AddOns."),
};

export const viewport: Viewport = {
  // Also the colour of the stripe beside link previews in Discord.
  themeColor: "#ffb547",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const latest = latestRelease();
  return (
    <html lang="en" className={`${martian.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <div className="site">
          <SiteHeader version={latest?.tag ?? null} repoUrl={REPO_URL()} discordUrl={DISCORD_URL} />
          {children}
          <SiteFooter />
        </div>
        <SearchPalette />
        <Enhance />
      </body>
    </html>
  );
}
