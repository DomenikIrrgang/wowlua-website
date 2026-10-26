import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import Link from "next/link";
import { BlogList } from "@/components/news/BlogList";
import { REPO_URL } from "@/lib/content";
import { feedItems } from "@/lib/feed";

export const metadata: Metadata = {
  title: "Blog",
  description: "What changed in each release of wowlua, and what testing it against real addons taught us.",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
  ...ogMetadata("/blog", "Blog", "What changed in each release of wowlua, and what testing it against real addons taught us."),
};

export default function BlogPage() {
  const items = feedItems();
  const topics = [...new Set(items.flatMap((i) => i.tags))];

  return (
    <main className="page blog" id="main">
      <div className="blog__main">
        <header className="page__head">
          <span className="label" style={{ color: "var(--amber-ink)" }}>
            [ blog ]
          </span>
          <h1 className="display-l">Release notes and field reports</h1>
          <p className="body-l" style={{ maxWidth: "60ch" }}>
            What changed in each release, and what testing wowlua against real addons taught us.
          </p>
        </header>
        <BlogList items={items} topics={topics} />
      </div>
      <aside className="blog__side" aria-label="Blog topics and feeds">
        {topics.length > 0 && (
          <section className="blog__side-topics" style={{ display: "grid", gap: 10 }}>
            <h2 className="label" style={{ margin: 0, color: "var(--ink-muted)" }}>
              topics
            </h2>
            <div className="wl-badge-row" style={{ flexWrap: "wrap" }}>
              {topics.map((t) => (
                <span key={t} className="wl-badge">
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}
        <section className="blog__follow">
          <h2 className="label" style={{ margin: 0, color: "var(--ink-muted)" }}>
            follow along
          </h2>
          <a href="/blog/rss.xml">
            <span>rss feed</span> <span aria-hidden="true">↗</span>
          </a>
          <a href={`${REPO_URL()}/releases`}>
            <span>github releases</span> <span aria-hidden="true">↗</span>
          </a>
          <Link href="/changelog">
            <span>full changelog</span> <span aria-hidden="true">→</span>
          </Link>
        </section>
      </aside>
    </main>
  );
}
