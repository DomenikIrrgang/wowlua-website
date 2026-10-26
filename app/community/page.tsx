import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import Link from "next/link";
import { changelog } from "@/lib/changelog";
import { DISCORD_URL, REPO_URL, githubUrl, latestRelease, readRepoFile } from "@/lib/content";
import { shortVersion } from "@/lib/format";
import { installCommands, developing } from "@/lib/readme";

export const metadata: Metadata = {
  title: "Community",
  description: "wowlua is MIT-licensed and developed on GitHub: ask on Discord, report bugs as issues, send pull requests.",
  ...ogMetadata("/community", "Community", "wowlua is MIT-licensed and developed on GitHub: ask on Discord, report bugs as issues, send pull requests."),
};

// "What's new" names at most this many of the latest minor version's headline entries.
const NEWS_NAMES = 4;

/** The latest minor version and the names of its bold-led CHANGELOG entries ("- **Debugger**: …"), oldest release first.
 *  "VS Code: Testing view" counts as "VS Code". */
function whatsNew(): { minor: string; names: string[] } | null {
  const latest = latestRelease();
  if (!latest) return null;
  const minor = shortVersion(latest.tag);
  const names = changelog()
    .entries.filter((e) => e.version && shortVersion(e.version) === minor)
    .reverse()
    .flatMap((e) => e.sections.flatMap((s) => [...s.body.matchAll(/^[-*] \*\*(.+?)\*\*/gm)].map((m) => m[1].split(": ")[0].replace(/[:.]$/, ""))));
  return { minor, names: [...new Set(names)] };
}

// "Debugger" reads as "debugger" inside a sentence; "VS Code" and "wowlua" stay as they are.
const inSentence = (name: string) => (/^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name);

