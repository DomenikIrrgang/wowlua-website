import Link from "next/link";
import { DevWindowMock } from "@/components/landing/DevWindowMock";
import { FeatureAccordion } from "@/components/landing/FeatureAccordion";
import { InstallTabs } from "@/components/landing/InstallTabs";
import { JsonLd, SITE } from "@/components/JsonLd";
import { REPO_URL, findPage, latestRelease } from "@/lib/content";
import { highlight } from "@/lib/highlight";
import { inlineMd } from "@/lib/inline";
import { bringYourAddon, debugging, installCommands, intro, taste, tools } from "@/lib/readme";
import { roadmapSummary } from "@/lib/roadmap";

const docsLink = (slug: string, fallback = "/docs") => (findPage("main", [slug]) ? `/docs/${slug}` : fallback);

type TermLine = { cmd: string; comment: string } | { out: React.ReactNode; key: string };

// Output recorded from wowlua main: `wowlua new`, `wowlua check` (the README's
// diagnostic), `wowlua test` on the new project, `wowlua build --release`.
function termLines(diagnostic: string): TermLine[] {
  const diag = diagnostic ? diagnostic.split("\n") : [];
  const lines: TermLine[] = [
    { cmd: "wowlua new TypedDemo --flavors standard,camelot,vanilla", comment: "wowlua.json, src/, tests/" },
    {
      out: (
        <>
          {"     "}
          <span className="wl-term__ok">Created</span> addon package in TypedDemo
        </>
      ),
      key: "created",
    },
  ];
  if (diag.length > 0) {
    lines.push({ cmd: "cd TypedDemo && wowlua check", comment: "" });
    diag.forEach((line, i) => {
      const m = /^(error|warning)(\[[A-Z]\d{4}\])?(:.*)$/.exec(line);
      lines.push({
        out: m ? (
          <>
            <span style={{ color: `var(--${m[1]})`, fontWeight: 600 }}>{m[1] + (m[2] ?? "")}</span>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{m[3]}</span>
          </>
        ) : (
          line
        ),
        key: `d${i}`,
      });
    });
    lines.push({ out: "", key: "blank" });
    lines.push({
      out: (
        <>
          <span style={{ color: "var(--error)", fontWeight: 600 }}>error</span>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>: aborting due to 1 previous error</span>
        </>
      ),
      key: "abort",
    });
  }
  lines.push({ cmd: "wowlua test", comment: "in the emulated client, per flavor" });
  for (const f of ["standard, 0.04s", "camelot, 0.05s", "vanilla, 0.03s"]) {
    lines.push({
      out: (
        <>
          {" "}
          <span className="wl-term__ok">PASS</span> tests/main.test.wowlua ({f})
        </>
      ),
      key: `p${f}`,
    });
    lines.push({
      out: (
        <>
          {"   "}
          <span className="wl-term__ok">✓</span> greets at login
        </>
      ),
      key: `t${f}`,
    });
  }
  lines.push({
    out: (
      <>
        {"      "}
        <span className="wl-term__ok">Tested</span> 3 passed, 0 failed, 0 skipped (3 files) in 0.32s
      </>
    ),
    key: "tested",
  });
  lines.push({ cmd: "wowlua build --release", comment: "bundled and minified" });
  lines.push({
    out: (
      <>
        {"    "}
        <span className="wl-term__ok">Finished</span> TypedDemo 0.1.0-alpha (release: standard, camelot, vanilla) in 0.09s → dist/release/TypedDemo
      </>
    ),
    key: "finished",
  });
  lines.push({ cmd: "wowlua publish", comment: "CurseForge, Wago, WoWInterface, GitHub Releases" });
  return lines;
}

