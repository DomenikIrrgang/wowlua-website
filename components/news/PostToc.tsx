"use client";

import { useState } from "react";
import type { TocEntry } from "@/lib/markdown";

/** A blog post's sections in a box that opens on tap; phones only (wider screens have the side table of contents). */
export function PostToc({ entries }: { entries: TocEntry[] }) {
  const [open, setOpen] = useState(false);
  const shown = entries.filter((e) => e.depth === 2);
  if (shown.length < 2) return null;
  return (
    <nav className="post-toc" aria-label="In this post">
      <button type="button" className="post-toc__toggle" aria-expanded={open} aria-controls="post-toc-list" onClick={() => setOpen(!open)}>
        <span>
          in this post <span style={{ color: "var(--ink-muted)" }}>· {shown.length} sections</span>
        </span>
        <span style={{ color: "var(--ink-muted)", fontSize: 16 }} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <ol id="post-toc-list" className="post-toc__list">
          {shown.map((e) => (
            <li key={e.id}>
              <a href={`#${e.id}`} onClick={() => setOpen(false)}>
                {e.text}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
