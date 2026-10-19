import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import Link from "next/link";
import { DISCORD_URL, REPO_URL, githubUrl } from "@/lib/content";
import { highlight } from "@/lib/highlight";
import { developing } from "@/lib/readme";
import { milestones, roadmapSummary } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Community",
  description: "wowlua is MIT-licensed and developed on GitHub: report bugs, follow the roadmap, contribute, ask on Discord.",
  ...ogMetadata("/community", "Community", "wowlua is MIT-licensed and developed on GitHub: report bugs, follow the roadmap, contribute, ask on Discord."),
};

export default function CommunityPage() {
  const dev = developing();
  const ms = milestones();
  const lastDone = ms.filter((m) => m.status === "done").at(-1);
  const doing = ms.filter((m) => m.status === "in progress");
  return (
    <main className="page community-page" id="main" style={{ maxWidth: "var(--size-page)" }}>
      <div className="page__head">
        <span className="label" style={{ color: "var(--amber-ink)" }}>
          [ community ]
        </span>
        <h1 className="display-l">Built in the open</h1>
        <p>wowlua is MIT-licensed and developed on GitHub. Report bugs as issues and send pull requests. Ask questions and show what you build on Discord.</p>
      </div>

      <div className="community-grid">
        <section className="landing-card">
          <h2 className="heading-2" style={{ margin: 0 }}>
            GitHub
          </h2>
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            The source, the specification in <code className="wl-icode">spec/</code>, releases and the issue tracker.
          </p>
          <div className="showcase__links caption">
            <a href={REPO_URL()}>
              <span>{REPO_URL().replace("https://github.com/", "")}</span> <span aria-hidden="true">↗</span>
            </a>
            <a href={`${REPO_URL()}/issues`}>
              <span>issues</span> <span aria-hidden="true">↗</span>
            </a>
            <a href={`${REPO_URL()}/releases`}>
              <span>releases</span> <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
        <section className="landing-card">
          <h2 className="heading-2" style={{ margin: 0 }}>
            Discord
          </h2>
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            Questions in <code className="wl-icode">#help</code>, AddOns built with wowlua in <code className="wl-icode">#showcase</code>, and every release as it ships.
          </p>
          <div className="showcase__links caption community__discord">
            <a href={DISCORD_URL}>{DISCORD_URL.replace("https://", "")} ↗</a>
          </div>
          <a className="wl-btn wl-btn--primary community__join" href={DISCORD_URL}>
            join the server ↗
          </a>
        </section>
        <section className="landing-card">
          <h2 className="heading-2" style={{ margin: 0 }}>
            Roadmap
          </h2>
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            {roadmapSummary()}
          </p>
          {(lastDone || doing.length > 0) && (
            <div className="wl-badge-row community__status">
              {lastDone && (
                <span className="wl-badge wl-badge--done">
                  <span className="wl-badge__dot" aria-hidden="true" />
                  {lastDone.id} done
                </span>
              )}
              {doing.map((m) => (
                <span key={m.id} className="wl-badge wl-badge--planned">
                  <span className="wl-badge__dot" aria-hidden="true" />
                  {m.id} in progress
                </span>
              ))}
            </div>
          )}
          <Link href="/roadmap" className="caption community__more">
            see the roadmap →
          </Link>
        </section>
      </div>

      <section className="community-split community__bugs" aria-labelledby="bugs">
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h2 id="bugs" className="heading-1" style={{ margin: 0 }}>
            Report a bug
          </h2>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Include the wowlua version, the command you ran and the full output. For an error you saw in game, map it back to your source first:{" "}
            <code className="wl-icode">wowlua trace</code> reads the message and stack from the error frame or BugSack and prints the source lines and functions.
          </p>
          <a className="community__cta" href={`${REPO_URL()}/issues/new`}>
            open an issue ↗
          </a>
        </div>
        <figure className="wl-term" style={{ margin: 0 }}>
          <div className="wl-term__bar">
            <span>~/MyAddon</span>
            <span>sh</span>
          </div>
          <pre className="wl-term__body">
            <span className="wl-term__prompt">$</span> <span className="wl-term__cmd">wowlua --version</span>
            {"\n"}
            <span className="wl-term__prompt">$</span> <span className="wl-term__cmd">wowlua trace error.txt</span>
            {"   "}
            <span className="wl-term__comment"># an error saved from the game</span>
          </pre>
        </figure>
      </section>

      {dev && (
        <section className="community-split" aria-labelledby="contribute">
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <h2 id="contribute" className="heading-1" style={{ margin: 0 }}>
              Contribute
            </h2>
            <p style={{ margin: 0, color: "var(--ink-muted)" }}>
              The specification in <code className="wl-icode">spec/</code> is normative: behaviour changes start there, and diagnostic codes are generated from{" "}
              <code className="wl-icode">spec/appendix/diagnostics.md</code>. Design decisions are in the <Link href="/docs/spec/appendix/decisions">decision log</Link>.
            </p>
            <a className="community__row" href={githubUrl("main", "README.md") + "#developing"}>
              <span>developing, in the README</span> <span aria-hidden="true">↗</span>
            </a>
          </div>
          <figure className="wl-code" style={{ margin: 0 }}>
            <div className="wl-code__bar">
              <span className="wl-code__file">~/wowlua</span>
              <span className="wl-code__lang">sh</span>
            </div>
            <pre className="wl-code__pre">
              <code dangerouslySetInnerHTML={{ __html: highlight(dev, "sh") }} />
            </pre>
          </figure>
        </section>
      )}
    </main>
  );
}
