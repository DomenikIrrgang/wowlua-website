import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import Link from "next/link";
import { findPage } from "@/lib/content";
import { highlight } from "@/lib/highlight";
import { milestones } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Packages",
  description: "wowlua libraries, Lua libraries and type declarations. The registry arrives with milestone M10.",
  ...ogMetadata("/packages", "Packages", "wowlua libraries, Lua libraries and type declarations. The registry arrives with milestone M10."),
};

// Dependency sources wowlua resolves today (spec/toolchain/package-manager.md).
const EXAMPLE = `wowlua add LibStub --svn https://repos.wowace.com/wow/libstub/trunk
wowlua add MyLib --git https://github.com/you/MyLib --tag v1.2.0
wowlua add shared-lib --path ../shared-lib
wowlua tree                              # the resolved graph`;

export default function PackagesPage() {
  const registry = milestones().find((m) => /registry/i.test(m.title));
  const pm = findPage("main", ["spec", "toolchain", "package-manager"]);
  return (
    <main className="page" id="main" style={{ maxWidth: 1008 }}>
      <div className="page__head">
        <h1 className="display-l">Packages</h1>
        <p>wowlua libraries, Lua libraries and type declarations you can add to a project with one command. AddOns are published to addon sites instead.</p>
        {registry && (
          <div className="wl-badge-row">
            <span className="wl-badge">{registry.id}</span>
            <span className={`wl-badge ${registry.status === "done" ? "wl-badge--done" : registry.status === "in progress" ? "wl-badge--planned" : ""}`}>{registry.status}</span>
          </div>
        )}
      </div>

      <aside className="wl-callout wl-callout--note" aria-label="note" style={{ maxWidth: "var(--size-prose)" }}>
        <div className="wl-callout__head">
          <span className="wl-callout__glyph" aria-hidden="true">
            =
          </span>
          note:
        </div>
        <div className="wl-callout__body">
          <p>
            The registry {registry?.status === "done" ? "is live" : `arrives with milestone ${registry?.id ?? "M10"}`}. Until then, add dependencies from git, svn, path or archive
            sources. They are fetched into a global cache, locked in <code className="wl-icode">wowlua.lock</code> and embedded into your AddOn.
          </p>
        </div>
      </aside>

      <figure className="wl-code" style={{ margin: 0, maxWidth: 760 }}>
        <div className="wl-code__bar">
          <span className="wl-code__file">~/MyAddon</span>
          <span className="wl-code__lang">sh</span>
        </div>
        <pre className="wl-code__pre">
          <code dangerouslySetInnerHTML={{ __html: highlight(EXAMPLE, "sh") }} />
        </pre>
      </figure>

      {pm && (
        <p style={{ margin: 0 }}>
          <Link href="/docs/spec/toolchain/package-manager">Read the package manager reference →</Link>
        </p>
      )}
    </main>
  );
}
