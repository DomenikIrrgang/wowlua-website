import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { ogMetadata } from "@/lib/og";
import { highlight } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Showcase",
  description: "AddOns built with or moved to wowlua.",
  ...ogMetadata("/showcase", "Showcase", "AddOns built with or moved to wowlua."),
};

type Entry = {
  name: string;
  description: string;
  kind: "addon" | "library" | "addon suite";
  flavors: string[];
  links: Partial<Record<"website" | "source" | "curseforge" | "wago", string>>;
};

const DIR = path.join(process.cwd(), "content", "showcase");

function entries(): Entry[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as Entry)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const TEMPLATE = `{
  "name": "MyAddon",
  "description": "One line about what it does.",
  "kind": "addon",
  "flavors": ["standard", "mists"],
  "links": {
    "source": "https://github.com/you/MyAddon",
    "curseforge": "https://www.curseforge.com/wow/addons/myaddon",
    "wago": "https://addons.wago.io/addons/myaddon"
  }
}`;

const SITE_REPO = "https://github.com/DomenikIrrgang/wowlua-website";

export default function ShowcasePage() {
  const list = entries();
  return (
    <main className="page" id="main" style={{ maxWidth: "var(--size-page)" }}>
      <div className="page__head">
        <span className="label" style={{ color: "var(--amber-ink)" }}>
          [ showcase ]
        </span>
        <h1 className="display-l">AddOns built with or moved to wowlua</h1>
        <p>Projects whose authors added them to this page. Every entry is a file in the website&apos;s repository.</p>
      </div>

      <ul className="showcase">
        {list.map((e) => (
          <li key={e.name} className="showcase__item">
            <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              <h2 className="heading-2" style={{ margin: 0 }}>
                {e.name}
              </h2>
              <span className="wl-badge">{e.kind}</span>
            </div>
            <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
              {e.description}
            </p>
            <div className="wl-badge-row">
              {e.flavors.map((f) => (
                <span key={f} className="wl-badge wl-badge--release">
                  {f}
                </span>
              ))}
            </div>
            <div className="showcase__links caption">
              {Object.entries(e.links).map(([k, u]) => (
                <a key={k} href={u}>
                  {k} ↗
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <section className="showcase__submit" aria-labelledby="submit">
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h2 id="submit" className="heading-1" style={{ margin: 0 }}>
            Submit your addon
          </h2>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Add one file to the website&apos;s repository and open a pull request. Your entry shows up with the next site build.
          </p>
          <ol className="md" style={{ margin: 0 }}>
            <li>
              Fork <a href={SITE_REPO}>DomenikIrrgang/wowlua-website ↗</a>.
            </li>
            <li>
              Add <code className="wl-icode">content/showcase/&lt;name&gt;.json</code> in the format on the right.
            </li>
            <li>
              Open a pull request titled <code className="wl-icode">showcase: &lt;name&gt;</code>.
            </li>
          </ol>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            And show it on your own pages with the <Link href="/badge">built with wowlua badge</Link>.
          </p>
        </div>
        <figure className="wl-code" style={{ margin: 0 }}>
          <div className="wl-code__bar">
            <span className="wl-code__file">content/showcase/myaddon.json</span>
            <span className="wl-code__lang">json</span>
          </div>
          <pre className="wl-code__pre">
            <code dangerouslySetInnerHTML={{ __html: highlight(TEMPLATE, "json") }} />
          </pre>
        </figure>
      </section>
    </main>
  );
}
