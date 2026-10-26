"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUSES, TONE, fmt, pct } from "./shared";

/** A namespace's card: its title, URL, and its functions by status (in STATUSES order). */
export type NamespaceCard = [title: string, href: string, counts: number[]];

/** Cards shown before "all namespaces". */
const FIRST = 16;

/** The index's namespace grid: the biggest first, the rest on "all …" (or when the page opens at #all-namespaces). */
export function NamespaceGrid({ cards }: { cards: NamespaceCard[] }) {
  const [all, setAll] = useState(false);
  useEffect(() => {
    const open = () => window.location.hash === "#all-namespaces" && setAll(true);
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  const shown = all ? cards : cards.slice(0, FIRST);
  return (
    <>
      <ul className="api-grid" id="all-namespaces">
        {shown.map(([title, href, counts]) => {
          const total = counts.reduce((a, b) => a + b, 0);
          return (
            <li key={href}>
              <Link href={href} className="api-card">
                <span className="api-card__head">
                  <span className="heading-3">{title}</span>
                  <span className="caption">
                    {fmt(total)} {total === 1 ? "function" : "functions"}
                  </span>
                </span>
                <span className="api-meter" style={{ height: 6 }} aria-hidden="true">
                  {STATUSES.map((s, i) => counts[i] > 0 && <span key={s} style={{ width: pct(counts[i], total), background: TONE[s] }} title={`${s}: ${fmt(counts[i])}`} />)}
                </span>
                <span className="caption api-card__counts">
                  {STATUSES.filter((s, i) => counts[i] || s !== "not implemented")
                    .map((s) => `${fmt(counts[STATUSES.indexOf(s)])} ${s}`)
                    .join(" · ")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {!all && cards.length > FIRST && (
        <button type="button" className="api-grid__all" onClick={() => setAll(true)}>
          all {fmt(cards.length - 1)} namespaces →
        </button>
      )}
    </>
  );
}
