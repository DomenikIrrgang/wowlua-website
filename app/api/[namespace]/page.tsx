import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiLayout, ApiMobileToc, tocOf } from "@/components/api/ApiLayout";
import { ApiSection, NoteSection, callableRows, eventRows, Sources, StatusMeter } from "@/components/api/parts";
import { GLOBAL, STATUSES, fmt, functionHref, namespaceHref } from "@/components/api/shared";
import { PageNav } from "@/components/docs/parts";
import { type Fn, type Source, api, bodyOf, clientVersion, namespaceOf, namespaceTitle, namespaces, note, noteSection, otherSections, shortName, structuresOf } from "@/lib/api";
import { ogMetadata } from "@/lib/og";

// Namespaces added to wowlua's data after the build render on first visit.
export const dynamicParams = true;

type Params = { namespace: string };

export function generateStaticParams(): Params[] {
  const a = api();
  return a ? namespaces(a).map((n) => ({ namespace: n.name || GLOBAL })) : [];
}

function load(segment: string) {
  const a = api();
  const ns = a?.namespace.get(namespaceOf(segment));
  // C_Container's page is /api/C_Container; "" is only reachable as /api/global.
  if (!a || !ns || (ns.name === "" && segment !== GLOBAL)) notFound();
  return { a, ns, functions: a.functionsOf.get(ns.name) ?? [], events: ns.name ? (a.eventsOfNamespace.get(ns.name) ?? []) : [] };
}

const describe = (title: string, total: number) => `${title} in the WoW API: ${fmt(total)} functions, what each does and how far wowlua's emulator implements it.`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { ns } = load((await params).namespace);
  const title = namespaceTitle(ns.name);
  const t = ns.name ? `${ns.name} · WoW API` : "Global functions · WoW API";
  return { title: t, description: describe(title, ns.counts.total), ...ogMetadata(namespaceHref(ns.name), t, describe(title, ns.counts.total)) };
}

/** The global functions by Blizzard's system, the ones its documentation leaves out last. */
function bySystem(functions: Fn[]) {
  const groups = new Map<string, Fn[]>();
  for (const f of functions) groups.set(f.system ?? "", [...(groups.get(f.system ?? "") ?? []), f]);
  return [...groups.entries()].sort(([x], [y]) => (x === "" ? 1 : y === "" ? -1 : x.localeCompare(y)));
}

/** The sources of the functions' descriptions, for the page's "sources" line. */
const summarySources = (functions: Fn[]) => [...new Set(functions.map((f) => f.doc?.summarySource).filter(Boolean) as Source[])].sort();

function FunctionTable({ title, functions }: { title: string; functions: Fn[] }) {
  return (
    <div className="wl-table" role="region" aria-label={`${title} functions`} tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">function</th>
            <th scope="col">what it does</th>
            <th scope="col">status</th>
          </tr>
        </thead>
        <tbody dangerouslySetInnerHTML={{ __html: callableRows(functions.map((f) => ({ name: shortName(f), href: functionHref(f.name), entry: f }))) }} />
      </table>
    </div>
  );
}

