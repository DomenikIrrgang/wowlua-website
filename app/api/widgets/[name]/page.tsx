import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { ApiLayout, ApiMobileToc, tocOf } from "@/components/api/ApiLayout";
import { ApiSection, EntryHead, NoteSection, Sources, callableRows } from "@/components/api/parts";
import { STATUSES, fmt, widgetHref } from "@/components/api/shared";
import { PageNav } from "@/components/docs/parts";
import { type Source, type Widget, ancestry, api, bodyOf, clientVersion, methodCounts, note, noteSection, otherSections } from "@/lib/api";
import { ogMetadata } from "@/lib/og";

// Widget types added to wowlua's data after the build render on first visit.
export const dynamicParams = true;

type Params = { name: string };

export function generateStaticParams(): Params[] {
  return api()?.widgets.map((w) => ({ name: w.name })) ?? [];
}

function load({ name }: Params) {
  const a = api();
  const w = a?.widget.get(name);
  if (!a || !w) notFound();
  return { a, w };
}

const describe = (w: Widget) =>
  `${w.name} in the WoW API: its ${w.methods.length} methods${w.bases.length ? `, what it inherits from ${w.bases.join(" and ")}` : ""}, and how far wowlua's emulator implements them.`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { w } = load(await params);
  return { title: `${w.name} · WoW API`, description: describe(w), ...ogMetadata(widgetHref(w.name), `${w.name} · WoW API`, describe(w)) };
}

const and = (items: React.ReactNode[]) =>
  items.map((it, i) => (
    <Fragment key={i}>
      {i > 0 && (i === items.length - 1 ? " and " : ", ")}
      {it}
    </Fragment>
  ));

/** A method's note sits under its own heading: its sections one level down. */
const nested = (html: string) => html.replace(/<h2 class="heading-2"/g, '<h4 class="heading-3"').replace(/<\/h2>/g, "</h4>");

