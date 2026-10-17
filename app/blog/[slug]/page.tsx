import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, Toc } from "@/components/docs/parts";
import { blogPosts, findPost } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = findPost((await params).slug);
  return p ? { title: p.title, description: p.summary } : {};
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();
  // Links in posts are site paths (/docs/…) or full URLs.
  const r = await renderMarkdown(post.body, { version: "main", repoPath: "blog/post.md" });
  const all = blogPosts();
  const i = all.findIndex((p) => p.slug === slug);
  const newer = all[i - 1];
  const older = all[i + 1];

  return (
    <div className="docs">
      <main className="docs__main" id="main" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Breadcrumb items={[{ label: "blog", href: "/blog" }, { label: post.title.toLowerCase() }]} />
        <header className="docs__head">
          <h1 className="display-l" style={{ margin: 0 }}>
            {post.title}
          </h1>
          <div className="docs__meta caption">
            <time dateTime={post.date}>{post.date}</time>
            {post.author && <span>{post.author}</span>}
            {post.version && <span>wowlua {post.version}</span>}
          </div>
          <div className="wl-badge-row">
            {post.tags.map((t) => (
              <span key={t} className="wl-badge">
                {t}
              </span>
            ))}
          </div>
        </header>
        <article className="md" dangerouslySetInnerHTML={{ __html: r.html }} />
        {(newer || older) && (
          <nav className="wl-page-nav" aria-label="Older and newer posts" style={{ marginTop: 32, maxWidth: "var(--size-prose)" }}>
            {older && (
              <Link className="wl-page-nav__link wl-page-nav__link--prev" href={`/blog/${older.slug}`}>
                <span className="wl-page-nav__dir">← older</span>
                <span className="wl-page-nav__title">{older.title}</span>
              </Link>
            )}
            {newer && (
              <Link className="wl-page-nav__link wl-page-nav__link--next" href={`/blog/${newer.slug}`}>
                <span className="wl-page-nav__dir">newer →</span>
                <span className="wl-page-nav__title">{newer.title}</span>
              </Link>
            )}
          </nav>
        )}
      </main>
      <aside className="docs__toc">
        <Toc entries={r.toc} />
      </aside>
    </div>
  );
}
