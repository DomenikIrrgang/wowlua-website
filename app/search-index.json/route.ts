import type { SearchEntry } from "@/components/SearchPalette";
import { api, eventHref, functionHref, methodHref, namespaceHref, widgetHref } from "@/lib/api";
import { blogPosts } from "@/lib/blog";
import { docsHref, sidebar } from "@/lib/content";
import { diagnosticHref, diagnostics } from "@/lib/diagnostics";
import { renderRepoFile } from "@/lib/markdown";

export const dynamic = "force-static";
// Follows wowlua content changes while the server runs (instrumentation.ts).
export const revalidate = 60;

const clean = (s: string) => s.replace(/^(Appendix [A-Z]\.|[A-Z]?\d+(\.\d+)*\.?)\s+/, "").replace(/`/g, "");

/** Every page and section heading of the main docs, the diagnostic codes, the WoW API's names and the site's pages. */
export async function GET() {
  const out: SearchEntry[] = [];
  for (const section of sidebar("main")) {
    for (const item of section.items) {
      const r = await renderRepoFile("main", item.repoPath);
      if (!r) continue;
      const title = clean(r.title ?? item.label);
      out.push({ t: title, u: item.href, g: section.title, k: "page" });
      for (const h of r.toc) out.push({ t: clean(h.text), u: `${item.href}#${h.id}`, g: section.title, p: title, k: "h" });
    }
  }
  for (const d of diagnostics("main")) {
    out.push({ t: `${d.code} ${d.summary.replace(/`/g, "")}`, u: diagnosticHref("main", d.code)!, g: "diagnostics", p: d.section.toLowerCase(), k: "page" });
  }
  // The WoW API by name only (its descriptions stay on its pages), so the index stays small.
  const a = api();
  if (a) {
    const g = "wow api";
    for (const n of a.namespaces) out.push({ t: n.name || "global functions", u: namespaceHref(n.name), g, k: "ns" });
    for (const w of a.widgets) out.push({ t: w.name, u: widgetHref(w.name), g, k: "widget" });
    for (const f of a.functions) out.push({ t: f.name, u: functionHref(f.name), g, k: "fn" });
    for (const e of a.events) out.push({ t: e.name, u: eventHref(e.name), g, k: "event" });
    for (const w of a.widgets) for (const m of w.methods) out.push({ t: `${w.name}:${m.name}`, u: methodHref(w.name, m.name), g, k: "method" });
  }
  for (const p of blogPosts()) out.push({ t: p.title, u: `/blog/${p.slug}`, g: "blog", k: "page" });
  for (const [t, u] of [
    ["changelog", "/changelog"],
    ["playground", "/playground"],
    ["showcase", "/showcase"],
    ["badge", "/badge"],
    ["community", "/community"],
    ["docs", docsHref("main", [])],
  ]) {
    out.push({ t, u, g: "pages", k: "page" });
  }
  return Response.json(out);
}
