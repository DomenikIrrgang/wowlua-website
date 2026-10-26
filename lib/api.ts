// The WoW API reference under /api. Its data is wowlua's
// docs/reference/api/camelot.json.gz (`cargo xtask api-reference`): every
// function, widget method, event and table of the camelot client, what each
// does and where that text comes from, and how far wowlua's emulator answers
// it. Hand-written notes are docs/reference/api/notes/<Name>.md, the prose
// about the statuses is docs/reference/api.md.
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { type Status, GLOBAL, eventHref, functionHref, humanize, methodHref, namespaceHref, widgetHref, wowType } from "@/components/api/shared";
import { CACHE, readRepoFile } from "./content";
import { type Rendered, renderMarkdown } from "./markdown";

const DATA = "docs/reference/api/camelot.json.gz";
const NOTES = "docs/reference/api/notes";
export const PROSE = "docs/reference/api.md";

/** The flavors the reference will cover; only camelot's data exists so far. */
export const FLAVORS = [
  { id: "camelot", label: "camelot", ready: true },
  { id: "standard", label: "standard", ready: false },
  { id: "vanilla", label: "vanilla", ready: false },
];

export type Source = "blizzard" | "wiki" | "wowlua";

/** An argument, result, payload value or structure field. */
export type Value = { name: string; type: string; nilable: boolean; default?: unknown; doc?: string; flags?: Record<string, unknown> };

/** What an entry does, where the summary comes from, its wiki page, and every source its text comes from. */
export type Doc = { summary: string | null; summarySource: Source | null; wiki: string | null; sources: Source[] } | null;

type Callable = { args: Value[]; returns: Value[]; flags: Record<string, unknown>; doc: Doc; status: Status; module: string | null };
export type Fn = Callable & { name: string; namespace: string; system: string | null; documented: boolean };
export type Method = Callable & { name: string };
export type Event = {
  name: string;
  namespace: string | null;
  system: string | null;
  documented: boolean;
  payload: Value[];
  flags: Record<string, unknown>;
  doc: Doc;
  status: "implemented" | "not implemented";
  modules: string[];
};
export type Widget = { name: string; bases: string[]; widget: string | null; methods: Method[] };
export type Counts = { total: number } & Record<Status, number>;
export type Namespace = { name: string; systems: string[]; doc: string | null; counts: Counts };
export type Table = {
  kind: "Structure" | "Enumeration" | "Constants" | "CallbackType";
  system: string | null;
  fields?: Value[];
  values?: { name: string; value: unknown; type?: string }[];
  args?: Value[];
  doc?: string;
};

type Data = {
  flavor: string;
  client: string;
  sources: Record<Source, string>;
  summary: {
    functions: Counts;
    undocumented: Counts;
    methods: Counts;
    events: { total: number; implemented: number; "not implemented": number };
    namespaces: number;
    probes: { exact: number; total: number };
  };
  namespaces: Namespace[];
  functions: Fn[];
  events: Event[];
  widgets: Widget[];
  tables: Record<string, Table>;
};

export type Api = Data & {
  fn: Map<string, Fn>;
  event: Map<string, Event>;
  widget: Map<string, Widget>;
  namespace: Map<string, Namespace>;
  /** A namespace's functions, in the data's (alphabetical) order. */
  functionsOf: Map<string, Fn[]>;
  /** The events of each namespace and of each system. */
  eventsOfNamespace: Map<string, Event[]>;
  eventsOfSystem: Map<string, Event[]>;
  functionsOfSystem: Map<string, Fn[]>;
};

// The content is replaced while the server runs (instrumentation.ts), so the
// parsed data is kept per file: a new snapshot is read once, on first use.
let memo: { key: string; api: Api | null } | null = null;

