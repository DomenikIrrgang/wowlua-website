import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiLayout, ApiMobileToc, tocOf } from "@/components/api/ApiLayout";
import { ApiSection, EntryHead, NoteSection, Related, Sources, StatusBadge } from "@/components/api/parts";
import { ValuesTable } from "@/components/api/ValuesTable";
import { eventHref, functionHref, namespaceHref, wowType } from "@/components/api/shared";
import { PageNav } from "@/components/docs/parts";
import {
  type Api,
  type Fn,
  api,
  bodyOf,
  clientVersion,
  credits,
  declaration,
  findFunction,
  note,
  noteSection,
  otherSections,
  relatedToFunction,
  restrictions,
  shortName,
  statusMeaning,
  structureOf,
} from "@/lib/api";
import { inlineMd } from "@/lib/inline";
import { ogMetadata } from "@/lib/og";

// 7,000 functions: each renders on its first visit, then follows content changes like every page.
export const dynamicParams = true;

type Params = { namespace: string; fn: string };

export function generateStaticParams(): Params[] {
  return [];
}

function load({ namespace, fn }: Params) {
  const a = api();
  const f = a && findFunction(a, namespace, fn);
  if (!a || !f) notFound();
  return { a, f };
}

const plain = (s: string) => s.replace(/`/g, "");

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { f } = load(await params);
  const description = f.doc?.summary ? plain(f.doc.summary) : `${f.name}, a function of the WoW API: its parameters, results and status in wowlua's emulator.`;
  return { title: `${f.name} · WoW API`, description, ...ogMetadata(functionHref(f.name), `${f.name} · WoW API`, description) };
}

/** The structure a result's type names, as a table of its fields. */
function StructureTable({ api: a, type }: { api: Api; type: string }) {
  const s = structureOf(a, type);
  if (!s) return null;
  return <ValuesTable caption={s.name} first="field" values={s.table.fields ?? []} label={`${s.name} fields`} />;
}

function Returns({ api: a, f }: { api: Api; f: Fn }) {
  const maybeNothing = f.flags.mayReturnNothing === true;
  if (!f.returns.length && !maybeNothing) return null;
  const one = f.returns.length === 1 ? f.returns[0] : null;
  return (
    <ApiSection id="returns" title="Returns">
      {one ? (
        <p className="body">
          <code className="wl-icode">{one.name}</code> · <span className="tok-t">{wowType(one.type)}</span>
          {one.doc && (
            <>
              {" "}
              · <span dangerouslySetInnerHTML={{ __html: inlineMd(one.doc) }} />
            </>
          )}
        </p>
      ) : (
        f.returns.length > 1 && <ValuesTable values={f.returns} label="Returns" numbered />
      )}
      {f.returns.map((r) => (
        <StructureTable key={r.name} api={a} type={r.type} />
      ))}
      {maybeNothing && <p className="caption api-muted">Blizzard&apos;s documentation says it may return nothing.</p>}
    </ApiSection>
  );
}

