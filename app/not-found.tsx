import Link from "next/link";
import { MissingPage, SearchField } from "@/components/news/NotFoundParts";

const LINKS = [
  ["/docs", "docs"],
  ["/docs/guide/commands", "cli reference"],
  ["/docs/reference/diagnostics", "diagnostics"],
  ["/playground", "playground"],
];

export default function NotFound() {
  return (
    <main className="page not-found" id="main">
      <h1 className="display-l" style={{ margin: 0 }}>
        Page not found
        <span className="wl-caret" aria-hidden="true" />
      </h1>
      <MissingPage />
      <SearchField />
      <nav className="not-found__buttons" aria-label="Popular pages">
        {LINKS.map(([href, label], i) => (
          <Link className={`wl-btn ${i ? "wl-btn--secondary" : "wl-btn--primary"}`} href={href} key={href}>
            {label}
          </Link>
        ))}
        <Link className="wl-btn wl-btn--ghost" href="/">
          home
        </Link>
      </nav>
      {/* Phones: the links as a list, and a "go home" button in place of the "home" link. */}
      <nav className="not-found__nav" aria-label="Popular pages">
        <span className="caption not-found__caption">popular pages</span>
        {LINKS.map(([href, label]) => (
          <Link className="not-found__link" href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
      <Link className="wl-btn wl-btn--primary not-found__home" href="/">
        go home
      </Link>
    </main>
  );
}