const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** The README's one-line "Developing" commands, each with its comment. */
function devCommands(): { cmd: string; comment: string }[] {
  const lines = developing().split("\n");
  return lines.flatMap((line, i) => {
    // Commands whose comment continues on the next lines are left out of the short list.
    if (!line.trim() || /^\s/.test(line) || /^\s+#/.test(lines[i + 1] ?? "")) return [];
    const m = /^(.*?\S)(\s+#.*)?$/.exec(line)!;
    return [{ cmd: m[1], comment: m[2] ?? "" }];
  });
}

const Prompt = ({ cmd, comment = "" }: { cmd: string; comment?: string }) => (
  <>
    <span className="wl-term__prompt">$</span> <span className="wl-term__cmd">{cmd}</span>
    {comment && (
      <>
        {comment.slice(0, comment.indexOf("#"))}
        <span className="wl-term__comment">{comment.slice(comment.indexOf("#"))}</span>
      </>
    )}
  </>
);

export default function CommunityPage() {
  const news = whatsNew();
  // "Needs Rust 1.96 or newer and a clone of the repository." → "1.96 or newer"
  const rust = installCommands().find((c) => c.id === "source")?.note.match(/Rust (\S+ or newer)/)?.[1];
  const dev = devCommands();
  // Shown only once the wowlua repository has them.
  const guides = [
    { file: "CONTRIBUTING.md", label: "contributing guide" },
    { file: "CODE_OF_CONDUCT.md", label: "code of conduct" },
  ].filter((g) => readRepoFile("main", g.file) !== null);
  const links = (items: [string, string][], arrow = true) => (
    <ul className="community__links">
      {items.map(([href, label]) => (
        <li key={href}>
          <a href={href}>
            <span>{label}</span> {arrow && <span aria-hidden="true">↗</span>}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="page community-page" id="main" style={{ maxWidth: "var(--size-page)" }}>
      <header className="page__head">
        <span className="label" style={{ color: "var(--amber-ink)" }}>
          [ community ]
        </span>
        <h1 className="display-l">Built in the open</h1>
        <p className="body-l" style={{ maxWidth: "60ch" }}>
          wowlua is MIT-licensed and developed on GitHub. Ask questions on Discord, report bugs as issues, and send pull requests.
        </p>
      </header>

      <section className="community-grid" aria-label="Channels">
        <article className="community-card">
          <h2 className="heading-2" style={{ margin: 0 }}>
            GitHub
          </h2>
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            The source, the sample addons in <code className="wl-icode">examples/</code>, the VS Code extension, releases and the issue tracker.
          </p>
          {links([
            [REPO_URL(), REPO_URL().replace("https://github.com/", "")],
            [`${REPO_URL()}/issues`, "issues"],
            [`${REPO_URL()}/releases`, "releases"],
          ])}
        </article>
        <article className="community-card">
          <h2 className="heading-2" style={{ margin: 0 }}>
            Discord
          </h2>
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            Help with your addon, migration questions, and what people are building.
          </p>
          <a className="wl-btn wl-btn--primary community__join" href={DISCORD_URL}>
            join the server ↗
          </a>
          <span className="caption community__discord" style={{ color: "var(--ink-muted)" }}>
            {DISCORD_URL.replace("https://", "")}
          </span>
        </article>
        <article className="community-card">
          <h2 className="heading-2" style={{ margin: 0 }}>
            What&apos;s new
          </h2>
          <p className="body-s" style={{ margin: 0, color: "var(--ink-muted)" }}>
            {news && news.names.length > 0 && (
              <>
                {news.minor} brought {list(news.names.slice(0, NEWS_NAMES).map(inSentence).concat(news.names.length > NEWS_NAMES ? ["more"] : []))}.{" "}
              </>
            )}
            Every release is posted to Discord with its changelog.
          </p>
          <div className="community__more-links">
            <Link href="/changelog" className="community__more">
              <span>read the changelog</span> <span aria-hidden="true">→</span>
            </Link>
            <Link href="/blog" className="community__more">
              <span>release notes on the blog</span> <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="community-split" aria-labelledby="bugs">
        <div className="community-split__text">
          <h2 id="bugs" className="heading-1" style={{ margin: 0 }}>
            Report a bug
          </h2>
          <p className="body" style={{ margin: 0 }}>
            Include the wowlua version, the command you ran and the full output. For an error you saw in game, map it back to your source first:{" "}
            <code className="wl-icode">wowlua trace</code> reads the message and stack from the error frame or your error display addon and prints the source lines and functions.
          </p>
          <aside className="wl-callout wl-callout--tip" aria-label="tip">
            <div className="wl-callout__head">
              <span className="wl-callout__glyph" aria-hidden="true">
                +
              </span>
              tip:
            </div>
            <div className="wl-callout__body">
              <p>
                Copy the error in game, then run <code className="wl-icode">wowlua trace --clipboard</code>. Dev builds keep line numbers, so locations point at your{" "}
                <code className="wl-icode">.wowlua</code> files directly.
              </p>
            </div>
          </aside>
          <a className="wl-btn wl-btn--secondary community__cta" href={`${REPO_URL()}/issues/new`}>
            open an issue ↗
          </a>
        </div>
        <figure className="wl-term">
          <div className="wl-term__bar">
            <span>~/MyAddon</span>
            <span>zsh</span>
          </div>
          <pre className="wl-term__body">
            <Prompt cmd="wowlua --version" />
            {"\n"}
            <Prompt cmd="wowlua trace --clipboard" comment="     # an error copied from the game" />
            {"\n"}
            <Prompt cmd="wowlua trace error.txt" comment="       # or a saved file" />
          </pre>
        </figure>
      </section>

      <section className="community-split community-split--rule" aria-labelledby="contribute">
        <div className="community-split__text">
          <h2 id="contribute" className="heading-1" style={{ margin: 0 }}>
            Contribute
          </h2>
          <p className="body" style={{ margin: 0 }}>
            wowlua is written in Rust{rust ? ` (${rust})` : ""}. Open an issue before a larger change so we can agree on the behaviour first; every change comes with tests.
          </p>
          {guides.length > 0 && links(guides.map((g) => [githubUrl("main", g.file), g.label]), false)}
        </div>
        {dev.length > 0 && (
          <figure className="wl-term">
            <div className="wl-term__bar">
              <span>~/wowlua</span>
              <span>zsh</span>
            </div>
            <pre className="wl-term__body">
              {dev.map((d, i) => (
                <span key={i}>
                  {i > 0 && "\n"}
                  <Prompt cmd={d.cmd} comment={d.comment} />
                </span>
              ))}
            </pre>
          </figure>
        )}
      </section>
    </main>
  );
}
