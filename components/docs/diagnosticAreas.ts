// The diagnostics appendix grouped by area, for the phone's code browser (components/docs/DiagnosticsBrowser.tsx).
import { readRepoFile } from "@/lib/content";
import { diagnosticHref, diagnostics } from "@/lib/diagnostics";
import { inlineMd } from "@/lib/inline";
import type { BrowserArea } from "./DiagnosticsBrowser";

export const APPENDIX = "spec/appendix/diagnostics.md";

/** One group per row of the appendix's range table ("`x2xxx` | Types"), in its order; empty ones are dropped. */
export function diagnosticAreas(version: string): BrowserArea[] {
  const md = readRepoFile(version, APPENDIX) ?? "";
  const groups = new Map<string, BrowserArea>();
  for (const line of md.split("\n")) {
    const m = /^\|\s*`(x[\dx]+)`\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (m && !groups.has(m[2])) groups.set(m[2], { range: m[1], title: m[2].replace(/\s*\(.*\)$/, ""), codes: [] });
  }
  const other: BrowserArea = { range: "other", title: "Other codes", codes: [] };
  for (const d of diagnostics(version)) {
    const g = (d.area && groups.get(d.area)) || other;
    g.codes.push({ code: d.code, kind: d.kind, text: d.summary.replace(/`/g, ""), html: inlineMd(d.summary), href: diagnosticHref(version, d.code) });
  }
  // Errors before warnings before hints, then by number, as the appendix lists them.
  const order = { error: 0, warning: 1, hint: 2 };
  return [...groups.values(), other]
    .filter((g) => g.codes.length)
    .map((g) => ({ ...g, codes: g.codes.sort((a, b) => order[a.kind] - order[b.kind] || a.code.slice(1).localeCompare(b.code.slice(1))) }));
}
