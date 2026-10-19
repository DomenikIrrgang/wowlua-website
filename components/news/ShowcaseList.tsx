"use client";

import { useState } from "react";

export type ShowcaseEntry = {
  name: string;
  description: string;
  kind: "addon" | "library" | "addon suite";
  flavors: string[];
  links: Partial<Record<"website" | "source" | "curseforge" | "wago", string>>;
};

/** The showcase cards. On phones a search box and flavor and kind selects above them filter the list. */
export function ShowcaseList({ entries }: { entries: ShowcaseEntry[] }) {
  const [q, setQ] = useState("");
  const [flavor, setFlavor] = useState("all");
  const [kind, setKind] = useState("all");
  const flavors = [...new Set(entries.flatMap((e) => e.flavors))];
  const kinds = [...new Set(entries.map((e) => e.kind))];
  const ql = q.trim().toLowerCase();
  const shown = entries.filter(
    (e) =>
      (flavor === "all" || e.flavors.includes(flavor)) &&
      (kind === "all" || e.kind === kind) &&
      (!ql || `${e.name} ${e.description}`.toLowerCase().includes(ql)),
  );
  const clear = () => {
    setQ("");
    setFlavor("all");
    setKind("all");
  };
  return (
    <>
      <div className="showcase-filter">
        <label className="wl-sr-only" htmlFor="sc-q">
          filter
        </label>
        <div className="showcase-filter__search">
          <span aria-hidden="true">/</span>
          <input id="sc-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="name or keyword" autoComplete="off" />
        </div>
        <div className="showcase-filter__selects">
          <div className="wl-field">
            <label className="wl-field__label" htmlFor="sc-flavor">
              flavor
            </label>
            <div className="wl-select">
              <select className="wl-select__control" id="sc-flavor" value={flavor} onChange={(e) => setFlavor(e.target.value)}>
                <option value="all">all flavors</option>
                {flavors.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="wl-field">
            <label className="wl-field__label" htmlFor="sc-kind">
              kind
            </label>
            <div className="wl-select">
              <select className="wl-select__control" id="sc-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">all kinds</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <span className="caption" role="status" style={{ color: "var(--ink-muted)" }}>
          {shown.length} {shown.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <ul className="showcase">
        {shown.map((e) => (
          <li key={e.name} className="showcase__item">
            <div className="showcase__head" style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              <h2 className="heading-2" style={{ margin: 0 }}>
                {e.name}
              </h2>
              <span className="wl-badge showcase__kind">{e.kind}</span>
            </div>
            <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
              {e.description}
            </p>
            <div className="wl-badge-row">
              {e.flavors.map((f) => (
                <span key={f} className="wl-badge wl-badge--release">
                  {f}
                </span>
              ))}
            </div>
            <div className="showcase__links caption">
              {Object.entries(e.links).map(([k, u]) => (
                <a key={k} href={u}>
                  <span>{k}</span> <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <div className="showcase-empty">
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            Nothing matches those filters yet.
          </p>
          <button type="button" className="wl-btn wl-btn--secondary" onClick={clear}>
            clear filters
          </button>
        </div>
      )}
    </>
  );
}