export default async function NamespacePage({ params }: { params: Promise<Params> }) {
  const { a, ns, functions, events } = load((await params).namespace);
  const title = namespaceTitle(ns.name);
  const path = namespaceHref(ns.name);
  const n = ns.name ? await note(ns.name) : null;
  const emulator = noteSection(n, "in the emulator");
  const example = noteSection(n, "example");
  const testing = noteSection(n, "testing");
  const structures = structuresOf(a, ns);
  const c = ns.counts;
  const all = namespaces(a);
  const i = all.findIndex((x) => x.name === ns.name);
  const nav = (x: (typeof all)[number] | undefined) => x && { label: namespaceTitle(x.name), href: namespaceHref(x.name), repoPath: "" };
  const firstSilent = events.find((e) => e.status === "not implemented");
  const byWowlua = functions.some((f) => f.doc?.summarySource === "wowlua");
  const groups = ns.name ? null : bySystem(functions);

  const toc = tocOf([
    ["status", "Status in wowlua"],
    ...(example ? ([["use", "Using it"]] as [string, string][]) : []),
    ...(functions.length ? ([["functions", `Functions · ${fmt(functions.length)}`]] as [string, string][]) : []),
    ...(events.length ? ([["events", `Events · ${fmt(events.length)}`]] as [string, string][]) : []),
    ...(structures.length ? ([["structures", `Structures · ${structures.length}`]] as [string, string][]) : []),
    ...(testing ? ([["test", "Testing"]] as [string, string][]) : []),
    ...otherSections(n).map((s) => [s.id, s.title] as [string, string]),
  ]);

  return (
    <ApiLayout
      api={a}
      current={ns.name ? `ns:${ns.name}` : "global"}
      crumbs={[{ label: "namespaces", href: "/api#namespaces" }, { label: title }]}
      path={path}
      toc={toc}
    >
      <div className="api-titlerow">
        <h1 className="heading-1">{ns.name ? ns.name : "Global functions"}</h1>
        <span className="wl-badge">{ns.name ? "namespace" : "global"}</span>
        <span className="caption">available in: {a.flavor}</span>
      </div>
      {(ns.doc || n?.lead) && (
        <div className="api-lead body-l">
          {ns.doc && <p>{ns.doc}</p>}
          {n?.lead && <div className="md api-note" dangerouslySetInnerHTML={{ __html: n.lead }} />}
        </div>
      )}
      <ApiMobileToc toc={toc} path={path} />

      <ApiSection id="status" title="Status in wowlua">
        <StatusMeter counts={c} label={`${fmt(c.total)} functions: ${STATUSES.filter((s) => c[s]).map((s) => `${fmt(c[s])} ${s}`).join(", ")}`} />
        <p className="body-s api-muted">
          {fmt(c.total)} {c.total === 1 ? "function" : "functions"}
          {c.total > 0 && (
            <>
              : <b style={{ color: "var(--ink)" }}>{fmt(c.implemented)} implemented</b>
              {STATUSES.slice(1)
                .filter((s) => c[s] || s !== "not implemented")
                .map((s) => `, ${fmt(c[s])} ${s}`)
                .join("")}
            </>
          )}
          .{events.length > 0 && ` ${fmt(events.length)} events, ${fmt(events.filter((e) => e.status === "implemented").length)} of them fired by the emulator on its own.`}
        </p>
        {emulator && <div className="md api-note" dangerouslySetInnerHTML={{ __html: bodyOf(emulator) }} />}
      </ApiSection>

      {example && <NoteSection id="use" title="Using it" section={example} />}

      {functions.length > 0 && (
        <ApiSection id="functions" title="Functions">
          {groups ? (
            groups.map(([system, fns]) => (
              <div className="api-system" key={system} id={`system-${system || "undocumented"}`}>
                <h3 className="heading-3">
                  {system ? `${system} system` : "Not in Blizzard's documentation"} <span className="caption">· {fmt(fns.length)}</span>
                </h3>
                <FunctionTable title={system || "Undocumented"} functions={fns} />
              </div>
            ))
          ) : (
            <FunctionTable title={ns.name} functions={functions} />
          )}
          {byWowlua && (
            <p className="caption api-muted">&quot;by wowlua&quot;: no one documents this function, so wowlua wrote the description from its name, signature and behaviour.</p>
          )}
        </ApiSection>
      )}

      {events.length > 0 && (
        <ApiSection id="events" title="Events">
          <div className="wl-table" role="region" aria-label={`${ns.name} events`} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">event</th>
                  <th scope="col">payload</th>
                  <th scope="col">fired by the emulator</th>
                </tr>
              </thead>
              <tbody dangerouslySetInnerHTML={{ __html: eventRows(events) }} />
            </table>
          </div>
          {firstSilent && (
            <p className="caption api-muted">
              An event the emulator doesn&apos;t fire on its own can still be fired from a test: <code className="wl-icode">mock.fireEvent(&quot;{firstSilent.name}&quot;)</code>.
            </p>
          )}
        </ApiSection>
      )}

      {structures.length > 0 && (
        <ApiSection id="structures" title="Structures">
          <ul className="body-s api-list">
            {structures.map(({ name, table }) => (
              <li key={name} id={`struct-${name}`}>
                <code>{name}</code> <span className="wl-muted">· {(table.fields ?? []).map((f) => `${f.name}${f.nilable ? "?" : ""}`).join(", ")}</span>
              </li>
            ))}
          </ul>
        </ApiSection>
      )}

      {testing && <NoteSection id="test" title="Testing" section={testing} />}
      {otherSections(n).map((s) => (
        <NoteSection key={s.id} id={s.id} section={s} />
      ))}

      <Sources
        api={a}
        parts={[
          { label: "Signatures, events and structures", sources: ns.systems.length ? ["blizzard"] : [], context: `${ns.systems.length === 1 ? `${ns.systems[0]} system` : `${ns.systems.length} systems`}, ${a.flavor} ${clientVersion(a)}` },
          { label: "Descriptions", sources: summarySources(functions) },
        ]}
      />

      <PageNav prev={nav(all[i - 1])} next={nav(all[i + 1])} />
    </ApiLayout>
  );
}