/** The reference's data, or null before wowlua generated it. */
export function api(): Api | null {
  const file = path.join(CACHE, "main", DATA);
  if (!existsSync(file)) return null;
  const key = `${realpathSync(file)}:${statSync(file).mtimeMs}`;
  if (memo?.key === key) return memo.api;
  const data = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Data;
  memo = { key, api: index(data) };
  return memo.api;
}

function group<T>(items: T[], key: (t: T) => string | null | undefined): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (k === null || k === undefined) continue;
    const list = out.get(k);
    if (list) list.push(it);
    else out.set(k, [it]);
  }
  return out;
}

/** Results as wowlua declares them: a function that "may return nothing" has every result nilable (wowlua-types-gen). */
function nilableResults(c: Callable) {
  if (c.flags.mayReturnNothing !== true) return;
  c.returns = c.returns.map((r) => (r.type.endsWith("?") ? r : { ...r, type: `${r.type}?`, nilable: true }));
}

function index(data: Data): Api {
  data.functions.forEach(nilableResults);
  for (const w of data.widgets) w.methods.forEach(nilableResults);
  return {
    ...data,
    fn: new Map(data.functions.map((f) => [f.name, f])),
    event: new Map(data.events.map((e) => [e.name, e])),
    widget: new Map(data.widgets.map((w) => [w.name, w])),
    namespace: new Map(data.namespaces.map((n) => [n.name, n])),
    functionsOf: group(data.functions, (f) => f.namespace),
    eventsOfNamespace: group(data.events, (e) => e.namespace),
    eventsOfSystem: group(data.events, (e) => e.system),
    functionsOfSystem: group(data.functions, (f) => f.system),
  };
}

/** `WoW Forever 1.60.1 (70450)` → `WoW Forever 1.60.1`. */
export const clientName = (a: Api) => a.client.replace(/\s*\(\d+\)$/, "");
export const clientVersion = (a: Api) => clientName(a).replace(/^\D+/, "");

// ── Namespaces, functions, widgets ─────────────────────────────────────────

/** The namespaces the reference lists, the global functions first. */
export const namespaces = (a: Api) => [...a.namespaces].sort((x, y) => (x.name === "" ? -1 : y.name === "" ? 1 : x.name.localeCompare(y.name)));

export const namespaceTitle = (ns: string) => ns || "global functions";
/** A URL segment as a namespace: "global" is the global functions. */
export const namespaceOf = (segment: string) => (segment === GLOBAL ? "" : segment);

/** The function at /api/<namespace>/<name>. */
export function findFunction(a: Api, segment: string, name: string): Fn | undefined {
  const f = a.fn.get(segment === GLOBAL ? name : `${segment}.${name}`);
  return f && f.namespace === namespaceOf(segment) ? f : undefined;
}

export const shortName = (f: Fn) => (f.namespace ? f.name.slice(f.namespace.length + 1) : f.name);

/** The namespaces with the most functions, then the rest: the index's grid and the sidebar. */
export const namespacesBySize = (a: Api) =>
  [...a.namespaces].filter((n) => n.name !== "").sort((x, y) => y.counts.total - x.counts.total || x.name.localeCompare(y.name));

/** The widget types CreateFrame makes, then the types they are built on. */
export const widgetsByKind = (a: Api) => ({
  types: a.widgets.filter((w) => w.widget),
  bases: a.widgets.filter((w) => !w.widget),
});

/** A class's bases, level by level (StatusBar → Frame → Region → ScriptRegion + ScriptRegionResizing …). */
export function ancestry(a: Api, w: Widget): Widget[][] {
  const levels: Widget[][] = [[w]];
  const seen = new Set([w.name]);
  for (;;) {
    const next = levels.at(-1)!.flatMap((c) => c.bases).filter((b) => !seen.has(b) && a.widget.has(b) && seen.add(b));
    if (!next.length) return levels;
    levels.push(next.map((b) => a.widget.get(b)!));
  }
}

export function methodCounts(methods: Method[]): Counts {
  const c: Counts = { total: methods.length, implemented: 0, recorded: 0, guessed: 0, "not implemented": 0 };
  for (const m of methods) c[m.status]++;
  return c;
}

