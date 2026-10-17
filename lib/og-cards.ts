// Preview cards by page path. ogPaths() lists them cheaply (for the image
// route's static params); ogCard() builds one, rendering only that page.
import { blogPosts, findPost } from "./blog";
import { docsHref, findPage, isVersion, latestRelease, pages, sidebar, versions } from "./content";
import { diagnostics, findDiagnostic } from "./diagnostics";
import { shortVersion } from "./format";
import { renderRepoFile } from "./markdown";
import type { Card } from "./og";
import { intro } from "./readme";
import { milestones, roadmapSummary } from "./roadmap";

const cleanTitle = (s: string) => s.replace(/^(Appendix [A-Z]\.|[A-Z]?\d+(\.\d+)*\.?)\s+/, "").replace(/`/g, "");
const plain = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const STATIC: Record<string, () => Card> = {
  "/": () => {
    const latest = latestRelease();
    return {
      eyebrow: "a strict superset of Lua 5.1",
      title: "Typed Lua for World of Warcraft AddOns",
      subtitle: plain(intro()).replace(/^wowlua is /, "").replace(/^./, (c) => c.toUpperCase()).split(". ")[0] + ".",
      tag: latest ? `v${shortVersion(latest.tag)} · latest release` : undefined,
    };
  },
  "/changelog": () => {
    const latest = latestRelease();
    return {
      eyebrow: "changelog",
      title: "Every release of wowlua",
      subtitle: latest ? `Latest: ${latest.tag}, ${latest.date.slice(0, 10)}. And what is on main but not released yet.` : undefined,
      tag: latest ? `v${shortVersion(latest.tag)} · latest release` : undefined,
    };
  },
  "/roadmap": () => {
    const doing = milestones().find((m) => m.status === "in progress");
    return {
      eyebrow: "roadmap",
      title: doing ? `${doing.id}: ${doing.title}` : "Roadmap",
      subtitle: roadmapSummary(),
      tag: doing ? `${doing.id} in progress` : undefined,
      tone: "success",
    };
  },
  "/blog": () => ({ eyebrow: "blog", title: "Release notes and field reports", subtitle: "What changed in each release, and what testing wowlua against real addons taught us." }),
  "/showcase": () => ({ eyebrow: "showcase", title: "AddOns built with wowlua" }),
  "/community": () => ({ eyebrow: "community", title: "Built in the open", subtitle: "MIT-licensed and developed on GitHub." }),
  "/packages": () => ({ eyebrow: "packages", title: "Libraries, Lua libraries and type declarations" }),
  "/playground": () => ({ eyebrow: "playground", title: "wowlua in the browser", subtitle: "Coming once the compiler builds to WebAssembly." }),
};

/** Every page that has a card. */
export function ogPaths(): string[] {
  const out = new Set(Object.keys(STATIC));
  for (const v of versions()) {
    out.add(docsHref(v.id, []));
    for (const p of pages(v.id)) out.add(docsHref(v.id, p.slug));
  }
  for (const d of diagnostics("main")) out.add(`/docs/diagnostics/${d.code}`);
  for (const p of blogPosts()) out.add(`/blog/${p.slug}`);
  return [...out];
}

export async function ogCard(path: string): Promise<Card | null> {
  if (STATIC[path]) return STATIC[path]();

  const diag = /^\/docs\/diagnostics\/([EWP]\d{4})$/.exec(path);
  if (diag) {
    const d = findDiagnostic("main", diag[1]);
    if (!d) return null;
    return {
      eyebrow: `diagnostic · ${d.kind}`,
      title: d.code,
      subtitle: plain(d.summary),
      tag: d.area ? d.area.replace(/\s*\(.*\)$/, "").toLowerCase() : undefined,
      tone: d.kind === "error" ? "error" : d.kind === "warning" ? "warning" : "amber",
    };
  }

  const post = /^\/blog\/([^/]+)$/.exec(path);
  if (post) {
    const p = findPost(post[1]);
    return p ? { eyebrow: ["blog", ...p.tags].join(" · "), title: p.title, subtitle: p.summary, tag: p.date } : null;
  }

  if (path === "/docs" || path.startsWith("/docs/")) {
    const segs = path.split("/").slice(2);
    const version = isVersion(segs[0] ?? "") ? segs[0] : "main";
    const slug = version === "main" ? segs : segs.slice(1);
    const page = findPage(version, slug);
    const tag = version === "main" ? "docs for main" : `docs for v${version}`;
    if (!page) return { eyebrow: "docs", title: "wowlua documentation", tag };
    const r = await renderRepoFile(version, page.repoPath);
    const section = sidebar(version).find((s) => s.items.some((i) => i.repoPath === page.repoPath))?.title;
    return {
      eyebrow: ["docs", section].filter(Boolean).join(" · "),
      title: cleanTitle(r?.title ?? "docs"),
      subtitle: r?.description || undefined,
      tag,
    };
  }
  return null;
}
