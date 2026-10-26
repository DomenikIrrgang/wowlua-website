import Link from "next/link";
import { SidebarToggle } from "@/components/docs/SidebarToggle";
import { type Api, FLAVORS, clientName, namespacesBySize, widgetsByKind } from "@/lib/api";
import { ApiFilter } from "./ApiFilter";
import { GLOBAL, fmt, humanize, namespaceHref, widgetHref } from "./shared";

/** How many namespaces, global systems, widgets and event systems the sidebar lists before its "all …" link. */
const SHOWN = { namespaces: 15, global: 3, widgets: 9, events: 6 };

type Item = { id: string; label: string; href: string; tag?: number };

/**
 * Where a page is in the sidebar: "overview", "status", "ns:C_Container", "global" or "global:<system>",
 * "w:StatusBar" or "w:all", "ev:all" or "ev:<system>".
 */
export type SidebarCurrent = string;

/** The systems with the most entries, by count. */
function topSystems<T extends { system: string | null }>(items: T[], n: number) {
  const by = new Map<string, T[]>();
  for (const it of items) if (it.system) by.set(it.system, [...(by.get(it.system) ?? []), it]);
  return [...by.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, n);
}

function sections(a: Api, current: SidebarCurrent): { title: string; items: Item[] }[] {
  // The biggest namespaces, alphabetically, and always the one the page is in.
  const nsCurrent = current.startsWith("ns:") ? current.slice(3) : null;
  const ns = namespacesBySize(a).slice(0, SHOWN.namespaces);
  if (nsCurrent && !ns.some((n) => n.name === nsCurrent) && a.namespace.has(nsCurrent)) ns.push(a.namespace.get(nsCurrent)!);
  ns.sort((x, y) => x.name.localeCompare(y.name, "en", { sensitivity: "base" }));

  const global = topSystems(a.functionsOf.get("") ?? [], SHOWN.global);
  const gCurrent = current.startsWith("global:") ? current.slice(7) : null;
  if (gCurrent && !global.some(([s]) => s === gCurrent)) global.push([gCurrent, (a.functionsOf.get("") ?? []).filter((f) => f.system === gCurrent)]);

  const { types } = widgetsByKind(a);
  const widgets = [...types].sort((x, y) => y.methods.length - x.methods.length || x.name.localeCompare(y.name)).slice(0, SHOWN.widgets);
  const wCurrent = current.startsWith("w:") ? current.slice(2) : null;
  if (wCurrent && a.widget.has(wCurrent) && !widgets.some((w) => w.name === wCurrent)) widgets.push(a.widget.get(wCurrent)!);

  const events = topSystems(a.events, SHOWN.events);
  const eCurrent = current.startsWith("ev:") ? current.slice(3) : null;
  if (eCurrent && eCurrent !== "all" && !events.some(([s]) => s === eCurrent)) events.push([eCurrent, a.eventsOfSystem.get(eCurrent) ?? []]);

  return [
    {
      title: "overview",
      items: [
        { id: "overview", label: "search the API", href: "/api" },
        { id: "status", label: "what the statuses mean", href: "/api#status" },
      ],
    },
    {
      title: "namespaces",
      items: [
        ...ns.map((n) => ({ id: `ns:${n.name}`, label: n.name, href: namespaceHref(n.name), tag: n.counts.total })),
        { id: "ns:all", label: `all ${fmt(a.summary.namespaces)} namespaces …`, href: "/api#all-namespaces" },
      ],
    },
    {
      title: "global functions",
      items: [
        ...global.map(([system, fns]) => ({
          id: `global:${system}`,
          label: `${humanize(system)}: ${fns
            .slice(0, 2)
            .map((f) => f.name)
            .join(", ")} …`,
          href: `/api/${GLOBAL}#system-${system}`,
        })),
        { id: "global", label: "all global functions …", href: `/api/${GLOBAL}` },
      ],
    },
    {
      title: "widgets",
      items: [
        ...widgets.map((w) => ({ id: `w:${w.name}`, label: w.name, href: widgetHref(w.name), tag: w.methods.length || undefined })),
        { id: "w:all", label: `all ${types.length} widget types …`, href: "/api/widgets" },
      ],
    },
    {
      title: "events",
      items: [
        ...events.map(([system]) => ({ id: `ev:${system}`, label: humanize(system), href: `/api/events#system-${system}` })),
        { id: "ev:all", label: `all ${fmt(a.summary.events.total)} events …`, href: "/api/events" },
      ],
    },
  ];
}

/** The reference's sidebar: the flavor, a filter over every name, and the namespaces, widgets and events. */
export function ApiSidebar({ api: a, current, title }: { api: Api; current: SidebarCurrent; title: string }) {
  const all = sections(a, current);
  const section = all.find((s) => s.items.some((i) => i.id === current));
  return (
    <SidebarToggle crumbs={["api", ...(section && section.title !== "overview" ? [section.title] : []), title]}>
      <div className="docs-sidebar__version">
        <label className="caption" htmlFor="api-flavor" style={{ color: "var(--ink-muted)" }}>
          flavor
        </label>
        <div className="wl-select wl-select--small">
          {/* Only camelot's data exists so far; the others are shown, but can't be picked. */}
          <select className="wl-select__control" id="api-flavor" defaultValue={a.flavor}>
            {FLAVORS.map((f) => (
              <option key={f.id} value={f.id} disabled={!f.ready}>
                {f.ready ? `${f.label} · ${clientName(a)}` : `${f.label} · coming soon`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ApiFilter>
        <nav className="wl-docs-sidebar" aria-label="WoW API">
          {all.map((s) => (
            <div className="wl-docs-sidebar__section" key={s.title}>
              <h2 className="wl-docs-sidebar__title">{s.title}</h2>
              <ul>
                {s.items.map((it) => (
                  <li key={it.id}>
                    <Link className="wl-docs-sidebar__link" href={it.href} aria-current={it.id === current ? "page" : undefined}>
                      {it.label}
                      {it.tag ? <span className="wl-docs-sidebar__tag">{it.tag}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ApiFilter>
    </SidebarToggle>
  );
}
