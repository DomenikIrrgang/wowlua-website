import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiSearch, type Described } from "@/components/api/ApiSearch";
import { ApiSidebar } from "@/components/api/ApiSidebar";
import { NamespaceGrid, type NamespaceCard } from "@/components/api/NamespaceGrid";
import { StatusMeter } from "@/components/api/parts";
import { BADGE, KINDS, type NameEntry, STATUSES, type Status, fmt, namespaceHref, pct } from "@/components/api/shared";
import { Breadcrumb } from "@/components/docs/parts";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";
import { PROSE, api, namespaceTitle, namespacesBySize, splitSections } from "@/lib/api";
import { renderRepoFile } from "@/lib/markdown";
import { ogMetadata } from "@/lib/og";

/** Results the page renders before the search loads its index. */
const FIRST = 15;

async function load() {
  const a = api();
  const prose = await renderRepoFile("main", PROSE);
  if (!a || !prose) notFound();
  return { a, prose };
}

export async function generateMetadata(): Promise<Metadata> {
  const { prose } = await load();
  const description = prose.description || undefined;
  return { title: "WoW API", description, ...ogMetadata("/api", "WoW API", description) };
}

/** The statuses in the prose's table as the design's badges. */
const badges = (html: string) =>
  html.replace(/<td([^>]*)>(implemented|recorded|guessed|not implemented)<\/td>/g, (_, attrs: string, s: Status) =>
    `<td${attrs}><span class="wl-badge ${BADGE[s]}"><span class="wl-badge__dot" aria-hidden="true"></span>${s}</span></td>`,
  );

/** A prose section's heading at the index's larger size, and its body. */
const split = (html: string) => {
  const m = /^(<h2[^>]*>[\s\S]*?<\/h2>)([\s\S]*)$/.exec(html);
  return m ? { h2: m[1].replace('class="heading-2"', 'class="heading-1"'), body: m[2] } : { h2: "", body: html };
};

export default async function ApiIndex() {
  const { a, prose } = await load();
  const { lead, sections } = splitSections(prose);
  const s = a.summary;
  const fn = s.functions;

  const initial: { entry: NameEntry; d: Described }[] = a.functions.slice(0, FIRST).map((f) => ({
    entry: [f.name, KINDS.indexOf("function"), STATUSES.indexOf(f.status)],
    d: f.doc?.summary ? [f.doc.summary, f.doc.summarySource === "wowlua"] : null,
  }));
  const methods = a.widgets.reduce((n, w) => n + w.methods.length, 0);
  const counts = { function: a.functions.length, event: a.events.length, method: methods, namespace: a.namespaces.length };
  const global = a.namespace.get("");
  const cards: NamespaceCard[] = [...(global ? [global] : []), ...namespacesBySize(a)].map((n) => [
    namespaceTitle(n.name),
    namespaceHref(n.name),
    STATUSES.map((st) => n.counts[st]),
  ]);

  const statusBar = (
    <div className="api-total">
      <StatusMeter
        counts={fn}
        height={14}
        label={`${fmt(fn.total)} functions: ${STATUSES.map((st) => `${fmt(fn[st])} ${st}`).join(", ")}`}
      />
      <span className="caption">
        {fmt(fn.total)} documented functions: {STATUSES.map((st) => `${fmt(fn[st])} ${st}${fn[st] && st !== "not implemented" ? ` (${pct(fn[st], fn.total)})` : ""}`).join(" · ")}
      </span>
    </div>
  );

  return (
    <div className="docs api">
      <JsonLd data={breadcrumbs([{ name: "WoW API", path: "/api" }])} />
      <aside className="docs__side">
        <ApiSidebar api={a} current="overview" title="search the API" />
      </aside>
      <main className="docs__main api-main api-main--wide" id="main">
        <Breadcrumb items={[{ label: "api", href: "/api" }, { label: "search" }]} />
        <header className="api-intro">
          <h1 className="display-l">{prose.title ?? "WoW API"}</h1>
          <div className="api-intro__lead body-l" dangerouslySetInnerHTML={{ __html: lead }} />
        </header>

        <ApiSearch initial={initial} counts={{ all: counts.function + counts.event + counts.method + counts.namespace, ...counts }} />
        <p className="caption api-search__scope">
          The search covers all {fmt(counts.function)} functions, {fmt(counts.event)} events, {fmt(counts.method)} widget methods and {fmt(s.namespaces)} namespaces.
        </p>

        {sections.map((sec, i) => {
          const { h2, body } = split(sec.html);
          if (sec.id.startsWith("how-much")) {
            // The bar follows the section's first paragraph, the table gets the statuses' badges.
            const cut = body.indexOf("</p>") + 4;
            return (
              <section key={sec.id} id="status" className="api-prose">
                <div className="md" dangerouslySetInnerHTML={{ __html: h2 + (cut > 3 ? body.slice(0, cut) : "") }} />
                {statusBar}
                <div className="md" dangerouslySetInnerHTML={{ __html: badges(cut > 3 ? body.slice(cut) : body) }} />
                <p className="body-s api-muted">
                  The emulator gives {pct(s.probes.exact, s.probes.total)} of the client&apos;s {fmt(s.probes.total)} probed answers exactly as the client gave them.
                  {s.methods["not implemented"] === 0 ? ` All ${fmt(s.methods.total)} widget methods have behaviour.` : ""}
                </p>
              </section>
            );
          }
          if (sec.id === "namespaces") {
            return (
              <section key={sec.id} id="namespaces" className="api-prose api-prose--wide">
                <div className="api-prose__head">
                  <div dangerouslySetInnerHTML={{ __html: h2 }} />
                  <span className="caption">{fmt(s.namespaces)} in {a.flavor} · counts include the functions the client has that Blizzard&apos;s documentation leaves out</span>
                </div>
                <div className="md" dangerouslySetInnerHTML={{ __html: body }} />
                <NamespaceGrid cards={cards} />
              </section>
            );
          }
          // What follows the namespaces (where the descriptions come from) is set apart, as the design does.
          const after = sections.findIndex((x) => x.id === "namespaces");
          return (
            <section key={sec.id || i} id={sec.id || undefined} className={`api-prose${after >= 0 && i > after ? " api-prose--foot" : ""}`}>
              <div className="md" dangerouslySetInnerHTML={{ __html: after >= 0 && i > after ? sec.html : h2 + body }} />
            </section>
          );
        })}
      </main>
    </div>
  );
}