/** The structure a value's type names (`ContainerItemInfo?` → ContainerItemInfo), if any. */
export function structureOf(a: Api, type: string): { name: string; table: Table } | null {
  const name = type.replace(/\?$/, "").replace(/\[\]$/, "");
  const table = a.tables[name];
  return table?.kind === "Structure" ? { name, table } : null;
}

/** The structures of a namespace's systems. */
export const structuresOf = (a: Api, ns: Namespace) =>
  Object.entries(a.tables)
    .filter(([, t]) => t.kind === "Structure" && t.system && ns.systems.includes(t.system))
    .map(([name, table]) => ({ name, table }))
    .sort((x, y) => x.name.localeCompare(y.name));

// ── Signatures ──────────────────────────────────────────────────────────────


const typeSpan = (raw: string) => {
  const t = wowType(raw);
  return `<span class="tok-t">${esc(t.replace(/\?$/, ""))}</span>${t.endsWith("?") ? '<span class="tok-p">?</span>' : ""}`;
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const line = (html: string) => `<span class="wl-code__line">${html}</span>`;

/** `(containerIndex: BagIndex, slotIndex: number): ContainerItemInfo?`, the one-line form the tables show. */
export function signature(c: { args: Value[]; returns: Value[] }): string {
  const args = c.args.map((v) => `${v.name}: ${wowType(v.type)}`).join(", ");
  const ret = c.returns.length === 0 ? "" : c.returns.length === 1 ? `: ${wowType(c.returns[0].type)}` : `: (${c.returns.map((v) => wowType(v.type)).join(", ")})`;
  return `(${args})${ret}`;
}

/** The highlighted declaration of a function or method: one argument per line, as the design writes it. */
export function declaration(owner: string, sep: "." | ":", name: string, c: { args: Value[]; returns: Value[] }): string {
  const head = `<span class="tok-k">function</span> ${owner ? `${esc(owner)}${sep}` : ""}<span class="tok-f">${esc(name)}</span>(`;
  const ret =
    c.returns.length === 0
      ? ""
      : `<span class="tok-p">:</span> ${c.returns.length === 1 ? typeSpan(c.returns[0].type) : `(${c.returns.map((v) => typeSpan(v.type)).join(", ")})`}`;
  if (!c.args.length) return line(`${head})${ret}`);
  const args = c.args.map((v, i) => line(`    ${esc(v.name)}<span class="tok-p">:</span> ${typeSpan(v.type)}${i < c.args.length - 1 ? "," : ""}`));
  return [line(head), ...args, line(`)${ret}`)].join("");
}

/** `declare event BAG_UPDATE(bagID: BagIndex)`. */
export const eventDeclaration = (e: Event) =>
  line(
    `<span class="tok-k">declare event</span> <span class="tok-f">${esc(e.name)}</span>(${e.payload
      .map((v) => `${esc(v.name)}<span class="tok-p">:</span> ${typeSpan(v.type)}`)
      .join(", ")})`,
  );

export const payloadText = (e: Event) => (e.payload.length ? e.payload.map((v) => `${v.name}: ${wowType(v.type)}`).join(", ") : "no payload");

// ── What Blizzard's documentation flags ─────────────────────────────────────

/** `secretWhenUnitAuraRestricted` → "secret when unit aura restricted". */
const flagWords = (k: string) => humanize(k);

/**
 * The documentation's flags as sentences, in two groups: what it says about secret values, and its other
 * restrictions. Flags that say nothing a caller acts on (an event's synchronousEvent) are left to their page.
 */
export function restrictions(flags: Record<string, unknown>, kind: "function" | "method" | "event") {
  const secrets: string[] = [];
  const other: string[] = [];
  for (const [k, v] of Object.entries(flags)) {
    if (k === "secretArguments") {
      secrets.push(
        v === "AllowedWhenUntainted"
          ? "Blizzard's documentation allows secret arguments only from untainted code. Addon code is tainted, so pass ordinary values."
          : v === "AllowedWhenTainted"
            ? "It accepts secret arguments, even from addon code."
            : "It never accepts secret arguments.",
      );
    } else if (k === "secretReturns" || k === "secretPayloads") secrets.push(kind === "event" ? "Its payload can hold secret values." : "Its results can be secret values.");
    else if (k === "returnsNeverSecret") secrets.push("Its results are never secret.");
    else if (/^secret(When|In)/.test(k)) secrets.push(`Secret ${flagWords(k).replace(/^secret /, "")}.`);
    else if (k === "isProtectedFunction") other.push("Protected: only Blizzard's own code may call it, and a call from an addon is blocked.");
    else if (k === "hasRestrictions") other.push("Blizzard's documentation marks it as restricted in some situations.");
    else if (k === "secureHooksAllowed" && v === false) other.push("It can't be hooked with hooksecurefunc.");
    else if (/^requires?[A-Z]/.test(k) && v === true) other.push(`${flagWords(k).replace(/^requires? /, "Requires ").replace(/^./, (c) => c.toUpperCase())}.`);
  }
  if (kind !== "event" && secrets.length && !("isProtectedFunction" in flags) && !("hasRestrictions" in flags)) secrets.push("Not protected: you can call it in combat.");
  return { secrets, other };
}

/** What an event's flags say about when it is delivered. */
export function eventFacts(e: Event): string | null {
  const marks = [e.flags.synchronousEvent && "synchronous", e.flags.uniqueEvent && "unique", e.flags.callbackEvent && "a callback event"].filter(Boolean) as string[];
  if (!marks.length) return null;
  const list = marks.length === 1 ? marks[0] : `${marks.slice(0, -1).join(", ")} and ${marks.at(-1)}`;
  return `Blizzard's documentation marks the event as ${list}.`;
}

// ── Related entries, from the data ──────────────────────────────────────────

const STOP = new Set(["get", "set", "is", "has", "can", "c", "update", "info", "num"]);
const words = (name: string) =>
  new Set(
    humanize(name.replace(/^C_\w+\./, "").replace(/[:.]/g, " "))
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w)),
  );
