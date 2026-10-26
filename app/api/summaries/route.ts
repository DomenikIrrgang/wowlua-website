import type { NextRequest } from "next/server";
import { type Doc, api } from "@/lib/api";

/** Names one request may ask for: a page of search results. */
const MAX = 60;

/**
 * What the entries `?n=C_Timer.After,BAG_UPDATE,Frame:Show,C_Spell` do: their summary and whether wowlua wrote it.
 * The search on /api asks for the results it shows, so the descriptions never ship to the browser all at once.
 */
export function GET(req: NextRequest) {
  const a = api();
  const names = (req.nextUrl.searchParams.get("n") ?? "").split(",").filter(Boolean).slice(0, MAX);
  const out: Record<string, [summary: string, byWowlua: boolean] | null> = {};
  const pick = (doc: Doc) => (doc?.summary ? ([doc.summary, doc.summarySource === "wowlua"] as [string, boolean]) : null);
  for (const name of names) {
    if (!a) break;
    const method = /^(\w+):(\w+)$/.exec(name);
    if (method) out[name] = pick(a.widget.get(method[1])?.methods.find((m) => m.name === method[2])?.doc ?? null);
    else if (a.fn.has(name)) out[name] = pick(a.fn.get(name)!.doc);
    else if (a.event.has(name)) out[name] = pick(a.event.get(name)!.doc);
    else {
      const ns = a.namespace.get(name === "global functions" ? "" : name);
      out[name] = ns?.doc ? [ns.doc, false] : null;
    }
  }
  return Response.json(out, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" } });
}
