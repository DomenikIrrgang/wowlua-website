"use client";

import Link from "next/link";
import { useState } from "react";
import type { BrowserArea, BrowserCode } from "./DiagnosticsBrowser";

const KINDS = [
  { kind: "error", label: "errors", badge: "wl-badge--error" },
  { kind: "warning", label: "warnings", badge: "wl-badge--warning" },
  { kind: "hint", label: "hints", badge: "wl-badge--note" },
] as const;
const badgeOf = (kind: BrowserCode["kind"]) => KINDS.find((k) => k.kind === kind)!.badge;

/** Rows an area shows before "show all". */
const PREVIEW = 6;

const anchor = (a: BrowserArea) => `area-${a.range.replace(/[^\w]+/g, "-")}`;

/**
 * The errors and warnings on wider screens: search, a severity filter, a jump to each area, and a table per area that
 * opens to all its codes. Phones get DiagnosticsBrowser instead.
 */
export function DiagnosticsIndex({ areas }: { areas: BrowserArea[] }) {
  const [query, setQuery] = useState("");
  const [off, setOff] = useState<string[]>([]);
  const [open, setOpen] = useState<string[]>([]);
  const all = areas.flatMap((a) => a.codes);
  const kinds = KINDS.filter((k) => all.some((c) => c.kind === k.kind));
  const q = query.trim().toLowerCase();
  const keep = (c: BrowserCode) => !off.includes(c.kind) && (!q || `${c.code} ${c.text}`.toLowerCase().includes(q));
  const shown = areas.map((a) => ({ ...a, codes: a.codes.filter(keep) })).filter((a) => a.codes.length);

  return (
    <section className="docs-dxi" aria-label="Browse the errors and warnings">
      <div className="wl-badge-row">
        {kinds.map((k) => {
          const n = all.filter((c) => c.kind === k.kind).length;
          return (
            <span className={`wl-badge ${k.badge}`} key={k.kind}>
              {n} {n === 1 ? k.label.slice(0, -1) : k.label}
            </span>
          );
        })}
      </div>

      <div className="docs-dxi__filters">
        <div className="wl-field docs-dxi__search">
          <label className="wl-field__label" htmlFor="docs-dxi-q">
            search codes and messages
          </label>
          <div className="wl-input">
            <span className="wl-input__prefix" aria-hidden="true">
              /
            </span>
            <input
              className="wl-input__control"
              id="docs-dxi-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E2001, nil, saved.bind …"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
        <fieldset className="wl-fieldset docs-dxi__kinds">
          <legend>severity</legend>
          {kinds.map((k) => (
            <label className="wl-check" key={k.kind}>
              <input
                className="wl-check__box"
                type="checkbox"
                checked={!off.includes(k.kind)}
                onChange={() => setOff((o) => (o.includes(k.kind) ? o.filter((x) => x !== k.kind) : [...o, k.kind]))}
              />{" "}
              {k.label}
            </label>
          ))}
        </fieldset>
      </div>

      <nav className="docs-dxi__ranges" aria-label="Areas">
        {shown.map((a) => (
          <a key={a.range} className="wl-btn wl-btn--secondary wl-btn--small" href={`#${anchor(a)}`}>
            {a.range} {a.short ?? ""} · {a.codes.length}
          </a>
        ))}
      </nav>

      {q && (
        <p className="caption docs-dxi__note" role="status">
          {shown.reduce((n, a) => n + a.codes.length, 0)} matches for &quot;{query.trim()}&quot;
        </p>
      )}

      {shown.map((a) => {
        const all = q || open.includes(a.range) || a.codes.length <= PREVIEW + 1;
        const rows = all ? a.codes : a.codes.slice(0, PREVIEW);
        return (
          <section key={a.range} id={anchor(a)} className="docs-dxi__area" aria-labelledby={`${anchor(a)}-h`}>
            <h2 id={`${anchor(a)}-h`} className="heading-3">
              {a.range} · {a.title} <span className="wl-muted">· {a.codes.length}</span>
            </h2>
            <div className="wl-table" role="region" aria-label={`${a.title} codes`} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">code</th>
                    <th scope="col">message</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.code}>
                      <td>
                        {c.href ? (
                          <Link href={c.href} className="docs-dxi__code">
                            <span className={`wl-badge ${badgeOf(c.kind)}`}>{c.code}</span>
                          </Link>
                        ) : (
                          <span className={`wl-badge ${badgeOf(c.kind)}`}>{c.code}</span>
                        )}
                      </td>
                      <td>{c.href ? <Link href={c.href} dangerouslySetInnerHTML={{ __html: c.html }} /> : <span dangerouslySetInnerHTML={{ __html: c.html }} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!all && (
              <button className="wl-textbtn docs-dxi__more" type="button" onClick={() => setOpen((o) => [...o, a.range])}>
                show all {a.codes.length} →
              </button>
            )}
          </section>
        );
      })}
    </section>
  );
}
