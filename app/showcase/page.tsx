import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { ogMetadata } from "@/lib/og";
import { ShowcaseList, type ShowcaseEntry as Entry } from "@/components/news/ShowcaseList";
import { highlight } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Showcase",
  description: "AddOns built with or moved to wowlua.",
  ...ogMetadata("/showcase", "Showcase", "AddOns built with or moved to wowlua."),
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

const template = (
  <figure className="wl-code" style={{ margin: 0 }}>
    <div className="wl-code__bar">
      <span className="wl-code__file">content/showcase/myaddon.json</span>
      <span className="wl-code__lang">json</span>
    </div>
    <pre className="wl-code__pre">
      <code dangerouslySetInnerHTML={{ __html: highlight(TEMPLATE, "json") }} />
    </pre>
  </figure>
);

export default function ShowcasePage() {
  const list = entries();
  return (
    <main className="page showcase-page" id="main" style={{ maxWidth: "var(--size-page)" }}>
      <section className="showcase__intro" aria-labelledby="sc-title">
        <div className="page__head">
          <span className="label" style={{ color: "var(--amber-ink)" }}>
            [ showcase ]
          </span>
          <h1 id="sc-title" className="display-l">
            AddOns built with or moved to wowlua
          </h1>
          <p className="body-l" style={{ maxWidth: "60ch" }}>
            Projects whose authors added them to this page. Every entry is a file in the website&apos;s repository.
          </p>
        </div>
        <a className="wl-btn wl-btn--secondary showcase__to-submit" href="#submit">
          submit your addon
        </a>
      </section>

      <ShowcaseList entries={list} />

      <section id="submit" className="showcase__submit" aria-labelledby="sc-submit">
        <div className="showcase__submit-text">
          <h2 id="sc-submit" className="heading-1" style={{ margin: 0 }}>
            Submit your addon
          </h2>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Add one file to the website&apos;s repository and open a pull request. Your entry shows up with the next site build.
          </p>
          <ol className="showcase__steps">
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
          {/* Phones: numbered steps with the format between them. */}
          <ol className="showcase__steps-phone">
            <li>
              <span className="label">01</span>
              <span>
                Fork <a href={SITE_REPO}>DomenikIrrgang/wowlua-website ↗</a>.
              </span>
            </li>
            <li>
              <span className="label">02</span>
              <span>
                Add <code className="wl-icode">content/showcase/&lt;name&gt;.json</code> in this format:
              </span>
            </li>
            <li className="showcase__steps-code">{template}</li>
            <li>
              <span className="label">03</span>
              <span>
                Open a pull request titled <code className="wl-icode">showcase: &lt;name&gt;</code>.
              </span>
            </li>
          </ol>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            And show it on your own pages with the <Link href="/badge">built with wowlua badge</Link>.
          </p>
        </div>
        <div className="showcase__template">{template}</div>
      </section>
    </main>
  );
}
