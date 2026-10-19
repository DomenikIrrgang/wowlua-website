"use client";

import { useEffect, useState, type ElementType, type ReactNode } from "react";

/**
 * A phone accordion around server-rendered markup (changelog releases, roadmap milestones). On phones the toggle row
 * shows and hides everything after it; on wider screens the toggle is hidden and the rest always shows
 * (styles/mobile/news.css). Opens by itself when the page's hash names it.
 */
export function Disclosure({
  as = "div",
  id,
  className,
  defaultOpen = false,
  summary,
  attrs,
  children,
}: {
  as?: "div" | "li" | "article" | "section";
  id?: string;
  className?: string;
  defaultOpen?: boolean;
  summary: ReactNode;
  attrs?: Record<`data-${string}`, string>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (!id) return;
    const sync = () => {
      if (decodeURIComponent(location.hash.slice(1)) === id) setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [id]);
  const Tag = as as ElementType;
  return (
    <Tag id={id} className={className ? `${className} m-disc` : "m-disc"} data-open={open ? "" : undefined} {...attrs}>
      <button type="button" className="m-disc__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {summary}
        <span className="m-disc__sign" aria-hidden="true" />
      </button>
      {children}
    </Tag>
  );
}
