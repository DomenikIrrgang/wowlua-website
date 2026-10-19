import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import Link from "next/link";
import { ChangelogFilter } from "@/components/ChangelogFilter";
import { Disclosure } from "@/components/news/Disclosure";
import { changelog } from "@/lib/changelog";
import { REPO_URL, githubUrl, latestRelease, unreleased } from "@/lib/content";
import { isoDay } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { milestones } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every release of wowlua, newest first, and what is on main but not released yet.",
  ...ogMetadata("/changelog", "Changelog", "Every release of wowlua, newest first, and what is on main but not released yet."),
};

const md = async (text: string) => (text ? (await renderMarkdown(text, { version: "main", repoPath: "CHANGELOG.md" })).html : "");

// Phones list this many entries and keep the older ones behind a button.
const PHONE_SHOWN = 9;

export default async function ChangelogPage() {
  const { source, entries } = changelog();
  const latest = latestRelease();
  const pending = unreleased();
  const byRelease = new Map(milestones().filter((m) => m.release).map((m) => [m.release!, m.id]));
  const inProgress = milestones().find((m) => m.status === "in progress");
  const rendered = await Promise.all(entries.map(async (e) => ({ intro: await md(e.intro), sections: await Promise.all(e.sections.map((s) => md(s.body))) })));
  const hasUnreleased = entries.some((e) => e.version === null);
  const firstOlder = entries[PHONE_SHOWN]?.version ?? undefined;

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

      <ChangelogFilter latest={latest ? `latest release: ${latest.tag} · ${isoDay(latest.date)}` : ""} older={firstOlder}>
        {!hasUnreleased && commitsNote && (
          <Disclosure
            as="article"
            className="wl-release"
            id="unreleased"
            defaultOpen
            summary={<ReleaseSummary version="unreleased" when={`since ${pending.base}`} released={false} />}
          >
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
          </Disclosure>
        )}
        {entries.map((e, i) => {
          const id = e.version ? `v${e.version.replace(/\./g, "-")}` : "unreleased";
          const milestone = e.version ? byRelease.get(e.version) : inProgress?.id;
          const when = `${e.version ? e.date : `since ${pending.base ?? "the last release"}`}${milestone ? ` · ${milestone}` : ""}`;
          const kinds = new Set(e.sections.map((s) => s.kind));
          return (
            <Disclosure
              as="article"
              className="wl-release"
              id={id}
              key={id}
              defaultOpen={i < 2}
              attrs={i >= PHONE_SHOWN ? { "data-older": "" } : undefined}
              summary={<ReleaseSummary version={e.version ?? "unreleased"} when={when} released={!!e.version} />}
            >
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
                {/* Phones say so when the filter leaves a release empty. */}
                {e.sections.length > 0 &&
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
            </Disclosure>
          );
        })}
      </ChangelogFilter>
    </main>
  );
}

/** A release's row in the phone accordion: version, date, milestone and status. */
function ReleaseSummary({ version, when, released }: { version: string; when: string; released: boolean }) {
  return (
    <span className="wl-release__summary">
      <span className="heading-2">{version}</span>
      <span className="caption" style={{ color: "var(--ink-muted)" }}>
        {when} · <span style={{ color: released ? "var(--success)" : "var(--note)" }}>{released ? "released" : "in progress"}</span>
      </span>
    </span>
  );
}
