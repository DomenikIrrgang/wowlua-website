"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The docs sidebar. On narrow screens its navigation folds behind a button; on phones that button is a sticky bar
 * under the header that names the page ("docs / guide / getting started") and drops the contents down over the page.
 */
export function SidebarToggle({ crumbs, children }: { crumbs: string[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button className="docs-bar" type="button" aria-expanded={open} aria-controls="docs-contents" onClick={() => setOpen((o) => !o)}>
        <span className="wl-sr-only">contents: </span>
        {crumbs.slice(0, -1).map((c, i) => (
          <span className="docs-bar__crumb" key={i}>
            {c} /
          </span>
        ))}
        <span className="docs-bar__page">{crumbs.at(-1)}</span>
        <span className="docs-bar__sign" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      <div className="docs-sidebar" id="docs-contents" data-open={open ? "" : undefined}>
        <button className="wl-btn wl-btn--secondary wl-btn--small docs-sidebar__toggle" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "hide contents" : "show contents"}
        </button>
        {children}
      </div>
    </>
  );
}
