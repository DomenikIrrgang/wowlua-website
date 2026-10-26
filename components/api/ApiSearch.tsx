"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { search, useNames } from "./names";
import { BADGE, KINDS, type Kind, type NameEntry, STATUSES, type Status, entryHref, entryWhere, fmt } from "./shared";

/** Results shown before "show all", and how many more each press shows once there are too many to list at once. */
const PAGE = 15;
const MORE = 200;

const KIND_LABEL: Record<Kind, string> = { function: "function", event: "event", method: "widget method", namespace: "namespace" };
const KIND_FILTERS: [Kind | "all", string][] = [
  ["all", "all"],
  ["function", "functions"],
  ["event", "events"],
  ["method", "widget methods"],
  ["namespace", "namespaces"],
];

export type Described = [summary: string, byWowlua: boolean] | null;

/**
 * The index's search over every function, event, widget method and namespace, filtered by kind and status. The page
 * renders the first results with their descriptions; the names index loads on first use, and the descriptions of the
 * results on screen are fetched as they are shown.
 */
export function ApiSearch({ initial, counts }: { initial: { entry: NameEntry; d: Described }[]; counts: Record<Kind | "all", number> }) {
  const { index, start } = useNames();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [limit, setLimit] = useState(PAGE);
  const [described, setDescribed] = useState<Map<string, Described>>(() => new Map(initial.map((r) => [r.entry[0], r.d])));
  const asked = useRef(new Set<string>());

  // The sidebar's filter links here with ?q=.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q);
      start();
    }
  }, [start]);

  const q = query.trim().toLowerCase();
  const pristine = !q && kind === "all" && status === "all";
  const { list, byKind } = useMemo(() => {
    if (!index) return { list: pristine ? initial.map((r) => r.entry) : null, byKind: counts };
    const matched = search(index, q);
    const byKind = { all: matched.length } as Record<Kind | "all", number>;
    for (const k of KINDS) byKind[k] = 0;
    for (const e of matched) byKind[KINDS[e[1]]]++;
    const list = matched.filter((e) => (kind === "all" || KINDS[e[1]] === kind) && (status === "all" || STATUSES[e[2]] === status));
    return { list, byKind };
  }, [index, q, kind, status, pristine, initial, counts]);

  const total = index ? (list?.length ?? 0) : pristine ? counts.all : 0;
  const shown = (list ?? []).slice(0, limit);

  // Fetch the descriptions of the results on screen that aren't known yet.
  useEffect(() => {
    const missing = shown.map((e) => e[0]).filter((n) => !described.has(n) && !asked.current.has(n));
    if (!missing.length) return;
    for (const n of missing) asked.current.add(n);
    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += 60) batches.push(missing.slice(i, i + 60));
    for (const b of batches) {
      fetch(`/api/summaries?n=${encodeURIComponent(b.join(","))}`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((got: Record<string, Described>) => {
          setDescribed((m) => {
            const next = new Map(m);
            for (const n of b) next.set(n, got[n] ?? null);
            return next;
          });
        }, () => {});
    }
  }, [shown, described]);

  const change = <T,>(set: (v: T) => void) => (v: T) => {
    start();
    set(v);
    setLimit(PAGE);
  };

  return (
    <section className="api-search" aria-label="Search the API">
      <div className="wl-input" style={{ width: "100%" }}>
        <span className="wl-input__prefix" aria-hidden="true">
          /
        </span>
        <input
          className="wl-input__control"
          type="search"
          aria-label="Search functions, events, widget methods and namespaces"
          placeholder="search: bag, health, UNIT_AURA, SetValue …"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onFocus={start}
          onChange={(e) => change(setQuery)(e.target.value)}
        />
      </div>
      <div className="api-search__filters">
        <div role="group" aria-label="Kind" className="api-search__group">
          {KIND_FILTERS.map(([id, label]) => (
            <button
              key={id}
              className={`wl-btn wl-btn--small ${kind === id ? "wl-btn--primary" : "wl-btn--secondary"}`}
              type="button"
              aria-pressed={kind === id}
              onClick={() => change(setKind)(id)}
            >
              {label} <span className="caption" style={{ opacity: 0.75 }}>{fmt(byKind[id])}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Status in wowlua" className="api-search__group">
          {(["all", ...STATUSES] as const).map((id) => (
            <button
              key={id}
              className={`wl-btn wl-btn--small ${status === id ? "wl-btn--primary" : "wl-btn--ghost"}`}
              type="button"
              aria-pressed={status === id}
              onClick={() => change(setStatus)(id)}
            >
              {id === "all" ? "any status" : id}
            </button>
          ))}
        </div>
      </div>
      <p className="caption api-search__summary" aria-live="polite">
        {list === null ? "loading…" : `${fmt(total)} ${total === 1 ? "result" : "results"}${q ? ` for "${query.trim()}"` : ""}`}
      </p>
      <ul className="api-search__results">
        {shown.map((e) => {
          const d = described.get(e[0]);
          const st = e[2] >= 0 ? STATUSES[e[2]] : null;
          return (
            <li key={e[0] + e[1]}>
              <Link href={entryHref(e)} className="api-search__row">
                <code className="api-search__name">{e[0]}</code>
                <span className="wl-badge">{KIND_LABEL[KINDS[e[1]]]}</span>
                {st ? (
                  <span className={`wl-badge ${BADGE[st]}`}>
                    <span className="wl-badge__dot" aria-hidden="true" />
                    {st}
                  </span>
                ) : (
                  <span className="wl-badge">mixed</span>
                )}
                <span className="caption api-search__where">{entryWhere(e)}</span>
                {d && (
                  <span className="body-s api-search__desc">
                    {d[0].replace(/`/g, "")}
                    {d[1] && <span className="caption" style={{ color: "var(--ink-faint)" }}> · description by wowlua</span>}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {list !== null && total > shown.length && (
        <button className="wl-btn wl-btn--secondary wl-btn--small api-search__more" type="button" onClick={() => (start(), setLimit((l) => (total - l <= MORE ? total : l + MORE)))}>
          {total - shown.length <= MORE ? `show all ${fmt(total)} results` : `show ${MORE} more of ${fmt(total)} results`}
        </button>
      )}
      {list !== null && total === 0 && (
        <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
          Nothing matches. Try part of a name (<code className="wl-icode">Bag</code>), an event (<code className="wl-icode">UNIT_</code>) or a widget method (
          <code className="wl-icode">SetValue</code>).
        </p>
      )}
    </section>
  );
}
