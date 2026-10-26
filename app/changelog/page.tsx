import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import { ChangelogFilter } from "@/components/ChangelogFilter";
import { Disclosure } from "@/components/news/Disclosure";
import { changelog, type Entry } from "@/lib/changelog";
import { REPO_URL, latestRelease, unreleased } from "@/lib/content";
import { isoDay } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every release of wowlua, newest first, and what is on main but not released yet.",
  ...ogMetadata("/changelog", "Changelog", "Every release of wowlua, newest first, and what is on main but not released yet."),
};

const md = async (text: string) => (text ? (await renderMarkdown(text, { version: "main", repoPath: "CHANGELOG.md" })).html : "");

// The newest minor versions are listed in full, the next ones as one line each, older ones wait behind a button.
const FULL_MINORS = 4;
const BRIEF_MINORS = 3;
// A minor version with more patch releases than this lists them as one line each.
const MAX_FULL_PATCHES = 3;

const minorOf = (version: string) => version.split(".").slice(0, 2).join(".");
const isPatch = (version: string) => !/\.0$/.test(version);

/** "26 added, 51 changed, 29 fixed": the top-level entries of each section. */
const counts = (e: Entry) =>
  e.sections
    .map((s) => `${(s.body.match(/^[-*] /gm) ?? []).length} ${s.title}`)
    .filter((c) => !c.startsWith("0 "))
    .join(", ");

export default async function ChangelogPage() {
  const { entries } = changelog();
  const latest = latestRelease();
  const pending = unreleased();
  const dateOf = (e: Entry) => e.date ?? "";

  const minors = [...new Set(entries.flatMap((e) => (e.version ? [minorOf(e.version)] : [])))];
  const patches = (minor: string) => entries.filter((e) => e.version && minorOf(e.version) === minor && isPatch(e.version)).length;
  const layout = (e: Entry): "full" | "brief" | "older" => {
    if (!e.version) return "full";
    const rank = minors.indexOf(minorOf(e.version));
    if (rank >= FULL_MINORS + BRIEF_MINORS) return "older";
    if (rank >= FULL_MINORS) return "brief";
    return isPatch(e.version) && patches(minorOf(e.version)) > MAX_FULL_PATCHES ? "brief" : "full";
  };
  const firstOlder = entries.find((e) => layout(e) === "older")?.version ?? undefined;

  const rendered = await Promise.all(
    entries.map(async (e) => ({
      intro: await md(e.intro),
      // A collapsed release's line: its intro's first paragraph.
      brief: layout(e) === "full" ? "" : await md(e.intro.split(/\n\s*\n/)[0]),
      sections: await Promise.all(e.sections.map((s) => md(s.body))),
    })),
  );
  const hasUnreleased = entries.some((e) => e.version === null);
  const since = `on main, since ${pending.base?.replace(/^v/, "") ?? "the last release"}`;

  const commitsNote = pending.base && pending.total ? (
    <p className="caption" style={{ margin: "12px 0 0", color: "var(--ink-muted)" }}>
      {pending.total} commits on main since {pending.base}:{" "}
      <a href={`${REPO_URL()}/compare/${pending.base}...main`}>compare on GitHub ↗</a>
    </p>
  ) : null;

  return (
    <main className="page changelog-page" id="main" style={{ maxWidth: 1008 }}>
      <div className="page__head">
        <h1 className="display-l">Changelog</h1>
        <p style={{ maxWidth: "64ch" }}>
          Every release of wowlua, newest first, written for addon authors. Binaries are on <a href={`${REPO_URL()}/releases`}>GitHub Releases ↗</a>.
        </p>
      </div>

      <ChangelogFilter latest={latest ? `latest release: ${latest.tag} · ${isoDay(latest.date)}` : ""} older={firstOlder}>
        {!hasUnreleased && commitsNote && (
          <Disclosure
            as="article"
            className="wl-release"
            id="unreleased"
            defaultOpen
            summary={<ReleaseSummary version="unreleased" when={since} released={false} />}
          >
            <div className="wl-release__meta">
              <h2 className="wl-release__version">
                <a href="#unreleased">unreleased</a>
              </h2>
              <span className="wl-release__date">{since}</span>
              <span>
                <span className="wl-badge wl-badge--planned">not released yet</span>
              </span>
            </div>
            <div className="wl-release__body">{commitsNote}</div>
          </Disclosure>
        )}
        {entries.map((e, i) => {
          const id = e.version ? `v${e.version.replace(/\./g, "-")}` : "unreleased";
          const when = e.version ? dateOf(e) : since;
          const shown = layout(e);
          const sections = e.sections;
          const kinds = new Set(sections.map((s) => s.kind));
          const brief = [rendered[i].brief.replace(/^<p>([\s\S]*)<\/p>\s*$/, "$1"), counts(e) && `${counts(e)}.`].filter(Boolean).join(" ");
          return (
            <Disclosure
              as="article"
              className={`wl-release${shown === "full" ? "" : " wl-release--collapsed"}`}
              id={id}
              key={id}
              defaultOpen={i < 2}
              attrs={shown === "older" ? { "data-older": "" } : undefined}
              summary={<ReleaseSummary version={e.version ?? "unreleased"} when={when} released={!!e.version} />}
            >
              <div className="wl-release__meta">
                <h2 className="wl-release__version">
                  <a href={`#${id}`}>{e.version ?? "unreleased"}</a>
                </h2>
                <span className="wl-release__date">{when}</span>
                <span>
                  {e.version ? <span className="wl-badge wl-badge--done">released</span> : <span className="wl-badge wl-badge--planned">not released yet</span>}
                </span>
              </div>
              <div className="wl-release__body">
                {/* A collapsed release: its intro and how many changes, until its link is followed (:target). */}
                {shown !== "full" && (
                  <p className="wl-release__brief">
                    {brief && <span dangerouslySetInnerHTML={{ __html: brief }} />} <a href={`#${id}`}>Show all changes</a>
                  </p>
                )}
                <div className="wl-release__full">
                  {rendered[i].intro && <div className="md release-intro" dangerouslySetInnerHTML={{ __html: rendered[i].intro }} />}
                  {sections.map((s, j) => (
                    <section key={j} className={`wl-release__section wl-release__section--${s.kind}`} data-kind={s.kind}>
                      <h3>{s.title}</h3>
                      <div className="md release-list" dangerouslySetInnerHTML={{ __html: rendered[i].sections[j] }} />
                    </section>
                  ))}
                  {/* Phones say so when the filter leaves a release empty. */}
                  {sections.length > 0 &&
                    (["added", "changed", "fixed"] as const)
                      .filter((k) => !kinds.has(k))
                      .map((k) => (
                        <p key={k} className="caption wl-release__none" data-kind={k}>
                          no {k} entries in this release
                        </p>
                      ))}
                  {!e.version && commitsNote}
                  {e.url && (
                    <a className="caption wl-release__gh" href={e.url}>
                      release on GitHub ↗
                    </a>
                  )}
                </div>
              </div>
            </Disclosure>
          );
        })}
      </ChangelogFilter>
    </main>
  );
}

/** A release's row in the phone accordion: version, date and status. */
function ReleaseSummary({ version, when, released }: { version: string; when: string; released: boolean }) {
  return (
    <span className="wl-release__summary">
      <span className="heading-2">{version}</span>
      <span className="caption" style={{ color: "var(--ink-muted)" }}>
        {when} · <span style={{ color: released ? "var(--success)" : "var(--note)" }}>{released ? "released" : "not released yet"}</span>
      </span>
    </span>
  );
}
