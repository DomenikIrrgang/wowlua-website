import Link from "next/link";
import { Fragment } from "react";
import { type Api, type Doc, type Event, type Fn, type Method, type Section, type Source, bodyOf, payloadText, signature } from "@/lib/api";
import { escapeHtml } from "@/lib/highlight";
import { inlineMd } from "@/lib/inline";
import { BADGE, type Status, STATUSES, TONE, eventHref, fmt, pct } from "./shared";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`wl-badge ${BADGE[status]}`}>
      <span className="wl-badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}

type Counts = Partial<Record<Status, number>> & { total: number };

/** A bar split by status; `label` names it for screen readers (the page's caption says the same). */
export function StatusMeter({ counts, height = 12, label }: { counts: Counts; height?: number; label?: string }) {
  return (
    <span className="api-meter" style={{ height }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {STATUSES.filter((s) => counts[s]).map((s) => (
        <span key={s} style={{ width: pct(counts[s]!, counts.total), background: TONE[s] }} title={`${s}: ${fmt(counts[s]!)}`} />
      ))}
    </span>
  );
}

/** "17 implemented · 3 recorded · 27 guessed", the statuses that occur (implemented, recorded and guessed always). */
export const countsText = (c: Counts, sep = " · ") =>
  STATUSES.filter((s) => c[s] || s !== "not implemented")
    .map((s) => `${fmt(c[s] ?? 0)} ${s}`)
    .join(sep);

// Table rows are written as HTML: the global functions and the events are thousands of rows, and as React elements
// the page would carry each of them a second, much larger time in its RSC payload.

const badgeHtml = (status: Status) => `<span class="wl-badge ${BADGE[status]}"><span class="wl-badge__dot" aria-hidden="true"></span>${status}</span>`;

function summaryHtml(doc: Doc): string {
  if (!doc?.summary) return "No description yet.";
  return inlineMd(doc.summary) + (doc.summarySource === "wowlua" ? ' <span class="caption wl-muted">· by wowlua</span>' : "");
}

/**
 * The rows of a namespace's functions or a widget's methods: name, what it does and its signature, status. A method
 * row carries its name as its id, and links its warcraft.wiki.gg page when the description comes from there.
 */
export function callableRows(rows: { name: string; href?: string; entry: Fn | Method; id?: string; wikiLink?: boolean }[]): string {
  return rows
    .map(({ name, href, entry, id, wikiLink }) => {
      const documented = !("documented" in entry) || entry.documented;
      const code = `<code>${escapeHtml(name)}</code>`;
      const wiki =
        wikiLink && entry.doc?.summarySource === "wiki" && entry.doc.wiki
          ? ` <a class="caption api-wiki" href="${escapeHtml(entry.doc.wiki)}" rel="noreferrer">· warcraft.wiki.gg ↗</a>`
          : "";
      const sig = documented ? escapeHtml(signature(entry)) : "not in Blizzard&#39;s documentation";
      return (
        `<tr${id ? ` id="${escapeHtml(id)}"` : ""}><td class="api-name">${href ? `<a href="${escapeHtml(href)}">${code}</a>` : code}</td>` +
        `<td>${summaryHtml(entry.doc)}${wiki}<br><code class="caption wl-muted">${sig}</code></td><td>${badgeHtml(entry.status)}</td></tr>`
      );
    })
    .join("");
}

export const eventRows = (events: Event[]) =>
  events
    .map(
      (e) =>
        `<tr><td><a href="${eventHref(e.name)}"><code>${escapeHtml(e.name)}</code></a></td>` +
        `<td><code class="caption">${escapeHtml(payloadText(e))}</code></td><td>${badgeHtml(e.status)}</td></tr>`,
    )
    .join("");

/** A section of the page: an h2 the contents list links to, and its body. */
export function ApiSection({ id, title, children, className }: { id: string; title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`h-${id}`} className={`api-section${className ? ` ${className}` : ""}`}>
      <h2 id={`h-${id}`} className="heading-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A note's section, rendered Markdown under the page's own heading. */
export function NoteSection({ id, title, section }: { id: string; title?: string; section: Section }) {
  return (
    <ApiSection id={id} title={title ?? section.title}>
      <div className="md api-note" dangerouslySetInnerHTML={{ __html: bodyOf(section) }} />
    </ApiSection>
  );
}

export function Related({ lists }: { lists: { label: string; items: { name: string; href: string; note?: string | null }[] }[] }) {
  const shown = lists.filter((l) => l.items.length);
  if (!shown.length) return null;
  return (
    <ApiSection id="related" title="Related">
      <div className="api-related">
        {shown.map((l) => (
          <ul key={l.label} className="body-s" aria-label={l.label}>
            {l.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href}>{it.name}</Link>
                {it.note && <span dangerouslySetInnerHTML={{ __html: ` · ${inlineMd(it.note)}` }} />}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </ApiSection>
  );
}

/** One of the data's source strings (`sources`), with warcraft.wiki.gg's page and licence linked. */
export function SourceText({ api, source, page }: { api: Api; source: Source; page?: string | null }) {
  const text = api.sources[source];
  if (source !== "wiki") return <>{text}</>;
  // "warcraft.wiki.gg's API pages, by its contributors, CC BY-SA 4.0 (https://…)"
  const m = /^(.*?)\s*\((https?:[^)]+)\)\s*$/.exec(text);
  const [body, licence] = m ? [m[1], m[2]] : [text, null];
  const parts = body.split(", ");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && ", "}
          {i === 0 && page ? (
            <a href={page} rel="noreferrer">
              {p} ↗
            </a>
          ) : /CC BY/.test(p) && licence ? (
            <a href={licence} rel="noreferrer">
              {p} ↗
            </a>
          ) : (
            p
          )}
        </span>
      ))}
    </>
  );
}

/** The design's "sources" line: what each part of the page's text comes from. */
export function Sources({ api, parts }: { api: Api; parts: { label: string; sources: Source[]; context?: string; page?: string | null }[] }) {
  const shown = parts.filter((p) => p.sources.length);
  if (!shown.length) return null;
  return (
    <section className="api-sources" aria-labelledby="h-sources" id="sources">
      <h2 id="h-sources" className="label">
        sources
      </h2>
      <p className="caption">
        {shown.map((p, i) => (
          <span key={i}>
            {i > 0 && " "}
            {p.label}:{" "}
            {p.sources.map((s, k) => (
              <span key={s}>
                {k > 0 && "; "}
                <SourceText api={api} source={s} page={p.page} />
                {s === "blizzard" && p.context ? ` (${p.context})` : ""}
              </span>
            ))}
            .
          </span>
        ))}
      </p>
    </section>
  );
}

/** The header every entry shares: its name, badges. */
export function EntryHead({ title, badges }: { title: string; badges: React.ReactNode }) {
  return (
    <div className="api-head">
      {/* Long names break after their namespace or widget: C_Container.<wbr>GetContainerItemInfo */}
      <h1 className="heading-1">
        {title.split(/(?<=[.:])/).map((part, i) => (
          <Fragment key={i}>
            {i > 0 && <wbr />}
            {part}
          </Fragment>
        ))}
      </h1>
      <div className="wl-badge-row">{badges}</div>
    </div>
  );
}
