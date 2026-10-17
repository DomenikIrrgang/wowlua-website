import type { Metadata } from "next";
import Link from "next/link";
import { ChangelogFilter } from "@/components/ChangelogFilter";
import { changelog } from "@/lib/changelog";
import { REPO_URL, githubUrl, latestRelease, unreleased } from "@/lib/content";
import { isoDay } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { milestones } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every release of wowlua, newest first, and what is on main but not released yet.",
};

const md = async (text: string) => (text ? (await renderMarkdown(text, { version: "main", repoPath: "CHANGELOG.md" })).html : "");

export default async function ChangelogPage() {
  const { source, entries } = changelog();
  const latest = latestRelease();
  const pending = unreleased();
  const byRelease = new Map(milestones().filter((m) => m.release).map((m) => [m.release!, m.id]));
  const inProgress = milestones().find((m) => m.status === "in progress");
  const rendered = await Promise.all(entries.map(async (e) => ({ intro: await md(e.intro), sections: await Promise.all(e.sections.map((s) => md(s.body))) })));
  const hasUnreleased = entries.some((e) => e.version === null);

  const commitsNote = pending.base && pending.total ? (
    <p className="caption" style={{ margin: "12px 0 0", color: "var(--ink-muted)" }}>
      {pending.total} commits on main since {pending.base}:{" "}
      <a href={`${REPO_URL()}/compare/${pending.base}...main`}>compare on GitHub ↗</a>
    </p>
  ) : null;

  return (
    <main className="page" id="main" style={{ maxWidth: 1008 }}>
      <div className="page__head">
        <h1 className="display-l">Changelog</h1>
        <p>
          Every release of wowlua, newest first. Each minor version closes a milestone of the <Link href="/roadmap">roadmap</Link>. Binaries are on{" "}
          <a href={`${REPO_URL()}/releases`}>GitHub Releases ↗</a>.
          {source === "changelog" ? (
            <>
              {" "}
              Read from <a href={githubUrl("main", "CHANGELOG.md")}>CHANGELOG.md</a>.
            </>
          ) : null}
        </p>
      </div>

      <ChangelogFilter latest={latest ? `latest release: ${latest.tag} · ${isoDay(latest.date)}` : ""}>
        {!hasUnreleased && commitsNote && (
          <article className="wl-release" id="unreleased">
            <div className="wl-release__meta">
              <h2 className="wl-release__version">
                <a href="#unreleased">unreleased</a>
              </h2>
              <span className="wl-release__date">since {pending.base}</span>
              <span>
                <span className="wl-badge wl-badge--planned">in progress</span>
              </span>
            </div>
            <div className="wl-release__body">{commitsNote}</div>
          </article>
        )}
        {entries.map((e, i) => {
          const id = e.version ? `v${e.version.replace(/\./g, "-")}` : "unreleased";
          const milestone = e.version ? byRelease.get(e.version) : inProgress?.id;
          return (
            <article className="wl-release" id={id} key={id}>
              <div className="wl-release__meta">
                <h2 className="wl-release__version">
                  <a href={`#${id}`}>{e.version ?? "unreleased"}</a>
                </h2>
                <span className="wl-release__date">
                  {e.version ? e.date : `since ${pending.base ?? "the last release"}`}
                  {milestone ? ` · ${milestone}` : ""}
                </span>
                <span>
                  {e.version ? <span className="wl-badge wl-badge--done">released</span> : <span className="wl-badge wl-badge--planned">in progress</span>}
                </span>
                {e.url && (
                  <a className="caption" href={e.url}>
                    release on GitHub ↗
                  </a>
                )}
              </div>
              <div className="wl-release__body">
                {rendered[i].intro && <div className="md release-intro" dangerouslySetInnerHTML={{ __html: rendered[i].intro }} />}
                {e.sections.map((s, j) => (
                  <section key={j} className={`wl-release__section wl-release__section--${s.kind}`} data-kind={s.kind}>
                    <h3>{s.title}</h3>
                    <div className="md release-list" dangerouslySetInnerHTML={{ __html: rendered[i].sections[j] }} />
                  </section>
                ))}
                {!e.version && commitsNote}
              </div>
            </article>
          );
        })}
      </ChangelogFilter>
    </main>
  );
}
