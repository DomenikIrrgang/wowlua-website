// Reads the wowlua content fetched by scripts/fetch-content.mjs. Everything the
// docs show comes from the wowlua repository: the sidebar is built from
// docs/README.md and spec/README.md, the pages are its Markdown files.
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

/** Docs versions: "main" first, then one per minor line, newest first. */
export const versions = (): Ref[] => meta().refs;
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

function listMarkdown(version: string, dir: string): string[] {
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
// docs/README.md            → /docs                  (versions: /docs/0.8)
// docs/install.md           → /docs/install
// spec/README.md            → /docs/spec
// spec/language/03-classes.md → /docs/spec/language/classes
// spec/roadmap.md           → /roadmap on main

const stripNumber = (s: string) => s.replace(/^\d+-/, "");

export function slugForRepoPath(repoPath: string): string[] | null {
  const parts = repoPath.replace(/\.md$/, "").split("/");
  const top = parts[0];
  if (top !== "docs" && top !== "spec") return null;
  const rest = parts.slice(1).map(stripNumber);
  if (rest[rest.length - 1] === "README") rest.pop();
  return top === "docs" ? rest : ["spec", ...rest];
}

export function docsHref(version: string, slug: string[]): string {
  const base = version === "main" ? "/docs" : `/docs/${version}`;
  return slug.length ? `${base}/${slug.join("/")}` : base;
}

/** Site URL for a file of the wowlua repo, or null when it has no page. */
export function hrefForRepoPath(version: string, repoPath: string): string | null {
  if (version === "main" && repoPath === "spec/roadmap.md") return "/roadmap";
  const slug = slugForRepoPath(repoPath);
  if (!slug) return null;
  if (!pagesByKey(version).has(slug.join("/"))) return null;
  return docsHref(version, slug);
}

export const githubUrl = (version: string, repoPath: string, dir = false) =>
  `${REPO_URL()}/${dir ? "tree" : "blob"}/${gitRef(version)}/${repoPath}`;

// ── Pages and sidebar ───────────────────────────────────────────────────────

export type Page = { version: string; repoPath: string; slug: string[] };

export const pages = cache((version: string): Page[] => {
  const files = [...listMarkdown(version, "docs"), ...listMarkdown(version, "spec")];
  const out: Page[] = [];
  for (const repoPath of files) {
    const slug = slugForRepoPath(repoPath);
    if (slug) out.push({ version, repoPath, slug });
  }
  return out;
});

const pagesByKey = cache((version: string) => new Map(pages(version).map((p) => [p.slug.join("/"), p])));

export const findPage = (version: string, slug: string[]) =>
  pagesByKey(version).get(slug.join("/")) ??
  // Versions from before docs/ existed open on the specification.
  (slug.length === 0 ? pagesByKey(version).get("spec") : undefined);

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

/** Sidebar for a docs version, read from the repo's own indexes. */
export const sidebar = cache((version: string): NavSection[] => {
  const sections: NavSection[] = [];

  // docs/README.md: one list of links in reading order.
  const docsIndex = readRepoFile(version, "docs/README.md");
  if (docsIndex) {
    const items: NavItem[] = [{ label: "overview", href: docsHref(version, []), repoPath: "docs/README.md" }];
    for (const line of docsIndex.split("\n")) {
      const m = /^\s*[-*]\s+/.test(line) && LINK.exec(line);
      if (m) {
        const it = item(version, "docs/README.md", m[1], m[2]);
        if (it && !items.some((x) => x.href === it.href)) items.push(it);
      }
    }
    sections.push({ title: "guide", items });
  }

  // spec/README.md: a table of documents, grouped by bold rows.
  const specIndex = readRepoFile(version, "spec/README.md");
  if (specIndex) {
    let current: NavSection = { title: "specification", items: [] };
    if (hrefForRepoPath(version, "spec/README.md")) {
      current.items.push({ label: "contents", href: docsHref(version, ["spec"]), repoPath: "spec/README.md" });
    }
    sections.push(current);
    for (const line of specIndex.split("\n")) {
      if (!line.startsWith("|")) continue;
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      const group = cells.map((c) => /^\*\*(.+)\*\*$/.exec(c)?.[1]).find(Boolean);
      if (group && !LINK.test(line)) {
        current = { title: plain(group).toLowerCase(), items: [] };
        sections.push(current);
        continue;
      }
      const m = LINK.exec(line);
      if (!m) continue;
      const it = item(version, "spec/README.md", m[1], m[2]);
      if (!it) continue;
      if (it.repoPath === "spec/roadmap.md") continue; // linked from the header instead
      if (it.repoPath === "spec/stdlib/README.md") it.label = "overview";
      current.items.push(it);
      // The standard library's chapters follow its overview.
      if (it.repoPath === "spec/stdlib/README.md") {
        for (const p of pages(version)) {
          if (p.repoPath.startsWith("spec/stdlib/") && p.repoPath !== "spec/stdlib/README.md") {
            const title = titleOf(readRepoFile(version, p.repoPath) ?? "") ?? p.slug.at(-1)!;
            const label = plain(title).replace(/^[\d.]+\s*/, "").replace(/^standard library:\s*/i, "").toLowerCase();
            current.items.push({ label, href: docsHref(version, p.slug), repoPath: p.repoPath });
          }
        }
      }
    }
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
