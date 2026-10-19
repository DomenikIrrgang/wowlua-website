"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LogoMark } from "./Logo";
import { CHOICES, useTheme } from "./ThemeToggle";

type L = { label: string; href: string };

const GUIDE: L[] = [
  { label: "installation", href: "/docs/install" },
  { label: "getting started", href: "/docs/getting-started" },
];
const REFERENCE: L[] = [
  { label: "cli commands", href: "/docs/spec/toolchain/cli" },
  { label: "wowlua.json", href: "/docs/spec/toolchain/manifest" },
  { label: "diagnostics", href: "/docs/spec/appendix/diagnostics" },
];

/** The phone menu: a full-screen sheet over the page, opened from the header's menu button. */
export function MobileMenu({
  nav,
  version,
  repoUrl,
  discordUrl,
  onClose,
  onSearch,
}: {
  nav: (L & { current: boolean })[];
  version: string | null;
  repoUrl: string;
  discordUrl: string;
  onClose: () => void;
  onSearch: () => void;
}) {
  const [theme, setTheme] = useTheme();
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  const group = (title: string, links: L[]) => (
    <div className="m-menu__group">
      <h2 className="label">{title}</h2>
      {links.map((l) => (
        <Link key={l.href} className="body-s" href={l.href} onClick={onClose}>
          {l.label}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="m-menu" role="dialog" aria-modal="true" aria-label="Site menu">
      <div className="m-menu__bar">
        <Link className="m-menu__home" href="/" aria-label="wowlua home" onClick={onClose}>
          <LogoMark />
        </Link>
        <span className="label">menu</span>
        <button ref={close} className="m-menu__close" type="button" aria-label="close menu" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="m-menu__search">
        <button type="button" onClick={onSearch}>
          <span aria-hidden="true">/</span>search docs
        </button>
      </div>

      <nav className="m-menu__nav" aria-label="Main">
        <ul>
          {nav.map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={n.current ? "page" : undefined} onClick={onClose}>
                <span>
                  <span className="m-menu__mark" aria-hidden="true">
                    &gt;{" "}
                  </span>
                  {n.label}
                </span>
                <span className="m-menu__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="m-menu__groups">
        {group("guide", GUIDE)}
        {group("reference", REFERENCE)}
      </div>

      <div className="m-menu__foot">
        <div className="m-menu__theme">
          <span className="caption">theme</span>
          <div role="radiogroup" aria-label="Theme">
            {CHOICES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={theme === c} onClick={() => setTheme(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="m-menu__links">
          <div>
            <a className="label" href={repoUrl}>
              github ↗
            </a>
            <a className="label" href={discordUrl}>
              discord ↗
            </a>
          </div>
          <span className="caption">{version ? `wowlua ${version} · MIT` : "wowlua · MIT"}</span>
        </div>
      </div>
    </div>
  );
}
