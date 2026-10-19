"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DiscordIcon, GithubIcon, LogoFull } from "./Logo";
import { openSearch } from "./SearchPalette";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { label: "docs", href: "/docs", match: (p: string) => p.startsWith("/docs") && !isStdlib(p) && !isCli(p) },
  { label: "stdlib", href: "/docs/spec/stdlib", match: isStdlib },
  { label: "cli", href: "/docs/spec/toolchain/cli", match: isCli },
  { label: "playground", href: "/playground", match: (p: string) => p.startsWith("/playground") },
  { label: "packages", href: "/packages", match: (p: string) => p.startsWith("/packages") },
  { label: "blog", href: "/blog", match: (p: string) => p.startsWith("/blog") },
];

function isStdlib(p: string) {
  return /^\/docs(\/\d+\.\d+)?\/spec\/stdlib/.test(p);
}
function isCli(p: string) {
  return /^\/docs(\/\d+\.\d+)?\/spec\/toolchain\/cli/.test(p);
}

export function SiteHeader({ version, repoUrl, discordUrl }: { version: string | null; repoUrl: string; discordUrl: string }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={`wl-site-header${open ? " is-open" : ""}`} data-site-header>
      <div className="wl-site-header__inner">
        <Link className="wl-site-header__brand" href="/" aria-label="wowlua home">
          <LogoFull />
        </Link>
        {version && <span className="wl-site-header__version">{version}</span>}
        <nav className="wl-site-header__nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} className="wl-site-header__link" href={n.href} aria-current={n.match(pathname) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="wl-site-header__end">
          <ThemeToggle />
          <button className="wl-site-header__search" type="button" aria-label="search the docs" onClick={() => openSearch()}>
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
    </header>
  );
}
