import Link from "next/link";
import { latestRelease, sidebar, versions } from "@/lib/content";
import { isoDay, shortVersion } from "@/lib/format";
import { SidebarToggle } from "./SidebarToggle";
import { VersionSelect, type VersionOption } from "./VersionSelect";

/** `title` names the page in the phone's contents bar when the sidebar does not list it. */
export function DocsSidebar({ version, current, title }: { version: string; current: string; title?: string }) {
  const latest = latestRelease();
  const latestId = latest ? shortVersion(latest.tag) : null;
  const options: VersionOption[] = versions().map((v) => ({
    id: v.id,
    label: v.id === "main" ? "main · unreleased" : v.id === latestId ? `${v.ref} · latest release` : v.ref,
    caption: isoDay(v.date),
  }));
  const sections = sidebar(version);
  const section = sections.find((s) => s.items.some((i) => i.repoPath === current));
  const item = section?.items.find((i) => i.repoPath === current);
  const crumbs = ["docs", ...(section ? [section.title] : []), item?.label ?? title ?? "contents"];

  return (
    <SidebarToggle crumbs={crumbs}>
      <div className="docs-sidebar__version">
        <label className="caption" htmlFor="docs-version" style={{ color: "var(--ink-muted)" }}>
          docs version
        </label>
        <VersionSelect id="docs-version" value={version} options={options} />
      </div>
      <nav className="wl-docs-sidebar" aria-label="Documentation">
        {sections.map((s) => (
          <div className="wl-docs-sidebar__section" key={s.title}>
            <h2 className="wl-docs-sidebar__title">{s.title}</h2>
            <ul>
              {s.items.map((it) => (
                <li key={it.href}>
                  <Link className="wl-docs-sidebar__link" href={it.href} aria-current={it.repoPath === current ? "page" : undefined}>
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </SidebarToggle>
  );
}
