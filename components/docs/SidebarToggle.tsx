"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** The docs sidebar; on phones its navigation folds behind a button. */
export function SidebarToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="docs-sidebar" data-open={open ? "" : undefined}>
      <button className="wl-btn wl-btn--secondary wl-btn--small docs-sidebar__toggle" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "hide contents" : "show contents"}
      </button>
      {children}
    </div>
  );
}
