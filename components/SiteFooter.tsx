import Link from "next/link";
import { REPO_URL, findPage } from "@/lib/content";
import { LogoMark } from "./Logo";

type L = { label: string; href: string };

/** A docs link only when that page exists on main (docs/ pages arrive with wowlua's docs folder). */
const docs = (label: string, slug: string[]): L[] => (findPage("main", slug) ? [{ label, href: `/docs/${slug.join("/")}` }] : []);

export function SiteFooter() {
  const learn: L[] = [
    { label: "guide", href: "/docs" },
    ...docs("language", ["spec", "language", "syntax"]),
    ...docs("standard library", ["spec", "stdlib"]),
    { label: "playground", href: "/playground" },
    ...docs("adopting an addon", ["adopting-an-addon"]),
  ];
  const reference: L[] = [
    ...docs("cli", ["spec", "toolchain", "cli"]),
    ...docs("wowlua.json", ["spec", "toolchain", "manifest"]),
    ...docs("diagnostics", ["spec", "appendix", "diagnostics"]),
    { label: "packages", href: "/packages" },
  ];
  const project: L[] = [
    { label: "github ↗", href: REPO_URL() },
    { label: "community", href: "/community" },
    { label: "roadmap", href: "/roadmap" },
    { label: "changelog", href: "/changelog" },
    { label: "showcase", href: "/showcase" },
    { label: "badge", href: "/badge" },
  ];
  const col = (title: string, links: L[]) => (
    <nav className="wl-site-footer__col" aria-label={title}>
      <h2>{title.toLowerCase()}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>{l.href.startsWith("http") ? <a href={l.href}>{l.label}</a> : <Link href={l.href}>{l.label}</Link>}</li>
        ))}
      </ul>
    </nav>
  );

  return (
    <footer className="wl-site-footer" style={{ fontFamily: "var(--font-mono)" }}>
      <div className="wl-site-footer__inner">
        <div className="wl-site-footer__brand">
          <LogoMark />
          <p>A language, compiler, framework and package manager for World of Warcraft AddOns.</p>
        </div>
        {col("Learn", learn)}
        {col("Reference", reference)}
        {col("Project", project)}
        <div className="wl-site-footer__base">
          <span>MIT licence · fonts: Martian Mono, IBM Plex Mono (SIL OFL)</span>
          <span>Not affiliated with Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment, Inc.</span>
        </div>
      </div>
    </footer>
  );
}
