"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DiscordIcon, GithubIcon, LogoFull } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { openSearch } from "./SearchPalette";
import { ThemeToggle } from "./ThemeToggle";

/** The registry's site: a server of its own (wowlua's crates/wowlua-registry). */
const REGISTRY_URL = "https://registry.wowlua.dev";

const NAV = [
  { label: "home", href: "/", match: (p: string) => p === "/" },
  { label: "docs", href: "/docs/guide/getting-started", match: (p: string) => p.startsWith("/docs") && !isApi(p) },
  { label: "api", href: "/api", match: isApi },
  { label: "registry", href: REGISTRY_URL, match: () => false },
  { label: "playground", href: "/playground", match: (p: string) => p.startsWith("/playground") },
  { label: "blog", href: "/blog", match: (p: string) => p.startsWith("/blog") },
];

function isApi(p: string) {
  return p.startsWith("/api") || /^\/docs(\/\d+\.\d+)?\/reference\/api$/.test(p);
}

export function SiteHeader({ version, repoUrl, discordUrl }: { version: string | null; repoUrl: string; discordUrl: string }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const close = useCallback(() => setOpen(false), []);
  const menuToSearch = useCallback(() => {
    setOpen(false);
    openSearch();
  }, []);

  return (
    <header className="wl-site-header" data-site-header>
      <div className="wl-site-header__inner">
        <Link className="wl-site-header__brand" href="/" aria-label="wowlua home">
          <LogoFull />
        </Link>
        {version && <span className="wl-site-header__version">{version}</span>}
        <nav className="wl-site-header__nav" aria-label="Main">
          {NAV.map((n) =>
            n.href.startsWith("http") ? (
              <a key={n.href} className="wl-site-header__link" href={n.href}>
                {n.label}
              </a>
            ) : (
              <Link key={n.href} className="wl-site-header__link" href={n.href} aria-current={n.match(pathname) ? "page" : undefined}>
                {n.label}
              </Link>
            ),
          )}
        </nav>
        <div className="wl-site-header__end">
          <ThemeToggle />
          <button className="wl-site-header__search" type="button" aria-label="search the docs" onClick={() => openSearch()}>
            <svg className="wl-site-header__search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
              <circle cx="7" cy="7" r="4.75" />
              <path d="M10.5 10.5 14.25 14.25" />
            </svg>
            <span>search docs</span>
            <kbd className="wl-kbd">ctrl k</kbd>
          </button>
          <a className="wl-site-header__icon" href={repoUrl} aria-label="wowlua on GitHub">
            <GithubIcon />
          </a>
          <a className="wl-site-header__icon" href={discordUrl} aria-label="wowlua on Discord">
            <DiscordIcon />
          </a>
          <button
            className="wl-site-header__icon wl-site-header__menu"
            type="button"
            aria-label={open ? "close menu" : "open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <MobileMenu
          nav={NAV.map((n) => ({ label: n.label, href: n.href, current: n.match(pathname) }))}
          version={version}
          repoUrl={repoUrl}
          discordUrl={discordUrl}
          onClose={close}
          onSearch={menuToSearch}
        />
      )}
    </header>
  );
}
