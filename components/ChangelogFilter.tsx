"use client";

import { useState } from "react";

const KINDS = ["all", "added", "changed", "fixed"] as const;

/** The changelog's "show" buttons: hide every section but one kind. */
export function ChangelogFilter({ latest, children }: { latest: string; children: React.ReactNode }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  return (
    <>
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
          <span className="caption" style={{ color: "var(--ink-muted)" }}>
            {latest}
          </span>
        )}
      </div>
      <div className="changelog" data-show={kind}>
        {children}
      </div>
    </>
  );
}
