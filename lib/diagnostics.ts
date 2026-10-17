// Diagnostic codes from spec/appendix/diagnostics.md, the file wowlua's own
// code table is generated from. Each code gets a page on main, with the spec
// sections that mention it.
import GithubSlugger from "github-slugger";
import { cache } from "react";
import { docsHref, pages, readRepoFile, slugForRepoPath } from "./content";

export type Diagnostic = {
  code: string;
  kind: "error" | "warning" | "hint";
  summary: string;
  section: string;
  area: string | null;
};

export type Mention = { title: string; href: string; heading: string };

const APPENDIX = "spec/appendix/diagnostics.md";

export const diagnostics = cache((version: string): Diagnostic[] => {
  const md = readRepoFile(version, APPENDIX);
  if (!md) return [];
  const areas: { pattern: string; area: string }[] = [];
  const out: Diagnostic[] = [];
  let section = "";
  for (const line of md.split("\n")) {
    const h = /^##\s+(?:B\.\d+\s+)?(.+)$/.exec(line);
    if (h) section = h[1].trim();
    const cells = line.startsWith("|") ? line.split("|").slice(1, -1).map((c) => c.trim()) : [];
    if (cells.length < 2) continue;
    const range = /^`([xEWP][\dx]+)`$/.exec(cells[0]);
    if (range) {
      areas.push({ pattern: range[1], area: cells[1] });
      continue;
    }
    if (!/^[EWP]\d{4}$/.test(cells[0])) continue;
    const code = cells[0];
    out.push({
      code,
      kind: code[0] === "E" ? "error" : code[0] === "W" ? "warning" : "hint",
      summary: cells[1],
      section,
      area: areaOf(code, areas),
    });
  }
  return out;
});

function areaOf(code: string, areas: { pattern: string; area: string }[]): string | null {
  // The most specific range wins: `x01xx` before `x0xxx`.
  let best: { area: string; score: number } | null = null;
  for (const { pattern, area } of areas) {
    if (pattern.length !== code.length) continue;
    let ok = true;
    let score = 0;
    for (let i = 0; i < pattern.length; i++) {
      const c = pattern[i];
      if (c === "x") continue;
      if (c !== code[i]) ok = false;
      else score++;
    }
    if (ok && (!best || score > best.score)) best = { area, score };
  }
  return best?.area ?? null;
}

export const findDiagnostic = (version: string, code: string) =>
  diagnostics(version).find((d) => d.code === code.toUpperCase());

/** Code pages exist for main; other versions have only the appendix. */
export function diagnosticHref(version: string, code: string): string | null {
  if (version !== "main") return null;
  return findDiagnostic(version, code) ? `/docs/diagnostics/${code}` : null;
}

/** Spec sections (outside the appendix) that mention a code. */
export const mentions = cache((version: string, code: string): Mention[] => {
  const out: Mention[] = [];
  for (const p of pages(version)) {
    if (p.repoPath === APPENDIX || !p.repoPath.startsWith("spec/")) continue;
    const md = readRepoFile(version, p.repoPath);
    if (!md || !md.includes(code)) continue;
    const slugger = new GithubSlugger();
    let title = p.repoPath;
    let heading = { text: "", id: "" };
    let inFence = false;
    for (const line of md.split("\n")) {
      if (line.startsWith("```")) inFence = !inFence;
      const h = !inFence && /^(#{1,6})\s+(.+)$/.exec(line);
      if (h) {
        const text = h[2].replace(/`/g, "").trim();
        const id = slugger.slug(h[2].trim().replace(/`/g, ""));
        if (h[1].length === 1) title = text;
        heading = { text, id: h[1].length === 1 ? "" : id };
        continue;
      }
      if (new RegExp(`\\b${code}\\b`).test(line)) {
        const slug = slugForRepoPath(p.repoPath)!;
        const href = docsHref(version, slug) + (heading.id ? `#${heading.id}` : "");
        if (!out.some((m) => m.href === href)) out.push({ title, href, heading: heading.text });
      }
    }
  }
  return out;
});
