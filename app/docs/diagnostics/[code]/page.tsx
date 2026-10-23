import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { Breadcrumb } from "@/components/docs/parts";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";
import { githubUrl } from "@/lib/content";
import { diagnostics, findDiagnostic, mentions } from "@/lib/diagnostics";
import { inlineMd } from "@/lib/inline";
import { ogMetadata } from "@/lib/og";

// Codes added to wowlua after the build render on first visit.
export const dynamicParams = true;

const APPENDIX = "spec/appendix/diagnostics.md";

export function generateStaticParams() {
  return diagnostics("main").map((d) => ({ code: d.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const d = findDiagnostic("main", code);
  if (!d) return {};
  const title = `${d.code}: ${d.summary.replace(/`/g, "")}`;
  const description = `wowlua ${d.kind} ${d.code}: ${d.summary.replace(/`/g, "")}`;
  return { title, description, ...ogMetadata(`/docs/diagnostics/${d.code}`, title, description) };
}

export default async function DiagnosticPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const d = findDiagnostic("main", code);
  if (!d) notFound();
  const all = diagnostics("main");
  // The warning form of an error (E2001 → W2001) and the other way round.
  const twin = all.find((x) => x.code !== d.code && x.code.slice(1) === d.code.slice(1));
  const i = all.findIndex((x) => x.code === d.code);
  const near = all.slice(Math.max(0, i - 3), i + 4).filter((x) => x.code !== d.code);
  const refs = mentions("main", d.code);
  const badgeOf = (kind: string) => (kind === "error" ? "wl-badge--error" : kind === "warning" ? "wl-badge--warning" : "wl-badge--note");
  const badge = badgeOf(d.kind);
  const area = d.area?.replace(/\s*\(.*\)$/, "").toLowerCase();
  const following = all[i + 1];

  return (
    <div className="docs docs--entry">
      <JsonLd
        data={breadcrumbs([
          { name: "docs", path: "/docs" },
          { name: "diagnostics", path: "/docs/spec/appendix/diagnostics" },
          { name: d.code, path: `/docs/diagnostics/${d.code}` },
        ])}
      />
      <aside className="docs__side">
        <DocsSidebar version="main" current={APPENDIX} />
      </aside>
      <main className="docs__main" id="main">
        {/* Phones: a back link in place of the contents bar and breadcrumb. */}
        <Link className="docs-back label" href="/docs/spec/appendix/diagnostics">
          <span aria-hidden="true">←</span>diagnostics{area ? ` / ${area}` : ""}
        </Link>
        <Breadcrumb
          items={[
            { label: "docs", href: "/docs" },
            { label: "diagnostics", href: "/docs/spec/appendix/diagnostics" },
            { label: d.code },
          ]}
        />
        <header className="docs__head">
          <div className="wl-badge-row">
            <span className={`wl-badge ${badge}`}>{d.kind}</span>
            {d.area && <span className="wl-badge">{d.area.replace(/\s*\(.*\)$/, "").toLowerCase()}</span>}
          </div>
          <h1 className="heading-1">
            {d.code}
            <span className={`wl-badge ${badge} docs-entry__kind`}>{d.kind}</span>
          </h1>
          <p className="body-l docs__lead" dangerouslySetInnerHTML={{ __html: inlineMd(d.summary) }} />
          <div className="docs__meta caption">
            <span>{d.section.toLowerCase()}</span>
            <a href={githubUrl("main", APPENDIX)}>source on GitHub ↗</a>
          </div>
          {/* Phones: the facts the badges and the first paragraph give on wider screens. */}
          <dl className="docs-entry__facts">
            {area && (
              <div>
                <dt className="caption">area</dt>
                <dd className="body-s">{area}</dd>
              </div>
            )}
            <div>
              <dt className="caption">fails the build</dt>
              <dd className="body-s">{d.kind === "error" ? "yes" : d.kind === "warning" ? "with --deny-warnings" : "no"}</dd>
            </div>
            {twin ? (
              <div>
                <dt className="caption">{twin.kind === "warning" ? "in plain Lua" : "in wowlua files"}</dt>
                <dd>
                  <Link className={`wl-badge ${badgeOf(twin.kind)}`} href={`/docs/diagnostics/${twin.code}`}>
                    {twin.code}
                  </Link>
                </dd>
              </div>
            ) : (
              // Appendix B.2: name and type errors in pure Lua files are reported as the warning with the same number.
              /^E[12]\d{3}$/.test(d.code) && (
                <div>
                  <dt className="caption">in plain Lua</dt>
                  <dd>
                    <span className="wl-badge wl-badge--warning">W{d.code.slice(1)}</span>
                  </dd>
                </div>
              )
            )}
          </dl>
        </header>

        <div className="md">
          {d.kind === "warning" && (
            <p>
              Warnings fail a build only with <code className="wl-icode">--deny-warnings</code>. Change this one&apos;s level in <code className="wl-icode">wowlua.json</code>:{" "}
              <code className="wl-icode">{`"check": { "lints": { "${d.code}": "allow" } }`}</code> (or <code className="wl-icode">&quot;deny&quot;</code>).
            </p>
          )}
          {d.kind === "error" && <p>Errors fail the build. Run <code className="wl-icode">wowlua explain {d.code}</code> for this summary in the terminal.</p>}
          {d.kind === "hint" && <p>Performance hints are found at run time by the dev window. They never affect a build.</p>}
          {twin && (
            <p>
              Related: <Link href={`/docs/diagnostics/${twin.code}`}>{twin.code}</Link>, the {twin.kind} form: <span dangerouslySetInnerHTML={{ __html: inlineMd(twin.summary) }} />
            </p>
          )}

          {refs.length > 0 && (
            <>
              <h2 className="heading-2">Where the specification covers it</h2>
              <ul>
                {refs.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href}>{r.title}</Link>
                    {r.heading && <span style={{ color: "var(--ink-muted)" }}> · {r.heading}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="heading-2">Nearby codes</h2>
          <div className="wl-table docs-codes" role="region" aria-label="Nearby codes" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">code</th>
                  <th scope="col">summary</th>
                </tr>
              </thead>
              <tbody>
                {near.map((x) => (
                  <tr key={x.code} data-kind={x.kind}>
                    <td>
                      <Link href={`/docs/diagnostics/${x.code}`}>{x.code}</Link>
                    </td>
                    <td dangerouslySetInnerHTML={{ __html: inlineMd(x.summary) }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="docs-entry__all">
            <Link href="/docs/spec/appendix/diagnostics">All diagnostics →</Link>
          </p>
        </div>
        {/* Phones: back to the list, or on to the next code. */}
        <nav className="wl-page-nav docs-entry__nav" aria-label="All diagnostics and the next code">
          <Link className="wl-page-nav__link wl-page-nav__link--prev" href="/docs/spec/appendix/diagnostics">
            <span className="wl-page-nav__dir">← all diagnostics</span>
            <span className="wl-page-nav__title">{area ?? "appendix B"}</span>
          </Link>
          {following && (
            <Link className="wl-page-nav__link wl-page-nav__link--next" href={`/docs/diagnostics/${following.code}`}>
              <span className="wl-page-nav__dir">next →</span>
              <span className="wl-page-nav__title">{following.code}</span>
            </Link>
          )}
        </nav>
      </main>
      <aside className="docs__toc" />
    </div>
  );
}
