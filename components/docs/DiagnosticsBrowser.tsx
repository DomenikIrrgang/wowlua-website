"use client";

import Link from "next/link";
import { useState } from "react";

export type BrowserCode = { code: string; kind: "error" | "warning" | "hint"; text: string; html: string; href: string | null };
export type BrowserArea = { range: string; title: string; short?: string; codes: BrowserCode[] };

const KINDS = [
  { kind: "error", label: "errors", badge: "wl-badge--error" },
  { kind: "warning", label: "warnings", badge: "wl-badge--warning" },
  { kind: "hint", label: "hints", badge: "wl-badge--note" },
] as const;
const badgeOf = (kind: BrowserCode["kind"]) => KINDS.find((k) => k.kind === kind)!.badge;

function Row({ c, area }: { c: BrowserCode; area?: string }) {
  const body = (
    <>
      <span className={`wl-badge ${badgeOf(c.kind)}`}>{c.code}</span>
      <span className="body-s docs-dx__msg">
        <span dangerouslySetInnerHTML={{ __html: c.html }} />
        {area && <span className="caption docs-dx__where">{area}</span>}
      </span>
      <span className="docs-dx__arrow" aria-hidden="true">
        {c.href ? "→" : ""}
      </span>
    </>
  );
  return c.href ? (
    <Link className="docs-dx__row" href={c.href}>
      {body}
    </Link>
  ) : (
    <div className="docs-dx__row">{body}</div>
  );
}

/**
 * The errors and warnings on phones: search the codes and their messages, filter by severity, and browse them by
 * area. Wider screens get DiagnosticsIndex instead.
 */
export function DiagnosticsBrowser({ areas }: { areas: BrowserArea[] }) {
  const [query, setQuery] = useState("");
  const [off, setOff] = useState<string[]>([]);
  const all = areas.flatMap((a) => a.codes);
  const kinds = KINDS.filter((k) => all.some((c) => c.kind === k.kind));
  const keep = (c: BrowserCode) => !off.includes(c.kind);
  const q = query.trim().toLowerCase();
  const results = q
    ? areas.flatMap((a) =>
        a.codes.filter((c) => keep(c) && `${c.code} ${c.text}`.toLowerCase().includes(q)).map((c) => ({ c, area: `${a.range} · ${a.title}` })),
      )
    : [];

  return (
    <section className="docs-dx" aria-label="Browse the diagnostics">
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
      <div className="docs-dx__bar">
        <label className="wl-sr-only" htmlFor="docs-dx-q">
          search codes and messages
        </label>
        <div className="docs-dx__search">
          <span aria-hidden="true">/</span>
          <input
            id="docs-dx-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="E2001, nil, saved.bind …"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="docs-dx__kinds" role="group" aria-label="Severity" style={{ gridTemplateColumns: `repeat(${kinds.length}, minmax(0, 1fr))` }}>
          {kinds.map((k) => (
            <button
              key={k.kind}
              type="button"
              aria-pressed={!off.includes(k.kind)}
              data-kind={k.kind}
              onClick={() => setOff((o) => (o.includes(k.kind) ? o.filter((x) => x !== k.kind) : [...o, k.kind]))}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {q ? (
        <div>
          <p className="caption docs-dx__note" role="status">
            {results.length} {results.length === 1 ? "match" : "matches"} for &quot;{query.trim()}&quot;
          </p>
          {results.map(({ c, area }) => (
            <Row key={c.code} c={c} area={area} />
          ))}
        </div>
      ) : (
        <div>
          <p className="caption docs-dx__note">by area · tap one to open it</p>
          <div className="docs-dx__areas">
            {areas.map((a) => {
              const codes = a.codes.filter(keep);
              return (
                <details className="docs-dx__area" key={a.range}>
                  <summary>
                    <span className="docs-dx__head">
                      <span className="label">{a.range}</span>
                      <span className="body-s">{a.title}</span>
                    </span>
                    <span className="docs-dx__count">
                      <span className="caption">{codes.length}</span>
                      <span className="docs-dx__sign" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="docs-dx__list">
                    {codes.map((c) => (
                      <Row key={c.code} c={c} />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
