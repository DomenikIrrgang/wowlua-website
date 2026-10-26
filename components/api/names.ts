"use client";

import { useCallback, useEffect, useState } from "react";
import { KINDS, type NameEntry } from "./shared";

// The names index (app/api/names.json) is fetched once per visit, when a
// search or the sidebar's filter is first used, and shared by both.
let names: Promise<NameEntry[]> | null = null;

const load = () => (names ??= fetch("/api/names.json").then((r) => (r.ok ? r.json() : []), () => []));

/** The names index, once `start()` has been called (on focus or a first keystroke). */
export function useNames() {
  const [index, setIndex] = useState<NameEntry[] | null>(null);
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    load().then((n) => live && setIndex(n));
    return () => void (live = false);
  }, [wanted]);
  const start = useCallback(() => setWanted(true), []);
  return { index, start };
}

/** How well an entry's name matches: its own name (after the namespace or widget) first, then anywhere. */
export function rank([name]: NameEntry, q: string): number {
  if (!q) return 1;
  const n = name.toLowerCase();
  const own = n.slice(Math.max(n.lastIndexOf("."), n.lastIndexOf(":")) + 1);
  if (own === q || n === q) return 5;
  if (own.startsWith(q)) return 4;
  if (n.startsWith(q)) return 3;
  if (n.includes(q)) return 2;
  return q.split(/\s+/).every((w) => n.includes(w)) ? 1 : 0;
}

/** Entries matching `q`, best first (the index's order among equals). */
export function search(index: NameEntry[], q: string): NameEntry[] {
  if (!q) return index;
  return index
    .map((e, i) => ({ e, i, s: rank(e, q) }))
    .filter((h) => h.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((h) => h.e);
}

export const kindOf = (e: NameEntry) => KINDS[e[1]];
