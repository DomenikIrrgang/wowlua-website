// The diagnostics appendix grouped by area, for the errors and warnings page (DiagnosticsIndex, and
// DiagnosticsBrowser on phones).
import { readRepoFile } from "@/lib/content";
import { diagnosticHref, diagnostics, explanations } from "@/lib/diagnostics";
import { inlineMd } from "@/lib/inline";
import type { BrowserArea } from "./DiagnosticsBrowser";

export const APPENDIX = "spec/appendix/diagnostics.md";
/** The docs page the codes are listed on. */
export const CODES_PAGE = "docs/reference/diagnostics.md";

/** One group per row of the appendix's range table ("`x2xxx` | Types"), in its order; empty ones are dropped. */
export function diagnosticAreas(version: string): BrowserArea[] {
  const md = readRepoFile(version, APPENDIX) ?? "";
  const short = new Map(explanations(version).areas.map((a) => [a.range, a.short]));
  const groups = new Map<string, BrowserArea>();
  for (const line of md.split("\n")) {
    const m = /^\|\s*`(x[\dx]+)`\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (m && !groups.has(m[2])) groups.set(m[2], { range: m[1], title: m[2].replace(/\s*\(.*\)$/, ""), short: short.get(m[1]), codes: [] });
  }
  const other: BrowserArea = { range: "other", title: "Other codes", codes: [] };
  // Performance hints come from the dev window in game, not the compiler (appendix B.3).
  const hints: BrowserArea = { range: "P7xxx", title: "Performance hints", short: "hints", codes: [] };
  for (const d of diagnostics(version)) {
    const g = d.kind === "hint" ? hints : (d.area && groups.get(d.area)) || other;
    g.codes.push({ code: d.code, kind: d.kind, text: d.summary.replace(/`/g, ""), html: inlineMd(d.summary), href: diagnosticHref(version, d.code) });
  }
  // Errors before warnings before hints, then by number, as the appendix lists them.
  const order = { error: 0, warning: 1, hint: 2 };
  return [...groups.values(), hints, other]
    .filter((g) => g.codes.length)
    .map((g) => ({ ...g, codes: g.codes.sort((a, b) => order[a.kind] - order[b.kind] || a.code.slice(1).localeCompare(b.code.slice(1))) }));
}
