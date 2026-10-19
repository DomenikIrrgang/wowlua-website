"use client";

import { useEffect, useRef, useState } from "react";

export type BadgeVariant = { id: string; file: string; label: string; note: string; height: number; bg: string };
export type BadgeSnippet = { label: string; note: string; code: string };

/** The badge page on a phone: pick a style, pick where it goes, copy one snippet. */
export function BadgePicker({ variants, snippets }: { variants: BadgeVariant[]; snippets: Record<string, BadgeSnippet[]> }) {
  const [style, setStyle] = useState(variants[0].id);
  const [format, setFormat] = useState(1);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const v = variants.find((x) => x.id === style) ?? variants[0];
  const forms = snippets[v.id];
  const snippet = forms[format] ?? forms[0];
  const pick = (fn: () => void) => () => {
    fn();
    setCopied(false);
  };
  const copy = () => {
    navigator.clipboard?.writeText(snippet.code).then(
      () => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  };
  return (
    <div className="badge-picker">
      <div className="badge-picker__step">
        <span className="label" style={{ color: "var(--ink-muted)" }}>
          1 · pick a style
        </span>
        <div role="radiogroup" aria-label="Badge style" className="badge-picker__seg">
          {variants.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === style} onClick={pick(() => setStyle(x.id))}>
              {x.label}
            </button>
          ))}
        </div>
        <span className="caption" style={{ color: "var(--ink-muted)" }}>
          {v.note}
        </span>
      </div>

      <div className="badge-picker__preview" style={{ background: v.bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badge/${v.file}`} alt="built with wowlua" height={v.height} />
      </div>

      <div className="badge-picker__step">
        <span className="label" style={{ color: "var(--ink-muted)" }}>
          2 · pick where it goes
        </span>
        <div role="radiogroup" aria-label="Snippet format" className="badge-picker__seg">
          {forms.map((s, i) => (
            <button key={s.label} type="button" role="radio" aria-checked={i === format} onClick={pick(() => setFormat(i))}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="caption" style={{ color: "var(--ink-muted)" }}>
          {snippet.note}
        </span>
      </div>

      <div className="badge-picker__step">
        <span className="label" style={{ color: "var(--ink-muted)" }}>
          3 · copy the snippet
        </span>
        <div className="badge-picker__snippet">
          <pre>{snippet.code}</pre>
          <button type="button" className="wl-btn wl-btn--primary" onClick={copy}>
            {copied ? "copied" : "copy snippet"}
          </button>
        </div>
      </div>
    </div>
  );
}
