// Reads the wowlua content fetched by scripts/fetch-content.mjs. Everything the
// docs show comes from the wowlua repository: the sidebar is built from
// docs/README.md, the pages are the Markdown files in docs/. The specification
// (spec/) is not a part of the site; links to it go to GitHub.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

export const CACHE = path.join(process.cwd(), "content", ".cache");

export type Ref = { id: string; ref: string; sha?: string; date: string };
export type Release = {
  tag: string;
  name: string;
  date: string;
  prerelease: boolean;
  url: string;
  notes: string;
};
export type Unreleased = {
  base: string | null;
  total?: number;
  commits: { sha: string; date: string; subject: string; url: string }[];
};

type Meta = { repo: string; generatedAt: string; local: boolean; refs: Ref[] };

const readJson = <T,>(file: string): T => JSON.parse(readFileSync(path.join(CACHE, file), "utf8"));

export const meta = cache((): Meta => readJson<Meta>("refs.json"));
export const releases = cache((): Release[] => readJson<Release[]>("releases.json"));
export const unreleased = cache((): Unreleased => readJson<Unreleased>("unreleased.json"));

export const REPO_URL = () => `https://github.com/${meta().repo}`;
/** The wowlua Discord server's permanent invite (made by github.com/DomenikIrrgang/wowlua-bot). */
export const DISCORD_URL = "https://discord.gg/Dn795czPYk";
/** The wowlua extension on the Visual Studio Marketplace. */
export const VSCODE_URL = "https://marketplace.visualstudio.com/items?itemName=wowlua.wowlua";

/** Docs versions: "main" first, then one per minor line, newest first. Releases from before
 *  docs/README.md had sections are left out: their docs are the specification. */
export const versions = cache((): Ref[] =>
  meta().refs.filter((r) => r.id === "main" || /^##\s/m.test(readRepoFile(r.id, "docs/README.md") ?? "")),
);
export const latestRelease = (): Release | undefined => releases().find((r) => !r.prerelease);
export const isVersion = (s: string) => versions().some((v) => v.id === s && v.id !== "main");
export const refOf = (version: string) => versions().find((v) => v.id === version)!;

/** The git ref to link to on GitHub for a docs version. */
export const gitRef = (version: string) => {
  const r = refOf(version);
  return r.id === "main" ? "main" : r.ref;
};

export function readRepoFile(version: string, repoPath: string): string | null {
  const file = path.join(CACHE, version, repoPath);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/** The Markdown files under a folder of the repo, as repo paths. */
export function listMarkdown(version: string, dir: string): string[] {
  const root = path.join(CACHE, version, dir);
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".md")) out.push(path.relative(path.join(CACHE, version), full).split(path.sep).join("/"));
    }
  };
  walk(root);
  return out;
}

// ── Routes ──────────────────────────────────────────────────────────────────
// docs/README.md             → /docs                (versions: /docs/0.13)
// docs/guide/install.md      → /docs/guide/install

const stripNumber = (s: string) => s.replace(/^\d+-/, "");

export function slugForRepoPath(repoPath: string): string[] | null {
  const parts = repoPath.replace(/\.md$/, "").split("/");
  if (parts[0] !== "docs") return null;
  const rest = parts.slice(1).map(stripNumber);
  if (rest[rest.length - 1] === "README") rest.pop();
  return rest;
}

export function docsHref(version: string, slug: string[]): string {
  const base = version === "main" ? "/docs" : `/docs/${version}`;
  return slug.length ? `${base}/${slug.join("/")}` : base;
}

/** Site URL for a file of the wowlua repo, or null when it has no page. */
export function hrefForRepoPath(version: string, repoPath: string): string | null {
  // The WoW API page's prose opens the reference at /api (next.config.ts redirects the docs address).
  if (version === "main" && repoPath === "docs/reference/api.md") return "/api";
  const slug = slugForRepoPath(repoPath);
  if (!slug) return null;
  if (!pagesByKey(version).has(slug.join("/"))) return null;
  return docsHref(version, slug);
}

/** A repository file's raw contents at a docs version (images in the docs). */
export function rawUrl(version: string, repoPath: string): string {
  return `https://raw.githubusercontent.com/${meta().repo}/${gitRef(version)}/${repoPath}`;
}

export const githubUrl = (version: string, repoPath: string, dir = false) =>
  `${REPO_URL()}/${dir ? "tree" : "blob"}/${gitRef(version)}/${repoPath}`;

// ── Pages and sidebar ───────────────────────────────────────────────────────

export type Page = { version: string; repoPath: string; slug: string[] };

export const pages = cache((version: string): Page[] => {
  // docs/reference/api/ holds the WoW API's data and notes, shown under /api, not as docs pages.
  const files = listMarkdown(version, "docs").filter((f) => !f.startsWith("docs/reference/api/"));
  const out: Page[] = [];
  for (const repoPath of files) {
    const slug = slugForRepoPath(repoPath);
    if (slug) out.push({ version, repoPath, slug });
  }
  return out;
});

const pagesByKey = cache((version: string) => new Map(pages(version).map((p) => [p.slug.join("/"), p])));

export const findPage = (version: string, slug: string[]) => pagesByKey(version).get(slug.join("/"));

export type NavItem = { label: string; href: string; repoPath: string };
export type NavSection = { title: string; items: NavItem[] };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;

function resolveRel(fromRepoPath: string, href: string): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRepoPath), href.split("#")[0]));
}

const plain = (s: string) => s.replace(/[`*_]/g, "").trim();

function item(version: string, from: string, label: string, href: string): NavItem | null {
  const repoPath = resolveRel(from, href);
  const url = hrefForRepoPath(version, repoPath);
  return url ? { label: plain(label).toLowerCase(), href: url, repoPath } : null;
}

/** Sidebar for a docs version: the `## ` sections of docs/README.md and their lists of links. */
export const sidebar = cache((version: string): NavSection[] => {
  const index = readRepoFile(version, "docs/README.md");
  if (!index) return [];
  // An index without sections (before the docs had them) is one guide.
  const sections: NavSection[] = /^##\s/m.test(index) ? [] : [{ title: "guide", items: [] }];
  for (const line of index.split("\n")) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      sections.push({ title: plain(heading[1]).toLowerCase(), items: [] });
      continue;
    }
    const m = /^\s*[-*]\s+/.test(line) && LINK.exec(line);
    const current = sections.at(-1);
    if (!m || !current) continue;
    const it = item(version, "docs/README.md", m[1], m[2]);
    if (it && !sections.some((s) => s.items.some((x) => x.href === it.href))) current.items.push(it);
  }
  return sections.filter((s) => s.items.length);
});

/** The first H1 of a Markdown document. */
export function titleOf(md: string): string | null {
  const m = /^#\s+(.+)$/m.exec(md);
  return m ? m[1].trim() : null;
}

/** Previous and next page in sidebar order. */
export function neighbours(version: string, repoPath: string) {
  const flat = sidebar(version).flatMap((s) => s.items);
  const i = flat.findIndex((x) => x.repoPath === repoPath);
  return { prev: i > 0 ? flat[i - 1] : undefined, next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : undefined };
}
