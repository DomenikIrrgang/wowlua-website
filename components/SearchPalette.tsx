"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

/** One searchable heading or page (built by app/search-index.json/route.ts). */
export type SearchEntry = { t: string; u: string; g: string; p?: string; k: "page" | "h" };

const ORDER = ["guide", "language", "standard library", "toolchain", "appendices", "diagnostics", "specification", "blog", "pages"];

const listeners = new Set<() => void>();
export function openSearch() {
  listeners.forEach((l) => l());
}

function score(e: SearchEntry, q: string) {
  const t = e.t.toLowerCase();
  const p = (e.p ?? "").toLowerCase();
  if (!q) return e.k === "page" && e.g === "guide" ? 1 : 0;
  if (t.startsWith(q)) return 4;
  if (t.includes(q)) return 3;
  if (p.includes(q)) return 1;
  return q.split(/\s+/).every((w) => t.includes(w) || p.includes(w)) ? 1 : 0;
}

function Marked({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<Element | null>(null);

  const show = useCallback(() => {
    lastFocus.current = document.activeElement;
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    setQuery("");
    (lastFocus.current as HTMLElement | null)?.focus?.();
  }, []);

  useEffect(() => {
    listeners.add(show);
    return () => void listeners.delete(show);
  }, [show]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (open) hide();
        else show();
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        show();
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        hide();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, show, hide]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    if (!index) {
      fetch("/search-index.json")
        .then((r) => r.json())
        .then(setIndex, () => setIndex([]));
    }
  }, [open, index]);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const hits = (index ?? [])
      .map((e) => ({ e, s: score(e, q) }))
      .filter((h) => h.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 60);
    const by = new Map<string, SearchEntry[]>();
    for (const h of hits) by.set(h.e.g, [...(by.get(h.e.g) ?? []), h.e]);
    const ordered = [...ORDER.filter((g) => by.has(g)), ...[...by.keys()].filter((g) => !ORDER.includes(g))];
    return ordered.map((g) => ({ g, items: by.get(g)!.slice(0, 6) }));
  }, [index, q]);
  const flat = groups.flatMap((g) => g.items);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const go = (url: string) => {
    hide();
    router.push(url);
  };

  let n = -1;
  return (
    <div className="wl-search-scrim" onMouseDown={(e) => e.target === e.currentTarget && hide()}>
      <div className="wl-search" role="dialog" aria-modal="true" aria-label="Search the docs">
        <div className="wl-search__field">
          <span className="wl-search__prompt" aria-hidden="true">
            /
          </span>
          <input
            ref={input}
            className="wl-search__input"
            type="search"
            placeholder="search docs, commands, modules, codes"
            aria-label="search query"
            aria-controls="wl-search-res"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => (flat.length ? (a + 1) % flat.length : 0));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0));
              } else if (e.key === "Enter" && flat[active]) {
                e.preventDefault();
                go(flat[active].u);
              }
            }}
          />
          <kbd className="wl-kbd">esc</kbd>
        </div>
        <div className="wl-search__results" id="wl-search-res" role="listbox" aria-label="results">
          {index === null ? (
            <p className="wl-search__empty">loading…</p>
          ) : flat.length === 0 ? (
            <p className="wl-search__empty">
              no results for “{query}”. Try a command, a module or a diagnostic code.
            </p>
          ) : (
            groups.map(({ g, items }) => (
              <Fragment key={g}>
                <p className="wl-search__group">{g}</p>
                <ul className="wl-search__list">
                  {items.map((e) => {
                    n++;
                    const i = n;
                    return (
                      <li key={e.u + e.t}>
                        <a
                          className="wl-search__item"
                          role="option"
                          aria-selected={i === active}
                          href={e.u}
                          ref={(el) => {
                            if (el && i === active) el.scrollIntoView({ block: "nearest" });
                          }}
                          onMouseMove={() => setActive(i)}
                          onClick={(ev) => {
                            ev.preventDefault();
                            go(e.u);
                          }}
                        >
                          <span className="wl-search__kind">{e.k === "page" ? "page" : "#"}</span>
                          <span className="wl-search__title">
                            <Marked text={e.t} q={q} />
                          </span>
                          <span className="wl-search__path">{e.p ?? e.u}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Fragment>
            ))
          )}
        </div>
        <div className="wl-search__foot">
          <span>
            <kbd className="wl-kbd">↑</kbd> <kbd className="wl-kbd">↓</kbd> move
          </span>
          <span>
            <kbd className="wl-kbd">↩</kbd> open
          </span>
          <span>
            <kbd className="wl-kbd">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
