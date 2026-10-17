import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { Breadcrumb } from "@/components/docs/parts";
import { githubUrl } from "@/lib/content";
import { diagnostics, findDiagnostic, mentions } from "@/lib/diagnostics";
import { inlineMd } from "@/lib/inline";

export const dynamicParams = false;

const APPENDIX = "spec/appendix/diagnostics.md";

export function generateStaticParams() {
  return diagnostics("main").map((d) => ({ code: d.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const d = findDiagnostic("main", code);
  return d ? { title: `${d.code}: ${d.summary.replace(/`/g, "")}`, description: `wowlua ${d.kind} ${d.code}: ${d.summary.replace(/`/g, "")}` } : {};
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
  const badge = d.kind === "error" ? "wl-badge--error" : d.kind === "warning" ? "wl-badge--warning" : "wl-badge--note";

  return (
    <div className="docs">
      <aside className="docs__side">
        <DocsSidebar version="main" current={APPENDIX} />
      </aside>
      <main className="docs__main" id="main">
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
          <h1 className="heading-1">{d.code}</h1>
          <p className="body-l docs__lead" dangerouslySetInnerHTML={{ __html: inlineMd(d.summary) }} />
          <div className="docs__meta caption">
            <span>{d.section.toLowerCase()}</span>
            <a href={githubUrl("main", APPENDIX)}>source on GitHub ↗</a>
          </div>
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
          <div className="wl-table" role="region" aria-label="Nearby codes" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">code</th>
                  <th scope="col">summary</th>
                </tr>
              </thead>
              <tbody>
                {near.map((x) => (
                  <tr key={x.code}>
                    <td>
                      <Link href={`/docs/diagnostics/${x.code}`}>{x.code}</Link>
                    </td>
                    <td dangerouslySetInnerHTML={{ __html: inlineMd(x.summary) }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <Link href="/docs/spec/appendix/diagnostics">All diagnostics →</Link>
          </p>
        </div>
      </main>
      <aside className="docs__toc" />
    </div>
  );
}
