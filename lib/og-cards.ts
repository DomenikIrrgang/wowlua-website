// Preview cards by page path. ogPaths() lists them cheaply (for the image
// route's static params); ogCard() builds one, rendering only that page.
import { api, clientName, findFunction, namespaceHref, namespaceOf, namespaces, widgetHref } from "./api";
import { blogPosts, findPost } from "./blog";
import { docsHref, findPage, isVersion, latestRelease, pages, sidebar, versions } from "./content";
import { diagnosticHref, diagnostics, findDiagnostic } from "./diagnostics";
import { renderRepoFile } from "./markdown";
import type { Card } from "./og";
import { intro } from "./readme";

const cleanTitle = (s: string) => s.replace(/^(Appendix [A-Z]\.|[A-Z]?\d+(\.\d+)*\.?)\s+/, "").replace(/`/g, "");
const plain = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const STATIC: Record<string, () => Card> = {
  "/": () => {
    const latest = latestRelease();
    return {
      eyebrow: "a strict superset of Lua 5.1",
      title: "Typed Lua for World of Warcraft AddOns",
      subtitle: plain(intro()).replace(/^wowlua is /, "").replace(/^./, (c) => c.toUpperCase()).split(". ")[0] + ".",
      tag: latest ? `${latest.tag} · latest release` : undefined,
    };
  },
  "/changelog": () => {
    const latest = latestRelease();
    return {
      eyebrow: "changelog",
      title: "Every release of wowlua",
      subtitle: latest ? `Latest: ${latest.tag}, ${latest.date.slice(0, 10)}. And what is on main but not released yet.` : undefined,
      tag: latest ? `${latest.tag} · latest release` : undefined,
    };
  },
  "/blog": () => ({ eyebrow: "blog", title: "Release notes and field reports", subtitle: "What changed in each release, and what testing wowlua against real addons taught us." }),
  "/showcase": () => ({ eyebrow: "showcase", title: "AddOns built with wowlua" }),
  "/badge": () => ({ eyebrow: "badge", title: "Built with wowlua", subtitle: "A badge for your addon's website, README, CurseForge or WoWInterface page." }),
  "/community": () => ({ eyebrow: "community", title: "Built in the open", subtitle: "MIT-licensed and developed on GitHub." }),
  "/playground": () => ({ eyebrow: "playground", title: "wowlua in the browser", subtitle: "Write wowlua and see the Lua it compiles to, its problems and what it prints." }),
};

/** Every page that has a card. */
export function ogPaths(): string[] {
  const out = new Set(Object.keys(STATIC));
  for (const v of versions()) {
    out.add(docsHref(v.id, []));
    for (const p of pages(v.id)) out.add(docsHref(v.id, p.slug));
  }
  for (const d of diagnostics("main")) out.add(diagnosticHref("main", d.code)!);
  for (const p of blogPosts()) out.add(`/blog/${p.slug}`);
  // The API's index, namespaces and widgets; a function's or an event's card renders on its first request.
  const a = api();
  if (a) {
    for (const p of ["/api", "/api/events", "/api/widgets"]) out.add(p);
    for (const n of namespaces(a)) out.add(namespaceHref(n.name));
    for (const w of a.widgets) out.add(widgetHref(w.name));
  }
  return [...out];
}

export async function ogCard(path: string): Promise<Card | null> {
  if (STATIC[path]) return STATIC[path]();

  const diag = /^\/docs\/reference\/diagnostics\/([EWP]\d{4})$/.exec(path);
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

  if (path === "/api" || path.startsWith("/api/")) return apiCard(path);

  if (path === "/docs" || path.startsWith("/docs/")) {
    const segs = path.split("/").slice(2);
    const version = isVersion(segs[0] ?? "") ? segs[0] : "main";
    const slug = version === "main" ? segs : segs.slice(1);
    const page = findPage(version, slug);
    const tag = version === "main" ? "docs for main" : `docs for ${versions().find((v) => v.id === version)!.ref}`;
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

/** An identifier the card may wrap: after a dot or colon and between camelCase words (zero-width spaces). */
const breakable = (name: string) => name.replace(/([.:_])(?=\w)/g, "$1\u200b").replace(/([a-z\d])(?=[A-Z])/g, "$1\u200b");

/** A WoW API page's card: the index, a namespace, function, event or widget, with its status in the emulator. */
function apiCard(path: string): Card | null {
  const a = api();
  if (!a) return null;
  const tag = `${a.flavor} · ${clientName(a)}`;
  const tone = (status: string) => (status === "implemented" ? "success" : status === "not implemented" ? "error" : status === "guessed" ? "warning" : "amber");
  const segs = path.split("/").slice(2);
  if (!segs.length) {
    const f = a.summary.functions;
    return {
      eyebrow: "wow api",
      title: "The WoW API, typed and emulated",
      subtitle: `${f.total.toLocaleString("en-US")} functions, ${a.summary.events.total.toLocaleString("en-US")} events and ${a.summary.methods.total.toLocaleString("en-US")} widget methods, with how far wowlua's emulator implements each.`,
      tag,
    };
  }
  if (segs[0] === "events") {
    if (segs.length === 1) return { eyebrow: "wow api · events", title: "Events", subtitle: `${a.summary.events.total.toLocaleString("en-US")} events, and whether the emulator fires each.`, tag };
    const e = a.event.get(segs[1]);
    return e ? { eyebrow: `wow api · event · ${e.status}`, title: breakable(e.name), subtitle: e.doc?.summary ? plain(e.doc.summary) : undefined, tag, tone: tone(e.status) } : null;
  }
  if (segs[0] === "widgets") {
    if (segs.length === 1) return { eyebrow: "wow api · widgets", title: "Widgets", subtitle: `${a.summary.methods.total.toLocaleString("en-US")} widget methods, and how far the emulator implements them.`, tag };
    const w = a.widget.get(segs[1]);
    return w ? { eyebrow: "wow api · widget", title: breakable(w.name), subtitle: `${w.methods.length} methods${w.bases.length ? `, and everything of ${w.bases.join(" and ")}` : ""}.`, tag } : null;
  }
  const ns = a.namespace.get(namespaceOf(segs[0]));
  if (!ns || (ns.name === "" && segs[0] !== "global")) return null;
  if (segs.length === 1) {
    const c = ns.counts;
    return {
      eyebrow: "wow api · namespace",
      title: ns.name ? breakable(ns.name) : "Global functions",
      subtitle: `${c.total} functions: ${c.implemented} implemented, ${c.recorded} recorded, ${c.guessed} guessed in wowlua's emulator.`,
      tag,
    };
  }
  const f = segs.length === 2 ? findFunction(a, segs[0], segs[1]) : undefined;
  return f ? { eyebrow: `wow api · function · ${f.status}`, title: breakable(f.name), subtitle: f.doc?.summary ? plain(f.doc.summary) : undefined, tag, tone: tone(f.status) } : null;
}
