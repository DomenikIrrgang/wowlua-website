import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiagnosticsBrowser } from "@/components/docs/DiagnosticsBrowser";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { MobileToc } from "@/components/docs/MobileToc";
import { Banner, Breadcrumb, PageNav, Toc } from "@/components/docs/parts";
import { SectionFold } from "@/components/docs/SectionFold";
import { APPENDIX, diagnosticAreas } from "@/components/docs/diagnosticAreas";
import { JsonLd, SITE, breadcrumbs } from "@/components/JsonLd";
import {
  docsHref,
  findPage,
  githubUrl,
  isVersion,
  latestRelease,
  neighbours,
  pages,
  refOf,
  sidebar,
  versions,
} from "@/lib/content";
import { shortVersion } from "@/lib/format";
import { renderRepoFile } from "@/lib/markdown";
import { ogMetadata } from "@/lib/og";

export const dynamicParams = false;

type Params = { slug?: string[] };

function parse(slug: string[] = []) {
  return isVersion(slug[0] ?? "") ? { version: slug[0], rest: slug.slice(1) } : { version: "main", rest: slug };
}

export function generateStaticParams(): Params[] {
  const out: Params[] = [];
  for (const v of versions()) {
    const prefix = v.id === "main" ? [] : [v.id];
    const slugs = new Set(pages(v.id).map((p) => p.slug.join("/")));
    slugs.add(""); // every version has a start page
    for (const s of slugs) out.push({ slug: [...prefix, ...(s ? s.split("/") : [])] });
  }
  return out;
}

async function load(params: Promise<Params>) {
  const { slug } = await params;
  const { version, rest } = parse(slug);
  const page = findPage(version, rest);
  if (!page) notFound();
  const rendered = (await renderRepoFile(version, page.repoPath))!;
  return { version, page, rendered };
}

/** Long reference pages whose sections fold behind their headings on phones. */
const folds = (repoPath: string) => /^spec\/(toolchain|stdlib)\/(?!README\.md$)/.test(repoPath);

/** "12. CLI" → "CLI", "Appendix B. Diagnostics" → "Diagnostics" (the page's h1 keeps the number). */
const searchTitle = (title: string) => title.replace(/^(Appendix [A-Z]\.|[\d.]+)\s+/, "");

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { version, page, rendered } = await load(params);
  const title = searchTitle(rendered.title ?? "docs");
  const full = version === "main" ? title : `${title} (v${version})`;
  return {
    ...ogMetadata(docsHref(version, page.slug), full, rendered.description || undefined),
    title: full,
    description: rendered.description || undefined,
    // Older versions point search engines at main.
    robots: version === "main" ? undefined : { index: false, follow: true },
  };
}

export default async function DocsPage({ params }: { params: Promise<Params> }) {
  const { version, page, rendered } = await load(params);
  const section = sidebar(version).find((s) => s.items.some((i) => i.repoPath === page.repoPath));
  const { prev, next } = neighbours(version, page.repoPath);
  const latest = latestRelease();
  const latestId = latest ? shortVersion(latest.tag) : null;
  const ref = refOf(version);
  const path = docsHref(version, page.slug);
  const crumbs = [
    { name: "docs", path: docsHref(version, []) },
    ...(section && section.items[0].href !== path ? [{ name: section.title, path: section.items[0].href }] : []),
    { name: searchTitle(rendered.title ?? "docs"), path },
  ];
  // On phones the diagnostics appendix is browsed by area instead of read as tables.
  const areas = page.repoPath === APPENDIX ? diagnosticAreas(version) : [];
  const fold = folds(page.repoPath);

  return (
    <div className={areas.length ? "docs docs--codes" : "docs"}>
      <JsonLd
        data={[
          breadcrumbs(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: searchTitle(rendered.title ?? "docs"),
            description: rendered.description || undefined,
            url: `${SITE}${path}`,
            dateModified: ref.date,
            inLanguage: "en",
            isPartOf: { "@type": "WebSite", name: "wowlua", url: SITE },
            about: { "@type": "SoftwareApplication", name: "wowlua" },
          },
        ]}
      />
      <aside className="docs__side">
        <DocsSidebar version={version} current={page.repoPath} title={searchTitle(rendered.title ?? "docs").toLowerCase()} />
      </aside>
      <main className="docs__main" id="main">
        {version !== "main" && (
          <Banner kind={version === latestId ? "note" : "warning"} label={version === latestId ? "latest release:" : "old version:"}>
            <span style={{ flex: "1 1 260px" }}>
              {version === latestId
                ? `You're reading the docs for v${version}, the latest release. The default docs follow main, which has unreleased changes.`
                : `You're reading the docs for v${version}.${latestId ? ` The latest release is v${latestId}.` : ""}`}
            </span>
            <Link href={docsHref("main", page.slug)} style={{ fontWeight: 600 }}>
              go to main →
            </Link>
          </Banner>
        )}
        <Breadcrumb
          items={[
            { label: "docs", href: docsHref(version, []) },
            ...(section ? [{ label: section.title, href: section.items[0].href }] : []),
            { label: (rendered.title ?? "").replace(/^(Appendix [A-Z]\.|[\d.]+)\s*/, "").toLowerCase() || "docs" },
          ]}
        />
        <header className="docs__head">
          <h1 className="heading-1">{rendered.title}</h1>
          <div className="docs__meta caption">
            <span>
              {version === "main" ? `main · ${ref.sha?.slice(0, 7) ?? ""}` : `v${version} · ${ref.ref}`}
              {version === "main" && latestId ? ` · latest release v${latestId}` : ""}
            </span>
            <a href={githubUrl(version, page.repoPath)}>source on GitHub ↗</a>
          </div>
        </header>
        {!areas.length && <MobileToc key={`toc:${path}`} entries={rendered.toc} />}
        <article className="md" data-fold={fold ? "" : undefined} dangerouslySetInnerHTML={{ __html: rendered.html }} />
        {fold && <SectionFold key={`fold:${path}`} />}
        {areas.length > 0 && <DiagnosticsBrowser areas={areas} />}
        <PageNav prev={prev} next={next} />
        <p className="docs__source caption">
          <span>{version === "main" ? `main · ${ref.sha?.slice(0, 7) ?? ""}` : `v${version} · ${ref.ref}`}</span>
          <a href={githubUrl(version, page.repoPath)}>source on GitHub ↗</a>
        </p>
      </main>
      <aside className="docs__toc">
        <Toc entries={rendered.toc} />
      </aside>
    </div>
  );
}
