// Blog posts live in this repository (content/blog/*.md), unlike the docs.
// Each file starts with a small front matter block:
//
//   ---
//   title: Matching the BigWigs packager on 36 addons
//   date: 2026-10-12
//   author: DomenikIrrgang
//   tags: migration, testing
//   version: 0.7
//   summary: One paragraph for the post list.
//   ---
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

const DIR = path.join(process.cwd(), "content", "blog");

export type Post = {
  slug: string;
  title: string;
  date: string;
  author: string;
  tags: string[];
  version?: string;
  summary: string;
  body: string;
};

function parse(slug: string, raw: string): Post {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`content/blog/${slug}.md: missing front matter`);
  const fields: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  for (const key of ["title", "date", "summary"]) {
    if (!fields[key]) throw new Error(`content/blog/${slug}.md: front matter needs "${key}"`);
  }
  return {
    slug,
    title: fields.title,
    date: fields.date,
    author: fields.author ?? "",
    tags: (fields.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    version: fields.version,
    summary: fields.summary,
    body: m[2],
  };
}

export const blogPosts = cache((): Post[] => {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    // A Windows checkout (core.autocrlf) has CRLF line ends; the front matter parser expects LF.
    .map((f) => parse(f.replace(/\.md$/, ""), readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n")))
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
});

export const findPost = (slug: string) => blogPosts().find((p) => p.slug === slug);
