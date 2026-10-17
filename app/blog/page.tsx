import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "@/lib/content";
import { feedItems } from "@/lib/feed";

export const metadata: Metadata = {
  title: "Blog",
  description: "What changed in each release of wowlua, and what testing it against real addons taught us.",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
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
          <p className="body-l">What changed in each release, and what testing wowlua against real addons taught us.</p>
        </header>
        <ol className="blog__list">
          {items.map((it) => (
            <li key={it.href} className="blog__item">
              <time className="caption" dateTime={it.date}>
                {it.date}
              </time>
              <article>
                <h2 className="heading-2" style={{ margin: 0 }}>
                  <Link href={it.href} style={{ color: "var(--ink)", textDecoration: "none" }}>
                    {it.title}
                  </Link>
                </h2>
                <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)", maxWidth: "72ch" }}>
                  {it.summary}
                </p>
                <div className="wl-badge-row">
                  {it.tags.map((t) => (
                    <span key={t} className="wl-badge">
                      {t}
                    </span>
                  ))}
                  {it.author && (
                    <span className="caption" style={{ color: "var(--ink-muted)" }}>
                      by {it.author}
                    </span>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
      <aside className="blog__side" aria-label="Blog topics and feeds">
        {topics.length > 0 && (
          <section style={{ display: "grid", gap: 10 }}>
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
          <a href="/blog/rss.xml">rss feed ↗</a>
          <a href={`${REPO_URL()}/releases`}>github releases ↗</a>
          <Link href="/changelog">full changelog →</Link>
        </section>
      </aside>
    </main>
  );
}
