import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiLayout, ApiMobileToc, tocOf } from "@/components/api/ApiLayout";
import { ApiSection, EntryHead, StatusMeter, eventRows } from "@/components/api/parts";
import { fmt, humanize } from "@/components/api/shared";
import { type Event, api, eventStatusMeaning } from "@/lib/api";
import { inlineMd } from "@/lib/inline";
import { ogMetadata } from "@/lib/og";

const DESCRIPTION = "Every event of the WoW API by Blizzard's system: its payload, and whether wowlua's emulator fires it on its own.";

export function generateMetadata(): Metadata {
  return { title: "Events · WoW API", description: DESCRIPTION, ...ogMetadata("/api/events", "Events · WoW API", DESCRIPTION) };
}

/** The events by Blizzard's system, the ones its documentation leaves out last. */
function bySystem(events: Event[]) {
  const groups = new Map<string, Event[]>();
  for (const e of events) groups.set(e.system ?? "", [...(groups.get(e.system ?? "") ?? []), e]);
  return [...groups.entries()].sort(([x], [y]) => (x === "" ? 1 : y === "" ? -1 : x.localeCompare(y)));
}

export default function EventsPage() {
  const a = api();
  if (!a) notFound();
  const s = a.summary.events;
  const groups = bySystem(a.events);
  const silent = eventStatusMeaning();
  const toc = tocOf([["systems", `By system · ${groups.length}`]]);

  return (
    <ApiLayout api={a} current="ev:all" crumbs={[{ label: "events" }]} path="/api/events" toc={toc}>
      <EntryHead
        title="Events"
        badges={
          <>
            <span className="wl-badge">{fmt(s.total)} events</span>
            <span className="wl-badge">available in: {a.flavor}</span>
          </>
        }
      />
      <div className="api-total">
        <StatusMeter counts={s} label={`${fmt(s.total)} events: ${fmt(s.implemented)} implemented, ${fmt(s["not implemented"])} not implemented`} />
        <span className="caption">
          {fmt(s.total)} events: {fmt(s.implemented)} implemented, fired by the emulator on its own · {fmt(s["not implemented"])} not implemented
        </span>
      </div>
      {silent && <p className="body-s api-muted" dangerouslySetInnerHTML={{ __html: inlineMd(silent) }} />}
      <ApiMobileToc toc={toc} path="/api/events" />

      <ApiSection id="systems" title="By system">
        {groups.map(([system, events]) => (
          <div className="api-system" key={system} id={`system-${system || "undocumented"}`}>
            <h3 className="heading-3">
              {system ? humanize(system) : "Not in Blizzard's documentation"} <span className="caption">· {fmt(events.length)}</span>
            </h3>
            <div className="wl-table" role="region" aria-label={`${system || "Undocumented"} events`} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">event</th>
                    <th scope="col">payload</th>
                    <th scope="col">fired by the emulator</th>
                  </tr>
                </thead>
                <tbody dangerouslySetInnerHTML={{ __html: eventRows(events) }} />
              </table>
            </div>
          </div>
        ))}
      </ApiSection>
    </ApiLayout>
  );
}
