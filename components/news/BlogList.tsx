"use client";

import Link from "next/link";
import { useState } from "react";
import type { FeedItem } from "@/lib/feed";

/** The blog list. On phones topic chips above it filter the posts; wider screens list the topics in the sidebar. */
export function BlogList({ items, topics }: { items: FeedItem[]; topics: string[] }) {
  const [topic, setTopic] = useState("all");
  const shown = topic === "all" ? items : items.filter((it) => it.tags.includes(topic));
  return (
    <>
      {topics.length > 0 && (
        <div className="blog__topics">
          <span className="caption" style={{ color: "var(--ink-muted)" }}>
            topic
          </span>
          <div role="group" aria-label="Filter by topic" className="blog__chips">
            {["all", ...topics].map((t) => (
              <button key={t} type="button" className="blog__chip" aria-pressed={t === topic} onClick={() => setTopic(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      <ol className="blog__list">
        {shown.map((it) => (
          <li key={it.href} className="blog__item">
            <time className="caption" dateTime={it.date}>
              {it.date}
              {it.author && <span className="blog__by"> · {it.author}</span>}
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
                  <span className="caption blog__author" style={{ color: "var(--ink-muted)" }}>
                    by {it.author}
                  </span>
                )}
              </div>
            </article>
          </li>
        ))}
      </ol>
      <p className="caption blog__count" role="status">
        {shown.length} {shown.length === 1 ? "post" : "posts"}
        {topic === "all" ? "" : ` about ${topic}`}
      </p>
    </>
  );
}
