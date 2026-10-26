// Diagnostic codes from spec/appendix/diagnostics.md, the file wowlua's own
// code table is generated from, and their explanations from
// docs/reference/diagnostics.json. Each code gets a page on main.
import { cache } from "react";
import { readRepoFile } from "./content";

export type Diagnostic = {
  code: string;
  kind: "error" | "warning" | "hint";
  summary: string;
  section: string;
  area: string | null;
};

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
  return findDiagnostic(version, code) ? `/docs/reference/diagnostics/${code}` : null;
}

export type ExampleFile = { path: string; lang: string; text: string };
export type Explanation = {
  area: string;
  text: string;
  /** `output`: what `wowlua check` prints for a failing example. */
  examples: { compiles: boolean; files: ExampleFile[]; output?: string | null }[];
  related: string[];
};
type Explanations = { areas: { range: string; short: string }[]; codes: Record<string, Explanation> };

/** The codes' explanations and the areas' short names (docs/reference/diagnostics.json, from `cargo xtask diagnostics`). */
export const explanations = cache((version: string): Explanations => {
  const json = readRepoFile(version, "docs/reference/diagnostics.json");
  return json ? (JSON.parse(json) as Explanations) : { areas: [], codes: {} };
});

export const explanationOf = (version: string, code: string): Explanation | undefined => explanations(version).codes[code.toUpperCase()];
