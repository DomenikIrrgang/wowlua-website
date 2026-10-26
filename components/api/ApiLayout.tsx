import { MobileToc } from "@/components/docs/MobileToc";
import { Breadcrumb, Toc } from "@/components/docs/parts";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";
import type { Api } from "@/lib/api";
import type { TocEntry } from "@/lib/markdown";
import { ApiSidebar, type SidebarCurrent } from "./ApiSidebar";

type Crumb = { label: string; href?: string };

/** An entry's page: the API sidebar, the article and its contents, in the docs' layout. */
export function ApiLayout({
  api,
  current,
  crumbs,
  path,
  toc,
  children,
}: {
  api: Api;
  current: SidebarCurrent;
  crumbs: Crumb[];
  path: string;
  toc: TocEntry[];
  children: React.ReactNode;
}) {
  const items = [{ label: "api", href: "/api" }, ...crumbs];
  return (
    <div className="docs api">
      <JsonLd data={breadcrumbs([{ name: "WoW API", path: "/api" }, ...crumbs.slice(0, -1).filter((c) => c.href).map((c) => ({ name: c.label, path: c.href! })), { name: crumbs.at(-1)!.label, path }])} />
      <aside className="docs__side">
        <ApiSidebar api={api} current={current} title={crumbs.at(-1)!.label} />
      </aside>
      <main className="docs__main api-main" id="main">
        <Breadcrumb items={items} />
        {children}
      </main>
      <aside className="docs__toc">
        <Toc entries={toc} />
      </aside>
    </div>
  );
}

/** The phone's folded "on this page", placed after the entry's header. */
export function ApiMobileToc({ toc, path }: { toc: TocEntry[]; path: string }) {
  return <MobileToc key={`toc:${path}`} entries={toc} />;
}

export const tocOf = (entries: [id: string, text: string][]): TocEntry[] => entries.map(([id, text]) => ({ id, text, depth: 2 }));
