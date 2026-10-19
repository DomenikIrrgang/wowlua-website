import Link from "next/link";
import { SearchButton } from "@/components/landing/SearchButton";

const LINKS = [
  ["/docs", "docs"],
  ["/docs/spec/toolchain/cli", "cli reference"],
  ["/docs/spec/appendix/diagnostics", "diagnostics"],
  ["/changelog", "changelog"],
];

export default function NotFound() {
  return (
    <main className="page not-found" id="main" style={{ maxWidth: 760 }}>
      <div className="page__head">
        <h1 className="display-l">
          Page not found
          <span className="wl-caret not-found__caret" aria-hidden="true" />
        </h1>
      </div>
      <figure className="wl-term" style={{ margin: 0 }}>
        <div className="wl-term__bar">
          <span>~/wowlua.dev</span>
          <span>404</span>
        </div>
        <pre className="wl-term__body">
          <span className="wl-diag__error">error</span>
          <span className="wl-diag__msg">: no such page</span>
          {"\n"}
          {"  "}
          <span className="wl-diag__gutter">=</span> the page may have moved when the docs were reorganized, or the link points at an older version of the docs
        </pre>
      </figure>
      {/* Phones: a search field, the links as a list, and a "go home" button in place of the "home" link. */}
      <SearchButton className="not-found__search" />
      <nav className="not-found__nav" style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }} aria-label="Where to go">
        <span className="caption not-found__caption">popular pages</span>
        {LINKS.map(([href, label]) => (
          <Link className="not-found__link" href={href} key={href}>
            {label}
          </Link>
        ))}
        <Link className="not-found__home-link" href="/">
          home
        </Link>
      </nav>
      <Link className="wl-btn wl-btn--primary not-found__home" href="/">
        go home
      </Link>
    </main>
  );
}
