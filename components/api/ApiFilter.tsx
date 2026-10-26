"use client";

import Link from "next/link";
import { useState } from "react";
import { search, useNames } from "./names";
import { entryHref, entryWhere } from "./shared";

/** Rows the filter lists before it points to the full search. */
const LIMIT = 40;

/** The sidebar's "filter the API": while it has text, matching names replace the sidebar's sections (`children`). */
export function ApiFilter({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const { index, start } = useNames();
  const q = query.trim().toLowerCase();
  const hits = q && index ? search(index, q) : [];

  return (
    <>
      <div className="api-filter">
        <label className="caption" htmlFor="api-filter" style={{ color: "var(--ink-muted)" }}>
          filter the API
        </label>
        <div className="wl-input" style={{ width: "100%" }}>
          <input
            id="api-filter"
            className="wl-input__control"
            type="search"
            placeholder="UnitHealth, BAG_UPDATE …"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onFocus={start}
            onChange={(e) => {
              start();
              setQuery(e.target.value);
            }}
          />
        </div>
      </div>
      {q ? (
        <nav className="wl-docs-sidebar api-filter__hits" aria-label="Matching names">
          <div className="wl-docs-sidebar__section">
            <h2 className="wl-docs-sidebar__title" aria-live="polite">
              {index === null ? "loading…" : `${hits.length} ${hits.length === 1 ? "match" : "matches"}`}
            </h2>
            <ul>
              {hits.slice(0, LIMIT).map((e) => (
                <li key={e[0] + e[1]}>
                  <Link className="wl-docs-sidebar__link" href={entryHref(e)}>
                    <span className="api-filter__name">{e[0]}</span>
                    <span className="wl-docs-sidebar__tag">{entryWhere(e)}</span>
                  </Link>
                </li>
              ))}
              {hits.length > LIMIT && (
                <li>
                  <Link className="wl-docs-sidebar__link" href={`/api?q=${encodeURIComponent(query.trim())}`}>
                    all {hits.length} in the search …
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </nav>
      ) : (
        children
      )}
    </>
  );
}