const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((w) => b.has(w)).length;

/** The best of `pool` for `name`: the most words in common, then what the emulator implements, then by name. */
function closest<T extends { name: string; status: string }>(name: string, pool: T[], n: number): T[] {
  const mine = words(name);
  return pool
    .filter((x) => x.name !== name)
    .map((x) => ({ x, s: overlap(mine, words(x.name)) }))
    .sort((p, q) => q.s - p.s || Number(q.x.status === "implemented") - Number(p.x.status === "implemented") || p.x.name.localeCompare(q.x.name))
    .slice(0, n)
    .map((p) => p.x);
}

/** A function's related functions (same namespace, else same system) and its system's events. */
export function relatedToFunction(a: Api, f: Fn) {
  const pool = f.namespace ? (a.functionsOf.get(f.namespace) ?? []) : f.system ? (a.functionsOfSystem.get(f.system) ?? []) : [];
  const sameSystem = f.system ? (a.functionsOfSystem.get(f.system) ?? []).filter((x) => x.namespace !== f.namespace) : [];
  const events = f.system ? (a.eventsOfSystem.get(f.system) ?? []) : [];
  return { functions: closest(f.name, [...pool, ...sameSystem], 5), events: closest(f.name, events, 4) };
}

/** An event's related events (same system) and its system's functions. */
export function relatedToEvent(a: Api, e: Event) {
  const events = e.system ? (a.eventsOfSystem.get(e.system) ?? []) : [];
  const functions = e.system ? (a.functionsOfSystem.get(e.system) ?? []) : [];
  return { events: closest(e.name, events, 4), functions: closest(e.name, functions, 4) };
}

