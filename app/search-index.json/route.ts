import type { SearchEntry } from "@/components/SearchPalette";
import { blogPosts } from "@/lib/blog";
import { docsHref, sidebar } from "@/lib/content";
import { diagnostics } from "@/lib/diagnostics";
import { renderRepoFile } from "@/lib/markdown";

export const dynamic = "force-static";
// Follows wowlua content changes while the server runs (instrumentation.ts).
export const revalidate = 60;

const clean = (s: string) => s.replace(/^(Appendix [A-Z]\.|[A-Z]?\d+(\.\d+)*\.?)\s+/, "").replace(/`/g, "");

/** Every page and section heading of the main docs, the diagnostic codes and the site's pages. */
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
    out.push({ t: `${d.code} ${d.summary.replace(/`/g, "")}`, u: `/docs/diagnostics/${d.code}`, g: "diagnostics", p: d.section.toLowerCase(), k: "page" });
  }
  for (const p of blogPosts()) out.push({ t: p.title, u: `/blog/${p.slug}`, g: "blog", k: "page" });
  for (const [t, u] of [
    ["changelog", "/changelog"],
    ["roadmap", "/roadmap"],
    ["playground", "/playground"],
    ["packages", "/packages"],
    ["showcase", "/showcase"],
    ["badge", "/badge"],
    ["community", "/community"],
    ["docs", docsHref("main", [])],
  ]) {
    out.push({ t, u, g: "pages", k: "page" });
  }
  return Response.json(out);
}
