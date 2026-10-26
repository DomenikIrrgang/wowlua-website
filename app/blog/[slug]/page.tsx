import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/docs/parts";
import { JsonLd, SITE } from "@/components/JsonLd";
import { PostToc } from "@/components/news/PostToc";
import { blogPosts, findPost } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { ogMetadata } from "@/lib/og";

export const dynamicParams = false;

const SITE_REPO = "https://github.com/DomenikIrrgang/wowlua-website";

export function generateStaticParams() {
  return blogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = findPost((await params).slug);
  return p ? { title: p.title, description: p.summary, ...ogMetadata(`/blog/${p.slug}`, p.title, p.summary) } : {};
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

  const sections = r.toc.filter((e) => e.depth === 2);
  const byline = [post.author, post.version && `wowlua ${post.version}`].filter(Boolean).map((s) => ` · ${s}`).join("");

  return (
    <main className="page blog-post" id="main">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          url: `${SITE}/blog/${post.slug}`,
          image: `${SITE}/og/blog/${post.slug}/image.png`,
          ...(post.author ? { author: { "@type": "Person", name: post.author, url: `https://github.com/${post.author}` } } : {}),
          publisher: { "@type": "Organization", name: "wowlua", url: SITE },
        }}
      />
      <article className="blog-post__article">
        {/* "wowlua 0.10: a debugger, …" is "wowlua 0.10" in the breadcrumb. */}
        <Breadcrumb items={[{ label: "blog", href: "/blog" }, { label: post.title.split(": ")[0] }]} />
        <Link href="/blog" className="label blog-post__back">
          <span aria-hidden="true">←</span>blog
        </Link>
        <header className="blog-post__head">
          <h1 className="heading-1 blog-post__title">{post.title}</h1>
          <p className="caption" style={{ margin: 0, color: "var(--ink-muted)" }}>
            <time dateTime={post.date}>{post.date}</time>
            {byline}
          </p>
          {post.tags.length > 0 && (
            <div className="wl-badge-row">
              {post.tags.map((t) => (
                <span key={t} className="wl-badge">
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>
        <PostToc entries={r.toc} />
        <div className="md blog-post__body" dangerouslySetInnerHTML={{ __html: r.html }} />
        <nav className="wl-page-nav" aria-label="Previous and next post">
          {older ? (
            <Link className="wl-page-nav__link wl-page-nav__link--prev" href={`/blog/${older.slug}`}>
              <span className="wl-page-nav__dir">← older</span>
              <span className="wl-page-nav__title">{older.title}</span>
            </Link>
          ) : (
            <span className="wl-page-nav__link wl-page-nav__link--prev blog-post__none">
              <span className="wl-page-nav__dir">← older</span>
              <span className="wl-page-nav__title">no older posts</span>
            </span>
          )}
          {newer ? (
            <Link className="wl-page-nav__link wl-page-nav__link--next" href={`/blog/${newer.slug}`}>
              <span className="wl-page-nav__dir">newer →</span>
              <span className="wl-page-nav__title">{newer.title}</span>
            </Link>
          ) : (
            <span className="wl-page-nav__link wl-page-nav__link--next blog-post__none">
              <span className="wl-page-nav__dir">newer →</span>
              <span className="wl-page-nav__title">no newer posts</span>
            </span>
          )}
        </nav>
      </article>
      <aside className="blog-post__side">
        <nav className="wl-toc" aria-label="On this page">
          {sections.length > 1 && (
            <>
              <h2 className="wl-toc__title">on this page</h2>
              <ol>
                {sections.map((e) => (
                  <li key={e.id}>
                    <a href={`#${e.id}`}>{e.text}</a>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="wl-toc__foot">
            <a href={`${SITE_REPO}/edit/main/content/blog/${post.slug}.md`}>edit this post ↗</a>
            <a href="#main">back to top ↑</a>
          </div>
        </nav>
      </aside>
    </main>
  );
}
