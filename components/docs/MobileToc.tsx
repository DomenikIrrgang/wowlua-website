"use client";

import { useState } from "react";
import type { TocEntry } from "@/lib/markdown";

/** "On this page" for phones: a folded box above the article (the desktop column is hidden there). */
export function MobileToc({ entries }: { entries: TocEntry[] }) {
  const [open, setOpen] = useState(false);
  const shown = entries.filter((e) => e.depth === 2);
  if (shown.length < 2) return null;
  return (
    <nav className="docs-mtoc" aria-label="On this page">
      <button className="docs-mtoc__toggle" type="button" aria-expanded={open} aria-controls="docs-mtoc-list" onClick={() => setOpen((o) => !o)}>
        <span>
          on this page <span className="docs-mtoc__count">· {shown.length} sections</span>
        </span>
        <span className="docs-mtoc__sign" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      <ol id="docs-mtoc-list" hidden={!open}>
        {shown.map((e) => (
          <li key={e.id}>
            <a href={`#${e.id}`} onClick={() => setOpen(false)}>
              {e.text.replace(/^[A-Z]?[\d.]+\s+/, "")}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
