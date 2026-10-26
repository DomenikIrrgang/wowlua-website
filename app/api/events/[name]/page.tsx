import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiLayout, ApiMobileToc, tocOf } from "@/components/api/ApiLayout";
import { ApiSection, EntryHead, NoteSection, Related, Sources, StatusBadge } from "@/components/api/parts";
import { ValuesTable } from "@/components/api/ValuesTable";
import { eventHref, functionHref, humanize, namespaceHref } from "@/components/api/shared";
import { PageNav } from "@/components/docs/parts";
import {
  type Event,
  api,
  bodyOf,
  clientVersion,
  credits,
  eventDeclaration,
  eventFacts,
  eventStatusMeaning,
  note,
  noteSection,
  otherSections,
  relatedToEvent,
  restrictions,
} from "@/lib/api";
import { inlineMd } from "@/lib/inline";
import { ogMetadata } from "@/lib/og";

// 1,800 events: each renders on its first visit.
export const dynamicParams = true;

type Params = { name: string };

export function generateStaticParams(): Params[] {
  return [];
}

function load({ name }: Params) {
  const a = api();
  const e = a?.event.get(name);
  if (!a || !e) notFound();
  return { a, e };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { e } = load(await params);
  const description = e.doc?.summary?.replace(/`/g, "") ?? `${e.name}, an event of the WoW API: its payload and whether wowlua's emulator fires it.`;
  return { title: `${e.name} · WoW API`, description, ...ogMetadata(eventHref(e.name), `${e.name} · WoW API`, description) };
}

/** What the emulator does with the event: fires it from its models, or leaves it to the tests. */
function firedBy(e: Event) {
  if (e.status === "not implemented") return eventStatusMeaning();
  const models = e.modules;
  return `The emulator fires it on its own${models.length ? `, from its ${models.length === 1 ? models[0] : `${models.slice(0, -1).join(", ")} and ${models.at(-1)}`} ${models.length === 1 ? "model" : "models"}` : ""}.`;
}

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { a, e } = load(await params);
  const path = eventHref(e.name);
  const n = await note(e.name);
  const emulator = noteSection(n, "in the emulator");
  const example = noteSection(n, "example");
  const testing = noteSection(n, "testing");
  const { secrets, other } = restrictions(e.flags, "event");
  const related = relatedToEvent(a, e);
  const i = a.events.indexOf(e);
  const nav = (x: Event | undefined) => x && { label: x.name, href: eventHref(x.name), repoPath: "" };
  const facts = eventFacts(e);
  const who = credits(e.doc);
  const system = e.system ? { label: humanize(e.system), href: `/api/events#system-${e.system}` } : null;

  const toc = tocOf(
    [
      e.payload.length ? ["payload", "Payload"] : null,
      example ? ["handle", "Handling it"] : null,
      ["emulator", "In the emulator"],
      testing ? ["test", "Testing"] : null,
      ...otherSections(n).map((s) => [s.id, s.title]),
      related.events.length || related.functions.length ? ["related", "Related"] : null,
      ["sources", "Sources"],
    ].filter(Boolean) as [string, string][],
  );

  return (
    <ApiLayout
      api={a}
      current={e.system ? `ev:${e.system}` : "ev:all"}
      crumbs={[{ label: "events", href: "/api/events" }, ...(system ? [system] : []), { label: e.name }]}
      path={path}
      toc={toc}
    >
      <EntryHead
        title={e.name}
        badges={
          <>
            <span className="wl-badge">event</span>
            <StatusBadge status={e.status} />
            {e.namespace && (
              <Link className="wl-badge" href={namespaceHref(e.namespace)}>
                {e.namespace}
              </Link>
            )}
            <span className="wl-badge">available in: {a.flavor}</span>
          </>
        }
      />
      {(e.doc?.summary || n?.lead) && (
        <div className="api-lead body-l">
          {e.doc?.summary && (
            <p>
              <span dangerouslySetInnerHTML={{ __html: inlineMd(e.doc.summary) }} />
              {e.doc.summarySource === "wowlua" && <span className="caption"> · description by wowlua</span>}
            </p>
          )}
          {n?.lead && <div className="md api-note" dangerouslySetInnerHTML={{ __html: n.lead }} />}
        </div>
      )}
      <figure className="wl-code" style={{ margin: 0 }}>
        <div className="wl-code__bar">
          <span className="wl-code__file">declaration</span>
          <span className="wl-code__lang">wowlua</span>
        </div>
        <pre className="wl-code__pre">
          <code dangerouslySetInnerHTML={{ __html: eventDeclaration(e) }} />
        </pre>
      </figure>
      <ApiMobileToc toc={toc} path={path} />

      {e.payload.length > 0 && (
        <ApiSection id="payload" title="Payload">
          <ValuesTable values={e.payload} label="Payload" numbered />
          {facts && <p className="body-s api-muted">{facts}</p>}
        </ApiSection>
      )}

      {example && <NoteSection id="handle" title={/^example$/i.test(example.title) ? "Handling it in wowlua" : example.title} section={example} />}

      <ApiSection id="emulator" title="In wowlua's emulated client">
        <div className="api-state">
          <StatusBadge status={e.status} />
          <span className="body-s">
            {firedBy(e) && <span dangerouslySetInnerHTML={{ __html: inlineMd(firedBy(e)!) }} />} <Link href="/api#status">what the statuses mean</Link>
          </span>
        </div>
        {!e.payload.length && facts && <p className="body-s api-muted">{facts}</p>}
        {(secrets.length > 0 || other.length > 0) && (
          <aside className="wl-callout wl-callout--note api-callout" aria-label="restrictions">
            <div className="wl-callout__head">
              <span className="wl-callout__glyph" aria-hidden="true">
                =
              </span>
              {secrets.length ? "secret values:" : "restrictions:"}
            </div>
            <div className="wl-callout__body">
              <p>{[...secrets, ...other].join(" ")}</p>
            </div>
          </aside>
        )}
        {emulator && <div className="md api-note" dangerouslySetInnerHTML={{ __html: bodyOf(emulator) }} />}
      </ApiSection>

      {testing && <NoteSection id="test" title="Testing code that handles it" section={testing} />}
      {otherSections(n).map((s) => (
        <NoteSection key={s.id} id={s.id} section={s} />
      ))}

      <Related
        lists={[
          { label: "Related events", items: related.events.map((x) => ({ name: x.name, href: eventHref(x.name), note: x.doc?.summary })) },
          { label: "Related functions", items: related.functions.map((f) => ({ name: f.name, href: functionHref(f.name) })) },
        ]}
      />

      <Sources
        api={a}
        parts={[
          { label: "Name, payload and flags", sources: e.documented ? ["blizzard"] : [], context: `${e.system ? `${e.system} system, ` : ""}${a.flavor} ${clientVersion(a)}` },
          { label: "Description", sources: who.summary ? [who.summary] : [], page: e.doc?.wiki },
          { label: "Payload notes", sources: who.notes, page: e.doc?.wiki },
        ]}
      />

      <PageNav prev={nav(a.events[i - 1])} next={nav(a.events[i + 1])} />
    </ApiLayout>
  );
}
