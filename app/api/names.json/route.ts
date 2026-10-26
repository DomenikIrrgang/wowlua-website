import { KINDS, type NameEntry, STATUSES } from "@/components/api/shared";
import { api } from "@/lib/api";

export const dynamic = "force-static";
// Follows wowlua content changes while the server runs (instrumentation.ts).
export const revalidate = 60;

const kind = (k: (typeof KINDS)[number]) => KINDS.indexOf(k);

/**
 * Every function, event, widget method and namespace by name, kind and status, for the search on /api and the
 * sidebar's filter. Names only: a result's description comes from /api/summaries when it is shown.
 */
export function GET() {
  const a = api();
  if (!a) return Response.json([]);
  const out: NameEntry[] = [];
  for (const f of a.functions) out.push([f.name, kind("function"), STATUSES.indexOf(f.status)]);
  for (const e of a.events) out.push([e.name, kind("event"), STATUSES.indexOf(e.status)]);
  for (const w of a.widgets) for (const m of w.methods) out.push([`${w.name}:${m.name}`, kind("method"), STATUSES.indexOf(m.status)]);
  for (const n of a.namespaces) out.push([n.name || "global functions", kind("namespace"), -1, n.counts.total]);
  return Response.json(out);
}
