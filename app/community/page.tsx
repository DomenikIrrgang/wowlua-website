import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL, githubUrl } from "@/lib/content";
import { highlight } from "@/lib/highlight";
import { developing } from "@/lib/readme";
import { roadmapSummary } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Community",
  description: "wowlua is MIT-licensed and developed on GitHub: report bugs, follow the roadmap, contribute.",
};

export default function CommunityPage() {
  const dev = developing();
  return (
    <main className="page" id="main" style={{ maxWidth: "var(--size-page)" }}>
      <div className="page__head">
        <span className="label" style={{ color: "var(--amber-ink)" }}>
          [ community ]
        </span>
        <h1 className="display-l">Built in the open</h1>
        <p>wowlua is MIT-licensed and developed on GitHub. Report bugs as issues and send pull requests.</p>
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
            <a href={REPO_URL()}>{REPO_URL().replace("https://github.com/", "")} ↗</a>
            <a href={`${REPO_URL()}/issues`}>issues ↗</a>
            <a href={`${REPO_URL()}/releases`}>releases ↗</a>
          </div>
        </section>
        <section className="landing-card">
          <h2 className="heading-2" style={{ margin: 0 }}>
            Roadmap
          </h2>
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            {roadmapSummary()}
          </p>
          <Link href="/roadmap" className="caption">
            see the roadmap →
          </Link>
        </section>
      </div>

      <section className="community-split" aria-labelledby="bugs">
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h2 id="bugs" className="heading-1" style={{ margin: 0 }}>
            Report a bug
          </h2>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Include the wowlua version, the command you ran and the full output. For an error you saw in game, map it back to your source first:{" "}
            <code className="wl-icode">wowlua trace</code> reads the message and stack from the error frame or BugSack and prints the source lines and functions.
          </p>
          <a href={`${REPO_URL()}/issues/new`}>open an issue ↗</a>
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
            <a href={githubUrl("main", "README.md") + "#developing"}>developing, in the README ↗</a>
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
