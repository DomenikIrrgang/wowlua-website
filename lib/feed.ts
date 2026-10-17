import { blogPosts } from "./blog";
import { changelog } from "./changelog";

export type FeedItem = { title: string; href: string; date: string; summary: string; tags: string[]; author: string };

const firstSentence = (md: string) =>
  md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*]/g, "")
    .split(/\n\s*\n/)[0]
    .replace(/\s*\n\s*/g, " ")
    .trim();

/** Blog posts plus one entry per release (linking to its changelog entry), newest first. */
export function feedItems(): FeedItem[] {
  const posts: FeedItem[] = blogPosts().map((p) => ({
    title: p.title,
    href: `/blog/${p.slug}`,
    date: p.date,
    summary: p.summary,
    tags: p.tags,
    author: p.author,
  }));
  const releases: FeedItem[] = changelog()
    .entries.filter((e) => e.version && e.date)
    .map((e) => ({
      title: `wowlua ${e.version}`,
      href: `/changelog#v${e.version!.replace(/\./g, "-")}`,
      date: e.date!,
      summary: firstSentence(e.intro) || "Release notes on the changelog.",
      tags: ["release"],
      author: "",
    }));
  return [...posts, ...releases].sort((a, b) => b.date.localeCompare(a.date) || (a.tags.includes("release") ? 1 : -1));
}
