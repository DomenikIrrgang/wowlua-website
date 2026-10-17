import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { Banner, Breadcrumb, PageNav, Toc } from "@/components/docs/parts";
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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { version, page, rendered } = await load(params);
  const title = rendered.title ?? "docs";
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

  return (
    <div className="docs">
      <aside className="docs__side">
        <DocsSidebar version={version} current={page.repoPath} />
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
        <article className="md" dangerouslySetInnerHTML={{ __html: rendered.html }} />
        <PageNav prev={prev} next={next} />
      </main>
      <aside className="docs__toc">
        <Toc entries={rendered.toc} />
      </aside>
    </div>
  );
}