export default async function FunctionPage({ params }: { params: Promise<Params> }) {
  const { a, f } = load(await params);
  const path = functionHref(f.name);
  const n = await note(f.name);
  const emulator = noteSection(n, "in the emulator");
  const example = noteSection(n, "example");
  const testing = noteSection(n, "testing");
  const { secrets, other } = restrictions(f.flags, "function");
  const related = relatedToFunction(a, f);
  const siblings = a.functionsOf.get(f.namespace) ?? [];
  const i = siblings.indexOf(f);
  const nav = (x: Fn | undefined) => x && { label: shortName(x), href: functionHref(x.name), repoPath: "" };
  const meaning = statusMeaning(f.status);
  const who = credits(f.doc);
  const wiki = f.doc?.sources.includes("wiki") ? f.doc.wiki : null;

  const toc = tocOf(
    [
      f.args.length ? ["params", "Parameters"] : null,
      f.returns.length || f.flags.mayReturnNothing ? ["returns", "Returns"] : null,
      ["status", "In the emulator"],
      secrets.length || other.length ? ["restrictions", "Restrictions"] : null,
      example ? ["examples", "Example"] : null,
      testing ? ["test", "Testing"] : null,
      ...otherSections(n).map((s) => [s.id, s.title]),
      related.functions.length || related.events.length ? ["related", "Related"] : null,
      ["sources", "Sources"],
    ].filter(Boolean) as [string, string][],
  );

  return (
    <ApiLayout
      api={a}
      current={f.namespace ? `ns:${f.namespace}` : f.system ? `global:${f.system}` : "global"}
      crumbs={[{ label: f.namespace || "global functions", href: namespaceHref(f.namespace) }, { label: shortName(f) }]}
      path={path}
      toc={toc}
    >
      <EntryHead
        title={f.name}
        badges={
          <>
            <span className="wl-badge">function</span>
            <StatusBadge status={f.status} />
            <span className="wl-badge">available in: {a.flavor}</span>
          </>
        }
      />
      {(f.doc?.summary || n?.lead) && (
        <div className="api-lead body-l">
          {f.doc?.summary && (
            <p>
              <span dangerouslySetInnerHTML={{ __html: inlineMd(f.doc.summary) }} />
              {f.doc.summarySource === "wowlua" && <span className="caption"> · description by wowlua</span>}
            </p>
          )}
          {n?.lead && <div className="md api-note" dangerouslySetInnerHTML={{ __html: n.lead }} />}
        </div>
      )}
      {f.documented ? (
        <figure className="wl-code" style={{ margin: 0 }}>
          <div className="wl-code__bar">
            <span className="wl-code__file">signature</span>
            <span className="wl-code__lang">wowlua</span>
            <button className="wl-textbtn" type="button" data-copy>
              copy
            </button>
          </div>
          <pre className="wl-code__pre">
            <code dangerouslySetInnerHTML={{ __html: declaration(f.namespace, ".", shortName(f), f) }} />
          </pre>
        </figure>
      ) : (
        <p className="body-s api-muted">
          The client has this function, but Blizzard&apos;s documentation leaves it out, so its parameters and results aren&apos;t known.
        </p>
      )}
      <ApiMobileToc toc={toc} path={path} />

      {f.args.length > 0 && (
        <ApiSection id="params" title="Parameters">
          <ValuesTable values={f.args} label="Parameters" />
        </ApiSection>
      )}

      <Returns api={a} f={f} />

      <ApiSection id="status" title="In wowlua's emulated client">
        <div className="api-state">
          <StatusBadge status={f.status} />
          {meaning && (
            <span className="body-s">
              <span dangerouslySetInnerHTML={{ __html: inlineMd(meaning) }} /> <Link href="/api#status">what the statuses mean</Link>
            </span>
          )}
        </div>
        {emulator && <div className="md api-note" dangerouslySetInnerHTML={{ __html: bodyOf(emulator) }} />}
      </ApiSection>

      {(secrets.length > 0 || other.length > 0) && (
        <ApiSection id="restrictions" title="Restrictions">
          {secrets.length > 0 && (
            <aside className="wl-callout wl-callout--note api-callout" aria-label="secret values">
              <div className="wl-callout__head">
                <span className="wl-callout__glyph" aria-hidden="true">
                  =
                </span>
                secret values:
              </div>
              <div className="wl-callout__body">
                <p>{secrets.join(" ")}</p>
              </div>
            </aside>
          )}
          {other.length > 0 && (
            <ul className="body api-list">
              {other.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </ApiSection>
      )}

      {example && <NoteSection id="examples" section={example} />}
      {testing && <NoteSection id="test" title="Testing code that uses it" section={testing} />}
      {otherSections(n).map((s) => (
        <NoteSection key={s.id} id={s.id} section={s} />
      ))}

      <Related
        lists={[
          { label: "Related functions", items: related.functions.map((x) => ({ name: x.name, href: functionHref(x.name) })) },
          { label: "Related events", items: related.events.map((e) => ({ name: e.name, href: eventHref(e.name) })) },
        ]}
      />

      <Sources
        api={a}
        parts={[
          { label: "Signature and flags", sources: f.documented ? ["blizzard"] : [], context: `${f.system ? `${f.system} system, ` : ""}${a.flavor} ${clientVersion(a)}` },
          { label: "Description", sources: who.summary ? [who.summary] : [], page: wiki },
          { label: "Parameter and result notes", sources: who.notes, page: wiki },
        ]}
      />

      <PageNav prev={nav(siblings[i - 1])} next={nav(siblings[i + 1])} />
    </ApiLayout>
  );
}
