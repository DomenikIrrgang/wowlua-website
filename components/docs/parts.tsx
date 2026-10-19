import Link from "next/link";
import type { TocEntry } from "@/lib/markdown";
import type { NavItem } from "@/lib/content";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="wl-breadcrumb" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => (
          <li key={i}>{it.href && i < items.length - 1 ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

export function Toc({ entries }: { entries: TocEntry[] }) {
  const shown = entries.filter((e) => e.depth === 2);
  if (shown.length < 2) return null;
  return (
    <nav className="wl-toc" aria-label="On this page">
      <h2 className="wl-toc__title">on this page</h2>
      <ol>
        {shown.map((e) => (
          <li key={e.id}>
            <a href={`#${e.id}`}>{e.text.replace(/^[A-Z]?[\d.]+\s+/, "").toLowerCase()}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageNav({ prev, next }: { prev?: NavItem; next?: NavItem }) {
  if (!prev && !next) return null;
  return (
    <nav className="wl-page-nav" aria-label="Previous and next page" style={{ marginTop: 32, maxWidth: "var(--size-prose)" }}>
      {prev && (
        <Link className="wl-page-nav__link wl-page-nav__link--prev" href={prev.href}>
          <span className="wl-page-nav__dir">← previous</span>
          <span className="wl-page-nav__title">{prev.label}</span>
        </Link>
      )}
      {next && (
        <Link className="wl-page-nav__link wl-page-nav__link--next" href={next.href}>
          <span className="wl-page-nav__dir">next →</span>
          <span className="wl-page-nav__title">{next.label}</span>
        </Link>
      )}
    </nav>
  );
}

export function Banner({ kind, label, children }: { kind: "warning" | "note"; label: string; children: React.ReactNode }) {
  return (
    <div
      role="note"
      className="docs-banner"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px 16px",
        padding: "12px 16px",
        background: `var(--${kind}-soft)`,
        border: `1px solid var(--${kind})`,
        color: "var(--ink)",
        fontSize: 13,
        lineHeight: "20px",
        maxWidth: "var(--size-prose)",
      }}
    >
      <span style={{ fontWeight: 600, color: `var(--${kind})` }}>{label}</span>
      {children}
    </div>
  );
}