/** The session as one wide transcript, comments aligned beside the commands. */
function Terminal({ diagnostic }: { diagnostic: string }) {
  const lines = termLines(diagnostic);
  return (
    <figure className="wl-term landing-term--wide" style={{ margin: "24px 0 0" }}>
      <div className="wl-term__bar">
        <span>~/TypedDemo</span>
        <span>zsh</span>
      </div>
      <pre className="wl-term__body" style={{ fontSize: 14, lineHeight: "24px", padding: "20px 24px" }}>
        {lines.map((l, i) => {
          const last = i === lines.length - 1;
          if ("out" in l)
            return (
              <span className="wl-term__out" key={l.key}>
                {l.out}
                {"\n"}
              </span>
            );
          return (
            <span key={l.cmd}>
              <span className="wl-term__prompt">$</span> <span className="wl-term__cmd">{l.cmd}</span>
              {l.comment && (
                <>
                  {" ".repeat(Math.max(2, 40 - l.cmd.length))}
                  <span className="wl-term__comment"># {l.comment}</span>
                </>
              )}
              {last ? <span className="wl-caret" aria-hidden="true" /> : "\n"}
            </span>
          );
        })}
      </pre>
    </figure>
  );
}

/** The same session for a phone: comments above their commands, long lines wrap with a hanging indent. */
function PhoneTerminal({ diagnostic }: { diagnostic: string }) {
  const lines = termLines(diagnostic);
  return (
    <figure className="wl-term landing-term--phone" style={{ margin: 0 }}>
      <div className="wl-term__bar">
        <span>~/TypedDemo</span>
        <span>zsh</span>
      </div>
      <pre className="wl-term__body">
        {lines.map((l, i) =>
          "out" in l ? (
            <span className="landing-term__line wl-term__out" key={l.key}>
              {l.out === "" ? " " : l.out}
            </span>
          ) : (
            <span key={l.cmd}>
              {l.comment && <span className="landing-term__line wl-term__comment"># {l.comment}</span>}
              <span className="landing-term__line">
                <span className="wl-term__prompt">$</span> <span className="wl-term__cmd">{l.cmd}</span>
                {i === lines.length - 1 && <span className="wl-caret" aria-hidden="true" />}
              </span>
            </span>
          ),
        )}
      </pre>
    </figure>
  );
}

const CLAMP_SRC = `local function clamp(v: number, lo: number = 0, hi: number = 1): number
    return math.max(lo, math.min(hi, v))
end`;
// `wowlua build` of the lines above with the dev profile's instrumentation off.
const CLAMP_OUT = `local function clamp(v, lo, hi) if lo == nil then lo = 0 end if hi == nil then hi = 1 end
    return math.max(lo, math.min(hi, v))
end`;

const FEATURES: Record<string, { title: string; code: React.ReactNode }> = {
  language: { title: "Types, classes, modules", code: "export class Counter\n    private count: number = 0" },
  compiler: {
    title: "Catch bugs before /reload",
    code: (
      <>
        <span style={{ color: "var(--error)", fontWeight: 600 }}>error[E2001]</span>: `&quot;now&quot;` is not{"\n"}assignable to `number`
      </>
    ),
  },
  framework: { title: "The parts every addon needs", code: '@event("PLAYER_LOGIN")' },
  "package manager": { title: "Publish everywhere at once", code: "wowlua publish --dry-run" },
};

function CopyCmd({ command }: { command: string }) {
  return (
    <div className="wl-copy-cmd">
      <span className="wl-copy-cmd__prompt" aria-hidden="true">
        $
      </span>
      <code className="wl-copy-cmd__text">{command}</code>
      <button className="wl-copy-cmd__btn" type="button" aria-label="copy command" data-copy={command}>
        copy
      </button>
    </div>
  );
}

export default function Home() {
  const latest = latestRelease();
  const commands = installCommands();
  const t = taste();
  const startHref = docsLink("getting-started");
  const adoptHref = docsLink("adopting-an-addon");

  return (
    <main id="main" className="landing">
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "WebSite", name: "wowlua", url: SITE },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "wowlua",
            description: intro().replace(/\*\*/g, ""),
            url: SITE,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "macOS, Linux, Windows",
            ...(latest ? { softwareVersion: latest.tag.replace(/^v/, ""), releaseNotes: `${SITE}/changelog` } : {}),
            downloadUrl: `${REPO_URL()}/releases/latest`,
            license: "https://opensource.org/licenses/MIT",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            sameAs: [REPO_URL()],
          },
        ]}
      />
      <section className="landing-section landing-hero" style={{ paddingTop: 88, gap: 28 }} aria-labelledby="hero">
        <p className="landing-hero__meta" style={{ margin: 0, fontSize: 12.5, color: "var(--ink-muted)" }}>
          {latest && <span style={{ color: "var(--amber-ink)", fontWeight: 600 }}>{latest.tag}</span>}
          {latest ? " · " : ""}a strict superset of Lua 5.1<span className="landing-hero__sep"> · </span>
          <span className="landing-hero__os">macOS, Linux, Windows · MIT licence</span>
        </p>
        <h1 id="hero" className="display-xl landing-hero__title" style={{ margin: 0, maxWidth: "18ch" }}>
          Typed Lua for World of Warcraft AddOns
          <span className="wl-caret" aria-hidden="true" />
        </h1>
        <p
          className="body-l landing-hero__intro"
          style={{ margin: 0, maxWidth: "62ch", color: "var(--ink-muted)" }}
          dangerouslySetInnerHTML={{ __html: inlineMd(intro().replace(/^\*\*wowlua\*\* is /, "wowlua is ")) }}
        />
        <div className="landing-hero__actions" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Link className="wl-btn wl-btn--primary" href={startHref}>
            start a new addon
          </Link>
          <Link className="wl-btn wl-btn--secondary" href={adoptHref}>
            bring your addon
          </Link>
          <span className="landing-hero__or" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            or read the <Link href="/docs/spec/language/syntax">language reference</Link>
          </span>
        </div>

        {commands.length > 0 && (
          <div className="wl-install" style={{ maxWidth: 760 }} aria-labelledby="install">
            <div className="wl-install__head">
              <h2 id="install" className="heading-3" style={{ margin: 0 }}>
                Install wowlua
              </h2>
              <p>a single binary, no runtime to install</p>
            </div>
            <InstallTabs
              commands={commands}
              after={
                <>
                  Then run <code>wowlua new MyAddon</code>, or <code>wowlua init --from-pkgmeta</code> in your addon&apos;s folder.
                </>
              }
            />
          </div>
        )}

        <Terminal diagnostic={t.output} />
        <PhoneTerminal diagnostic={t.output} />
      </section>

      <section className="landing-section" style={{ gap: 32 }} aria-labelledby="paths">
        <div style={{ display: "grid", gap: 8 }}>
          <h2 id="paths" className="heading-1" style={{ margin: 0 }}>
            Two ways in
          </h2>
          <p style={{ margin: 0, color: "var(--ink-muted)", maxWidth: "64ch" }}>
            Start from an empty folder, or point wowlua at the addon you already ship. Both end in the same place: a checked, complete AddOn.
          </p>
        </div>
        <div className="landing-cards" style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <article className="landing-card">
            <span className="label" style={{ color: "var(--amber-ink)" }}>
              [ start new ]
            </span>
            <h3 className="heading-2" style={{ margin: 0 }}>
              Your first AddOn in a minute
            </h3>
            <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
              Typed access to the WoW API of every flavor, generated from Blizzard&apos;s documentation. <code>wowlua dev</code> recompiles only what changed when you save and
              syncs into your AddOns folders.
            </p>
            <CopyCmd command="wowlua new MyAddon --flavors standard,mists,vanilla" />
            <Link className="landing-card__more" href={startHref} style={{ fontSize: 13 }}>
              follow the getting started guide →
            </Link>
          </article>
          <article className="landing-card">
            <span className="label" style={{ color: "var(--amber-ink)" }}>
              [ bring your addon ]
            </span>
            <h3 className="heading-2" style={{ margin: 0 }}>
              Adopt it without rewriting it
            </h3>
            <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }} dangerouslySetInnerHTML={{ __html: inlineMd(bringYourAddon()) }} />
            <CopyCmd command="wowlua init --from-pkgmeta" />
            <Link className="landing-card__more" href={adoptHref} style={{ fontSize: 13 }}>
              read the adoption guide →
            </Link>
          </article>
        </div>
      </section>

      <section className="landing-section" style={{ gap: 24 }} aria-labelledby="compiles">
        <div style={{ display: "grid", gap: 8 }}>
          <h2 id="compiles" className="heading-1" style={{ margin: 0 }}>
            It compiles to the Lua you would write
          </h2>
          <p style={{ margin: 0, color: "var(--ink-muted)", maxWidth: "64ch" }}>
            Types are erased, sugar is lowered, and the output stays readable Lua 5.1 with your line numbers, so in-game errors point at your source.
          </p>
        </div>
        <div className="wl-compare">
          <figure className="wl-code" style={{ margin: 0 }}>
            <div className="wl-code__bar">
              <span className="wl-code__file">src/util.wowlua</span>
              <span className="wl-code__lang">wowlua</span>
            </div>
            <pre className="wl-code__pre m-wrap">
              <code dangerouslySetInnerHTML={{ __html: highlight(CLAMP_SRC, "wowlua") }} />
            </pre>
          </figure>
          <div className="wl-compare__arrow" aria-hidden="true">
            <b>→</b>compiles to
          </div>
          <figure className="wl-code" style={{ margin: 0 }}>
            <div className="wl-code__bar">
              <span className="wl-code__file">emitted</span>
              <span className="wl-code__lang">lua 5.1</span>
            </div>
            <pre className="wl-code__pre m-wrap">
              <code dangerouslySetInnerHTML={{ __html: highlight(CLAMP_OUT, "lua") }} />
            </pre>
          </figure>
        </div>
      </section>

      <section className="wl-feature-grid landing-section" aria-labelledby="features">
        <div className="wl-feature-grid__head">
          <h2 id="features">One tool from first file to release</h2>
          <p>The language, compiler, framework and package manager ship as one binary.</p>
        </div>
        <ul className="wl-feature-grid__list wl-feature-grid__list--4">
          {tools().map((tool) => {
            const key = tool.label.toLowerCase();
            const extra = FEATURES[key];
            return (
              <li className="wl-feature" key={key}>
                <span className="wl-feature__tag">{key}</span>
                {extra && <h3 className="wl-feature__title">{extra.title}</h3>}
                <p className="wl-feature__body" dangerouslySetInnerHTML={{ __html: inlineMd(tool.text) }} />
                {extra && <pre className="wl-feature__code">{extra.code}</pre>}
              </li>
            );
          })}
        </ul>
        <FeatureAccordion
          items={tools().map((tool) => {
            const key = tool.label.toLowerCase();
            const extra = FEATURES[key];
            return { tag: key, title: extra?.title, body: inlineMd(tool.text), code: extra?.code };
          })}
        />
      </section>

      <section className="landing-section landing-section--split landing-dev" aria-labelledby="dev">
        <div className="landing-dev__text" style={{ flex: "1 1 340px", minWidth: 0, display: "grid", gap: 14 }}>
          <span className="label" style={{ color: "var(--amber-ink)" }}>
            [ in game ]
          </span>
          <h2 id="dev" className="heading-1" style={{ margin: 0 }}>
            A dev window inside the game
          </h2>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Dev builds carry debugging tools without any change to your code, and release builds contain none of it. Type <code>/wl</code>.
          </p>
          <ul className="landing-dev__list" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 13 }}>
            {debugging().map((d) => (
              <li key={d}>
                <span style={{ color: "var(--amber-ink)" }}>→</span> <span dangerouslySetInnerHTML={{ __html: inlineMd(d) }} />
              </li>
            ))}
          </ul>
        </div>
        <DevWindowMock />
      </section>

      <section className="landing-section landing-open" style={{ paddingBottom: 96, gap: 24 }} aria-labelledby="open">
        <h2 id="open" className="heading-1" style={{ margin: 0 }}>
          Built in the open
        </h2>
        <div className="landing-links" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <a className="landing-link" href={REPO_URL()}>
            <span className="heading-3">github ↗</span>
            <span className="body-s" style={{ color: "var(--ink-muted)" }}>
              Source, issues and releases. MIT licence.
            </span>
          </a>
          <Link className="landing-link" href="/roadmap">
            <span className="heading-3">roadmap →</span>
            <span className="body-s" style={{ color: "var(--ink-muted)" }}>
              {roadmapSummary()}
            </span>
          </Link>
          <Link className="landing-link" href="/changelog">
            <span className="heading-3">changelog →</span>
            <span className="body-s" style={{ color: "var(--ink-muted)" }}>
              Every release{latest ? `, latest ${latest.tag}` : ""}, and what is on main but not released yet.
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
