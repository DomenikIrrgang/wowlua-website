import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import Link from "next/link";
import { REPO_URL } from "@/lib/content";
import { highlight } from "@/lib/highlight";
import { taste } from "@/lib/readme";

export const metadata: Metadata = {
  title: "Playground",
  description: "Try wowlua in the browser. Coming once the compiler builds to WebAssembly.",
  ...ogMetadata("/playground", "Playground", "Try wowlua in the browser. Coming once the compiler builds to WebAssembly."),
};

export default function PlaygroundPage() {
  const t = taste();
  return (
    <main className="page tools-playground" id="main" style={{ maxWidth: "var(--size-page)" }}>
      <div className="page__head">
        <span className="label" style={{ color: "var(--amber-ink)" }}>
          [ playground ]
        </span>
        <h1 className="display-l">Playground</h1>
        <p>
          Write wowlua and see the Lua it compiles to, in every flavor and optimization setting. The playground needs the compiler in the browser, and wowlua does not build to
          WebAssembly yet, so it is not here yet.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link className="wl-btn wl-btn--primary" href="/#install">
            install wowlua
          </Link>
          <a className="wl-btn wl-btn--secondary" href={REPO_URL()}>
            wowlua on GitHub ↗
          </a>
        </div>
      </div>
      {t.code && (
        <figure className="wl-code tools-code" style={{ margin: 0, maxWidth: 760 }}>
          <div className="wl-code__bar">
            <span className="wl-code__file">src/main.wowlua</span>
            <span className="wl-code__lang">wowlua · a taste, from the README</span>
          </div>
          <pre className="wl-code__pre">
            <code dangerouslySetInnerHTML={{ __html: highlight(t.code.replace(/^-- src\/main\.wowlua\n/, ""), "wowlua") }} />
          </pre>
        </figure>
      )}
    </main>
  );
}
