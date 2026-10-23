import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";
import { docsHref, latestRelease, pages, refOf } from "@/lib/content";
import { diagnostics } from "@/lib/diagnostics";

// Follows wowlua content changes while the server runs (instrumentation.ts).
export const revalidate = 60;

const SITE = process.env.SITE_URL ?? "http://localhost:3000";

// The docs for main, the diagnostic codes, the blog and the site's pages.
// Older docs versions are left out: they are noindex and point at main.
export default function sitemap(): MetadataRoute.Sitemap {
  const main = new Date(refOf("main").date);
  const release = latestRelease();
  const url = (p: string) => `${SITE}${p}`;
  const out: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: main, changeFrequency: "weekly", priority: 1 },
    { url: url("/docs"), lastModified: main, changeFrequency: "weekly", priority: 0.9 },
    { url: url("/changelog"), lastModified: release ? new Date(release.date) : main, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/roadmap"), lastModified: main, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/blog"), changeFrequency: "weekly", priority: 0.5 },
    { url: url("/showcase"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/badge"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/community"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/packages"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/playground"), changeFrequency: "monthly", priority: 0.3 },
  ];
  const seen = new Set(out.map((e) => e.url));
  for (const p of pages("main")) {
    const u = url(docsHref("main", p.slug));
    if (seen.has(u)) continue;
    seen.add(u);
    const guide = p.repoPath.startsWith("docs/");
    out.push({ url: u, lastModified: main, changeFrequency: "weekly", priority: guide ? 0.8 : 0.7 });
  }
  for (const d of diagnostics("main")) {
    out.push({ url: url(`/docs/diagnostics/${d.code}`), lastModified: main, changeFrequency: "monthly", priority: 0.4 });
  }
  for (const p of blogPosts()) {
    out.push({ url: url(`/blog/${p.slug}`), lastModified: new Date(`${p.date}T00:00:00Z`), changeFrequency: "yearly", priority: 0.5 });
  }
  return out;
}