// ── Notes and prose ─────────────────────────────────────────────────────────

export type Section = { id: string; title: string; html: string };
export type Note = { lead: string; sections: Section[]; repoPath: string };

/** `Frame:Show` → notes/Frame.Show.md: Windows file names can't hold a colon. */
const noteFile = (name: string) => `${NOTES}/${name.replace(":", ".")}.md`;

/** An entry's hand-written note, split at its `##` sections ("In the emulator", "Example", "Testing"). */
export async function note(name: string): Promise<Note | null> {
  const repoPath = noteFile(name);
  const md = readRepoFile("main", repoPath);
  if (md === null) return null;
  const r = await renderMarkdown(md, { version: "main", repoPath });
  return { ...splitSections(r), repoPath };
}

/** The HTML before the first h2, and each h2 with what follows it. */
export function splitSections(r: Rendered): { lead: string; sections: Section[] } {
  const parts = r.html.split(/(?=<h2[\s>])/);
  const lead = /^<h2[\s>]/.test(parts[0]) ? "" : parts.shift()!;
  const sections = parts.map((html) => {
    const id = /^<h2[^>]*\sid="([^"]+)"/.exec(html)?.[1] ?? "";
    const title = /^<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html)?.[1].replace(/<[^>]+>/g, "").trim() ?? "";
    return { id, title, html };
  });
  return { lead, sections };
}

/** The note's section whose heading starts with `word` ("Example: list the junk" for "example"). */
export const noteSection = (n: Note | null, word: string) => n?.sections.find((s) => s.title.toLowerCase().startsWith(word));
/** Its sections other than the three every note may have. */
export const otherSections = (n: Note | null) => n?.sections.filter((s) => !/^(in the emulator|example|testing)/i.test(s.title)) ?? [];
/** A section's body without its heading: the page draws its own. */
export const bodyOf = (s: Section) => s.html.replace(/^<h2[^>]*>[\s\S]*?<\/h2>/, "");

/**
 * What each status means, from the table in docs/reference/api.md: its first sentence for an entry's page, which
 * links to the full table on /api.
 */
export function statusMeaning(status: Status): string | null {
  const md = readRepoFile("main", PROSE) ?? "";
  const row = md.split("\n").find((l) => new RegExp(`^\\|\\s*${status}\\s*\\|`).test(l));
  const text = row?.split("|")[2]?.trim();
  return text ? firstSentence(text) : null;
}

/** What not implemented means for an event, from the paragraph of api.md that starts "For an event, not implemented". */
export function eventStatusMeaning(): string | null {
  const md = readRepoFile("main", PROSE) ?? "";
  const para = md.split(/\n\s*\n/).find((p) => /^For an event, not implemented/.test(p.trim()));
  return para ? para.replace(/\s+/g, " ").trim().split(/(?<=\.)\s+(?=See )/)[0] : null;
}

const firstSentence = (s: string) => /^.*?[.:](?=\s|$)/.exec(s)?.[0].replace(/:$/, ".") ?? s;

// ── Sources ─────────────────────────────────────────────────────────────────

/**
 * Who wrote an entry's text: the summary's source, and the others its parameter and result notes come from. The
 * page's "sources" line names them with the data's own strings (`sources`).
 */
export function credits(doc: Doc): { summary: Source | null; notes: Source[] } {
  if (!doc) return { summary: null, notes: [] };
  return { summary: doc.summarySource, notes: doc.sources.filter((s) => s !== doc.summarySource) };
}

/** Every URL of the reference, for the sitemap. */
export function allPaths(a: Api) {
  return {
    namespaces: namespaces(a).map((n) => namespaceHref(n.name)),
    functions: a.functions.map((f) => functionHref(f.name)),
    events: a.events.map((e) => eventHref(e.name)),
    widgets: a.widgets.map((w) => widgetHref(w.name)),
  };
}

export { eventHref, functionHref, methodHref, namespaceHref, widgetHref, wowType };