export default async function WidgetPage({ params }: { params: Promise<Params> }) {
  const { a, w } = load(await params);
  const path = widgetHref(w.name);
  const n = await note(w.name);
  const example = noteSection(n, "example");
  const testing = noteSection(n, "testing");
  const emulator = noteSection(n, "in the emulator");
  const levels = ancestry(a, w);
  const c = methodCounts(w.methods);
  const methodNotes = (await Promise.all(w.methods.map(async (m) => ({ m, note: await note(`${w.name}:${m.name}`) })))).filter((x) => x.note);
  const i = a.widgets.indexOf(w);
  const nav = (x: Widget | undefined) => x && { label: x.name, href: widgetHref(x.name), repoPath: "" };
  const bases = w.bases.filter((b) => a.widget.has(b));
  const descSources = [...new Set(w.methods.map((m) => m.doc?.summarySource).filter(Boolean) as Source[])].sort();

  const toc = tocOf(
    [
      levels.length > 1 ? ["inherits", "Inherits from"] : null,
      example ? ["create", example.title] : null,
      w.methods.length ? ["methods", `Methods · ${w.methods.length}`] : null,
      methodNotes.length ? ["notes", "Notes on its methods"] : null,
      testing ? ["test", "Testing it"] : null,
      ...otherSections(n).map((s) => [s.id, s.title]),
      ["sources", "Sources"],
    ].filter(Boolean) as [string, string][],
  );

  return (
    <ApiLayout api={a} current={w.widget ? `w:${w.name}` : "w:all"} crumbs={[{ label: "widgets", href: "/api/widgets" }, { label: w.name }]} path={path} toc={toc}>
      <EntryHead
        title={w.name}
        badges={
          <>
            <span className="wl-badge">{w.widget ? "widget type" : "object type"}</span>
            <span className="wl-badge">
              {w.methods.length} {w.methods.length === 1 ? "method" : "methods"}
            </span>
            <span className="wl-badge">available in: {a.flavor}</span>
          </>
        }
      />
      {(bases.length > 0 || n?.lead) && (
        <div className="api-lead body-l">
          {bases.length > 0 && (
            <p>
              {w.widget ? (
                <>
                  <code className="wl-icode">CreateFrame(&quot;{w.widget}&quot;, …)</code> makes one. It has
                </>
              ) : (
                <>It has</>
              )}{" "}
              every method of {and(bases.map((b) => <Link key={b} href={widgetHref(b)}>{b}</Link>))}, plus {w.methods.length ? `${w.methods.length} of its own` : "none of its own"}.
            </p>
          )}
          {n?.lead && <div className="md api-note" dangerouslySetInnerHTML={{ __html: n.lead }} />}
        </div>
      )}
      <ApiMobileToc toc={toc} path={path} />

      {levels.length > 1 && (
        <ApiSection id="inherits" title="Inherits from">
          <ol className="api-chain" aria-label="Inheritance">
            {levels.map((level, li) =>
              level.map((x, k) => (
                <Fragment key={x.name}>
                  {(li > 0 || k > 0) && <li aria-hidden="true">{k > 0 ? "+" : "→"}</li>}
                  <li>
                    {x === w ? (
                      <span className="wl-badge wl-badge--done">
                        {x.name} · {x.methods.length}
                      </span>
                    ) : (
                      <Link className="wl-badge" href={widgetHref(x.name)}>
                        {x.name} · {x.methods.length}
                      </Link>
                    )}
                  </li>
                </Fragment>
              )),
            )}
          </ol>
          <p className="caption api-muted">
            The number is each type&apos;s own documented methods. A {w.name} has all of them.
          </p>
        </ApiSection>
      )}

      {example && <NoteSection id="create" section={example} />}

      {w.methods.length > 0 && (
        <ApiSection id="methods" title="Methods">
          <p className="body-s api-muted">
            In the emulator: <b style={{ color: "var(--ink)" }}>{fmt(c.implemented)} implemented</b>
            {STATUSES.slice(1)
              .filter((s) => c[s])
              .map((s) => `, ${fmt(c[s])} ${s}`)
              .join("")}
            .
          </p>
          {emulator && <div className="md api-note" dangerouslySetInnerHTML={{ __html: bodyOf(emulator) }} />}
          <div className="wl-table" role="region" aria-label={`${w.name} methods`} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">method</th>
                  <th scope="col">what it does</th>
                  <th scope="col">status</th>
                </tr>
              </thead>
              <tbody
                dangerouslySetInnerHTML={{
                  __html: callableRows(
                    w.methods.map((m) => ({ name: m.name, id: m.name, entry: m, wikiLink: true, href: methodNotes.some((x) => x.m === m) ? `#note-${m.name}` : undefined })),
                  ),
                }}
              />
            </table>
          </div>
        </ApiSection>
      )}

      {methodNotes.length > 0 && (
        <ApiSection id="notes" title="Notes on its methods">
          {methodNotes.map(({ m, note: mn }) => (
            <div key={m.name} className="api-system" id={`note-${m.name}`}>
              <h3 className="heading-3">
                <code>
                  {w.name}:{m.name}
                </code>
              </h3>
              <div className="md api-note" dangerouslySetInnerHTML={{ __html: nested(mn!.lead + mn!.sections.map((s) => s.html).join("")) }} />
            </div>
          ))}
        </ApiSection>
      )}

      {testing && <NoteSection id="test" title="Testing it" section={testing} />}
      {otherSections(n).map((s) => (
        <NoteSection key={s.id} id={s.id} section={s} />
      ))}

      <Sources
        api={a}
        parts={[
          { label: "Methods and inheritance", sources: ["blizzard"], context: `${a.flavor} ${clientVersion(a)}` },
          { label: "Descriptions", sources: descSources },
        ]}
      />

      <PageNav prev={nav(a.widgets[i - 1])} next={nav(a.widgets[i + 1])} />
    </ApiLayout>
  );
}
