import Link from "next/link";
import { latestRelease, sidebar, versions } from "@/lib/content";
import { isoDay, shortVersion } from "@/lib/format";
import { SidebarToggle } from "./SidebarToggle";
import { VersionSelect, type VersionOption } from "./VersionSelect";

export function DocsSidebar({ version, current }: { version: string; current: string }) {
  const latest = latestRelease();
  const latestId = latest ? shortVersion(latest.tag) : null;
  const options: VersionOption[] = versions().map((v) => ({
    id: v.id,
    label: v.id === "main" ? "main · unreleased" : v.id === latestId ? `v${v.id} · latest release` : `v${v.id}`,
    caption: isoDay(v.date),
  }));

  return (
    <SidebarToggle>
      <div className="docs-sidebar__version">
        <label className="caption" htmlFor="docs-version" style={{ color: "var(--ink-muted)" }}>
          docs version
        </label>
        <VersionSelect id="docs-version" value={version} options={options} />
      </div>
      <nav className="wl-docs-sidebar" aria-label="Documentation">
        {sidebar(version).map((s) => (
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
