import { escapeHtml } from "@/lib/highlight";
import { feedItems } from "@/lib/feed";

export const dynamic = "force-static";
// Follows wowlua content changes while the server runs (instrumentation.ts).
export const revalidate = 60;

export function GET() {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  const items = feedItems()
    .map(
      (i) => `    <item>
      <title>${escapeHtml(i.title)}</title>
      <link>${site}${i.href}</link>
      <guid>${site}${i.href}</guid>
      <pubDate>${new Date(`${i.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeHtml(i.summary)}</description>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>wowlua blog</title>
    <link>${site}/blog</link>
    <description>Release notes and field reports from wowlua.</description>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
