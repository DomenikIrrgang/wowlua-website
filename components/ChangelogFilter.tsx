"use client";

import { useEffect, useRef, useState } from "react";

const KINDS = ["all", "added", "changed", "fixed"] as const;

/**
 * The changelog's "show" buttons: hide every section but one kind. On phones the buttons stick under the header,
 * and releases marked data-older wait behind a "show … and older" button (`older` names the first of them).
 */
export function ChangelogFilter({ latest, older, children }: { latest: string; older?: string; children: React.ReactNode }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [showOlder, setShowOlder] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A link to an older release shows them all.
    const sync = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (id && list.current?.querySelector(`[data-older][id="${CSS.escape(id)}"]`)) setShowOlder(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <>
      {latest && (
        <span className="caption changelog-latest" style={{ color: "var(--ink-muted)" }}>
          {latest}
        </span>
      )}
      <div className="changelog-bar">
        <div role="group" aria-label="Show" className="changelog-bar__group">
          {KINDS.map((k, i) => (
            <button
              key={k}
              className={`wl-btn wl-btn--small${k === kind ? "" : " wl-btn--ghost"}`}
              type="button"
              aria-pressed={k === kind}
              onClick={() => setKind(k)}
              style={{
                border: 0,
                borderLeft: i ? "1px solid var(--line)" : 0,
                ...(k === kind ? { background: "var(--amber)", color: "var(--on-amber)" } : {}),
              }}
            >
              {k}
            </button>
          ))}
        </div>
        {latest && (
          <span className="caption changelog-bar__latest" style={{ color: "var(--ink-muted)" }}>
            {latest}
          </span>
        )}
      </div>
      <div className="changelog" data-show={kind} data-older-shown={showOlder ? "" : undefined} ref={list}>
        {children}
      </div>
      {older && !showOlder && (
        <button type="button" className="wl-btn wl-btn--secondary changelog-older" onClick={() => setShowOlder(true)}>
          show {older} and older
        </button>
      )}
    </>
  );
}
