import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CODES_PAGE } from "@/components/docs/diagnosticAreas";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { Breadcrumb, Toc } from "@/components/docs/parts";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";
import { githubUrl } from "@/lib/content";
import { type Diagnostic, diagnosticHref, diagnostics, explanationOf, explanations, findDiagnostic } from "@/lib/diagnostics";
import { escapeHtml, highlight } from "@/lib/highlight";
import { inlineMd } from "@/lib/inline";
import { diagHtml, renderMarkdown } from "@/lib/markdown";
import { ogMetadata } from "@/lib/og";

// Codes added to wowlua after the build render on first visit.
export const dynamicParams = true;

const APPENDIX = "spec/appendix/diagnostics.md";
const INDEX = "/docs/reference/diagnostics";

export function generateStaticParams() {
  return diagnostics("main").map((d) => ({ code: d.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const d = findDiagnostic("main", code);
  if (!d) return {};
  const title = `${d.code}: ${d.summary.replace(/`/g, "")}`;
  const description = `wowlua ${d.kind} ${d.code}: ${d.summary.replace(/`/g, "")}`;
  return { title, description, ...ogMetadata(diagnosticHref("main", d.code)!, title, description) };
}

const badgeOf = (kind: string) => (kind === "error" ? "wl-badge--error" : kind === "warning" ? "wl-badge--warning" : "wl-badge--note");
const kindOf = (code: string) => (code[0] === "E" ? "error" : code[0] === "W" ? "warning" : "hint");

/** Name and type errors in a plain Lua file are reported as the warning with the same number (appendix B.2). */
const plainLuaTwin = (code: string) => (/^E[12]\d{3}$/.test(code) ? `W${code.slice(1)}` : null);

export default async function DiagnosticPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const d = findDiagnostic("main", code);
  if (!d) notFound();
  const all = diagnostics("main");
  const e = explanationOf("main", d.code);
  const i = all.findIndex((x) => x.code === d.code);
  const following = all[i + 1];
  const range = d.area ? explanations("main").areas.find((a) => e?.area === a.short)?.range : undefined;
  const areaTitle = d.area?.replace(/\s*\(.*\)$/, "");
  const area = e?.area ?? areaTitle?.toLowerCase();
  const twin = plainLuaTwin(d.code);
  const body = e ? await renderMarkdown(e.text, { version: "main", repoPath: "crates/wowlua-diagnostics/explanations/README.md" }) : null;
  // A related code is listed in the appendix, or is the plain-Lua warning form of one.
  const related = (e?.related ?? []).map((c): Pick<Diagnostic, "code" | "kind" | "summary"> & { href: string | null } => {
    const found = findDiagnostic("main", c);
    if (found) return { code: found.code, kind: found.kind, summary: found.summary, href: diagnosticHref("main", found.code) };
    const error = findDiagnostic("main", `E${c.slice(1)}`);
    return { code: c, kind: kindOf(c), summary: error ? `${error.summary} (in a plain Lua file)` : "", href: null };
  });
  const output = e?.examples.find((x) => !x.compiles && x.output)?.output;
  const toc = [
    { id: "explanation", text: "explanation", depth: 2 as const },
    ...(e?.examples.length ? [{ id: "example", text: "example", depth: 2 as const }] : []),
    ...(related.length ? [{ id: "related", text: "related codes", depth: 2 as const }] : []),
    { id: "offline", text: "offline", depth: 2 as const },
  ];

  return (
    <div className="docs docs--entry">
      <JsonLd
        data={breadcrumbs([
          { name: "docs", path: "/docs" },
          { name: "errors and warnings", path: INDEX },
          { name: d.code, path: diagnosticHref("main", d.code)! },
        ])}
      />
      <aside className="docs__side">
        <DocsSidebar version="main" current={CODES_PAGE} />
      </aside>
      <main className="docs__main" id="main">
        {/* Phones: a back link in place of the contents bar and breadcrumb. */}
        <Link className="docs-back label" href={INDEX}>
          <span aria-hidden="true">←</span>errors and warnings{area ? ` / ${area}` : ""}
        </Link>
        <Breadcrumb items={[{ label: "reference", href: INDEX }, { label: "errors and warnings", href: INDEX }, { label: d.code }]} />

        <article className="wl-dentry" aria-labelledby="code">
          <p className="wl-dentry__crumb">
            errors and warnings{area ? ` / ${area}` : ""} / {d.code}
          </p>
          <header className="wl-dentry__head">
            <h1 className="wl-dentry__code" id="code">
              {d.code} <span className={`wl-badge ${badgeOf(d.kind)}`}>{d.kind}</span>
            </h1>
            <p className="wl-dentry__title" dangerouslySetInnerHTML={{ __html: inlineMd(d.summary) }} />
          </header>
          <dl className="wl-dentry__facts">
            {area && (
              <div>
                <dt>area</dt>
                <dd>{range ? `${area} (${range})` : area}</dd>
              </div>
            )}
            <div>
              <dt>fails the build</dt>
              <dd>{d.kind === "error" ? "yes" : d.kind === "warning" ? "with --deny-warnings" : "no"}</dd>
            </div>
            {twin && (
              <div>
                <dt>in plain Lua files</dt>
                <dd>
                  reported as <span className="wl-badge wl-badge--warning">{twin}</span>
                </dd>
              </div>
            )}
          </dl>

          <div id="explanation" className="md wl-dentry__body">
            {body ? (
              <div dangerouslySetInnerHTML={{ __html: body.html }} />
            ) : (
              <p>
                {d.kind === "warning"
                  ? "Warnings fail a build only with --deny-warnings; check.lints in wowlua.json sets this one's level."
                  : d.kind === "error"
                    ? "Errors fail the build."
                    : "Performance hints are found at run time by the dev window. They never affect a build."}
              </p>
            )}
          </div>

          {e && e.examples.length > 0 && (
            <>
              <h2 id="example" className="heading-2" style={{ margin: 0 }}>
                Example
              </h2>
              <div className="wl-dentry__examples">
                {e.examples.map((x, n) => (
                  <div key={n} style={{ display: "grid", gap: 8, minWidth: 0, alignContent: "start" }}>
                    {x.files.map((f, k) => (
                      <figure key={f.path} className="wl-code" style={{ margin: 0, minWidth: 0 }}>
                        <div className="wl-code__bar">
                          {k === 0 && (
                            <span className={`wl-dentry__verdict wl-dentry__verdict--${x.compiles ? "ok" : "fails"}`}>{x.compiles ? "✓ compiles" : "× fails"}</span>
                          )}
                          {(x.files.length > 1 || f.path !== "src/main.wowlua") && <span className="wl-code__file">{f.path}</span>}
                          <span className="wl-code__lang">{f.lang}</span>
                        </div>
                        <pre className="wl-code__pre">
                          <code dangerouslySetInnerHTML={{ __html: highlight(f.text.replace(/\n$/, ""), f.lang) }} />
                        </pre>
                      </figure>
                    ))}
                  </div>
                ))}
              </div>
              {output && (
                <>
                  <p className="body" style={{ margin: 0 }}>
                    The compiler reports it like this:
                  </p>
                  <pre className="wl-diag" style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: diagHtml(output) }} />
                </>
              )}
            </>
          )}

          {related.length > 0 && (
            <>
              <h2 id="related" className="heading-2" style={{ margin: 0 }}>
                Related codes
              </h2>
              <div className="wl-table" role="region" aria-label="Related codes" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">code</th>
                      <th scope="col">message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {related.map((r) => (
                      <tr key={r.code}>
                        <td>
                          {r.href ? (
                            <Link href={r.href} className={`wl-badge ${badgeOf(r.kind)}`}>
                              {r.code}
                            </Link>
                          ) : (
                            <span className={`wl-badge ${badgeOf(r.kind)}`}>{r.code}</span>
                          )}
                        </td>
                        <td dangerouslySetInnerHTML={{ __html: inlineMd(r.summary) }} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2 id="offline" className="heading-2" style={{ margin: 0 }}>
            Offline
          </h2>
          <figure className="wl-term" style={{ margin: 0 }}>
            <div className="wl-term__bar">
              <span>terminal</span>
              <button className="wl-textbtn" type="button" data-copy={`wowlua explain ${d.code}`}>
                copy
              </button>
            </div>
            <pre
              className="wl-term__body"
              dangerouslySetInnerHTML={{
                __html:
                  `<span class="wl-term__prompt">$</span> <span class="wl-term__cmd">wowlua explain ${d.code}</span>\n` +
                  `<span class="wl-term__out">${escapeHtml(`${d.code} (${d.kind}): ${d.summary.replace(/`/g, "")}`)}</span>`,
              }}
            />
          </figure>
          <p className="caption" style={{ margin: 0, color: "var(--ink-muted)" }}>
            <a href={githubUrl("main", APPENDIX)}>source on GitHub ↗</a>
          </p>
        </article>

        <nav className="wl-page-nav" aria-label="All errors and warnings, and the next code">
          <Link className="wl-page-nav__link wl-page-nav__link--prev" href={INDEX}>
            <span className="wl-page-nav__dir">← all errors and warnings</span>
            <span className="wl-page-nav__title">{range && areaTitle ? `${range} · ${areaTitle}` : (areaTitle ?? "every code")}</span>
          </Link>
          {following && diagnosticHref("main", following.code) && (
            <Link className="wl-page-nav__link wl-page-nav__link--next" href={diagnosticHref("main", following.code)!}>
              <span className="wl-page-nav__dir">next →</span>
              <span className="wl-page-nav__title">
                {following.code} · {following.summary.replace(/`/g, "")}
              </span>
            </Link>
          )}
        </nav>
      </main>
      <aside className="docs__toc">
        <Toc entries={toc} />
      </aside>
    </div>
  );
}
