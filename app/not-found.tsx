import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" id="main" style={{ maxWidth: 760 }}>
      <div className="page__head">
        <h1 className="display-l">Page not found</h1>
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
      <nav style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }} aria-label="Where to go">
        <Link href="/docs">docs</Link>
        <Link href="/docs/spec/toolchain/cli">cli reference</Link>
        <Link href="/docs/spec/appendix/diagnostics">diagnostics</Link>
        <Link href="/changelog">changelog</Link>
        <Link href="/">home</Link>
      </nav>
    </main>
  );
}
