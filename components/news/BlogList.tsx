"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { FeedItem } from "@/lib/feed";

// Posts per page; older ones are a click on "older" away.
const PER_PAGE = 10;

/** The blog list, a page at a time. On phones topic chips above it filter the posts; wider screens list the topics in the sidebar. */
export function BlogList({ items, topics }: { items: FeedItem[]; topics: string[] }) {
  const [topic, setTopic] = useState("all");
  const [page, setPage] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const shown = topic === "all" ? items : items.filter((it) => it.tags.includes(topic));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const go = (p: number) => {
    setPage(p);
    list.current?.scrollIntoView({ block: "start" });
  };
  return (
    <>
      {topics.length > 0 && (
        <div className="blog__topics">
          <span className="caption" style={{ color: "var(--ink-muted)" }}>
            topic
          </span>
          <div role="group" aria-label="Filter by topic" className="blog__chips">
            {["all", ...topics].map((t) => (
              <button
                key={t}
                type="button"
                className="blog__chip"
                aria-pressed={t === topic}
                onClick={() => {
                  setTopic(t);
                  setPage(0);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      <ol className="blog__list" ref={list}>
        {shown.map((it, i) => (
          <li key={it.href} className="blog__item" hidden={Math.floor(i / PER_PAGE) !== current}>
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
      {pages > 1 && (
        <nav className="wl-page-nav blog__pages" aria-label="Older and newer posts">
          {current > 0 ? (
            <button type="button" className="wl-page-nav__link wl-page-nav__link--prev" onClick={() => go(current - 1)}>
              <span className="wl-page-nav__dir">← newer</span>
              <span className="wl-page-nav__title">page {current}</span>
            </button>
          ) : (
            <span className="wl-page-nav__link wl-page-nav__link--prev blog__pages-none">
              <span className="wl-page-nav__dir">← newer</span>
              <span className="wl-page-nav__title">no newer posts</span>
            </span>
          )}
          {current < pages - 1 ? (
            <button type="button" className="wl-page-nav__link wl-page-nav__link--next" onClick={() => go(current + 1)}>
              <span className="wl-page-nav__dir">older →</span>
              <span className="wl-page-nav__title">page {current + 2}</span>
            </button>
          ) : (
            <span className="wl-page-nav__link wl-page-nav__link--next blog__pages-none">
              <span className="wl-page-nav__dir">older →</span>
              <span className="wl-page-nav__title">no older posts</span>
            </span>
          )}
        </nav>
      )}
      <p className="caption blog__count" role="status">
        {shown.length} {shown.length === 1 ? "post" : "posts"}
        {topic === "all" ? "" : ` about ${topic}`}
      </p>
    </>
  );
}
