import type { Metadata } from "next";
import Link from "next/link";
import { ogMetadata } from "@/lib/og";
import { Disclosure } from "@/components/news/Disclosure";
import { githubUrl } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { milestones, type Status } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "wowlua's milestones, their exit criteria and status, from the roadmap in the wowlua repository.",
  ...ogMetadata("/roadmap", "Roadmap", "wowlua's milestones, their exit criteria and status, from the roadmap in the wowlua repository."),
};

const md = async (text: string) => (await renderMarkdown(text, { version: "main", repoPath: "spec/roadmap.md" })).html;

const COLOR: Record<Status, string> = { done: "var(--success)", "in progress": "var(--amber)", planned: "var(--line-strong)" };
const MARK: Record<Status, { glyph: string; color: string }> = {
  done: { glyph: "✓", color: "var(--success)" },
  "in progress": { glyph: "~", color: "var(--amber-ink)" },
  planned: { glyph: "·", color: "var(--ink-muted)" },
};
// The status word in a milestone's phone accordion row.
const SHORT: Record<Status, { word: string; color: string }> = {
  done: { word: "done", color: "var(--success)" },
  "in progress": { word: "now", color: "var(--amber-ink)" },
  planned: { word: "planned", color: "var(--ink-muted)" },
};

export default async function RoadmapPage() {
  const ms = milestones();
  const count = (s: Status) => ms.filter((m) => m.status === s).length;
  const rendered = await Promise.all(
    ms.map(async (m) => ({ intro: await md(m.intro), exit: m.exit ? await md(m.exit) : "", rest: m.rest ? await md(m.rest) : "" })),
  );

  return (
    <main className="page roadmap-page" id="main" style={{ maxWidth: 1008 }}>
      <div className="page__head">
        <h1 className="display-l">Roadmap</h1>
        <p>
          Milestones are ordered so that every one produces a usable tool. Each has an exit criterion; a milestone is done when it is met. This page is read from{" "}
          <a href={githubUrl("main", "spec/roadmap.md")}>spec/roadmap.md</a> on main.
        </p>
        <div className="wl-badge-row">
          <span className="wl-badge wl-badge--done">
            <span className="wl-badge__dot" aria-hidden="true" />
            {count("done")} done
          </span>
          <span className="wl-badge wl-badge--planned">
            <span className="wl-badge__dot" aria-hidden="true" />
            {count("in progress")} in progress
          </span>
          <span className="wl-badge">{count("planned")} planned</span>
        </div>
        <p className="caption roadmap__hint">tap a milestone to see what it covers and its exit criterion</p>
      </div>

      <ol className="roadmap">
        {ms.map((m, i) => (
          <Disclosure
            as="li"
            key={m.id}
            className="roadmap__item"
            id={m.anchor}
            defaultOpen={m.status === "in progress"}
            attrs={{ "data-status": m.status }}
            summary={
              <>
                <span className="label roadmap__sum-id" style={{ color: m.status === "in progress" ? "var(--amber-ink)" : "var(--ink-muted)" }}>
                  {m.id}
                </span>
                <span className="body-s roadmap__sum-title">{m.title}</span>
                <span className="caption" style={{ color: SHORT[m.status].color }}>
                  {SHORT[m.status].word}
                </span>
              </>
            }
          >
            <span aria-hidden="true" className="roadmap__dot m-disc__keep" style={{ background: COLOR[m.status] }} />
            <div className="roadmap__head">
              <span className="heading-2" style={{ color: m.status === "in progress" ? "var(--amber-ink)" : "var(--ink-muted)" }}>
                {m.id}
              </span>
              <h2 className="heading-2" style={{ margin: 0 }}>
                {m.title}
              </h2>
              {m.status === "done" && <span className="wl-badge wl-badge--done">done{m.date ? ` · ${m.date}` : ""}</span>}
              {m.status === "in progress" && (
                <span className="wl-badge wl-badge--planned">
                  <span className="wl-badge__dot" aria-hidden="true" />
                  in progress
                </span>
              )}
              {m.status === "planned" && <span className="wl-badge">planned</span>}
              {m.release && <span className="wl-badge wl-badge--release">released as {m.release}</span>}
            </div>
            {/* Phones: the status line and, for done milestones, the scope that wider screens fold into "scope and status notes". */}
            {m.status === "done" && (
              <p className="caption roadmap__phone">
                done{m.date ? ` · ${m.date}` : ""}
                {m.release ? ` · released as ${m.release}` : ""}
              </p>
            )}
            {m.status === "in progress" && (
              <span className="wl-badge wl-badge--planned roadmap__phone">
                <span className="wl-badge__dot" aria-hidden="true" />
                in progress
              </span>
            )}
            {m.status === "done" && rendered[i].intro && <div className="md roadmap__intro roadmap__phone" dangerouslySetInnerHTML={{ __html: rendered[i].intro }} />}
            {m.status !== "done" && <div className="md roadmap__intro" dangerouslySetInnerHTML={{ __html: rendered[i].intro }} />}
            {m.stages.length > 0 && m.status !== "done" && (
              <div className="roadmap__stages">
                <span className="label" style={{ color: "var(--ink-muted)" }}>
                  stages
                </span>
                <ul>
                  {m.stages.map((s) => {
                    const name = s.title.split(":")[0];
                    return (
                      <li key={s.id}>
                        <span style={{ color: MARK[s.status].color }}>{MARK[s.status].glyph}</span>{" "}
                        <span>
                          {s.id} {name}
                          {s.note && <span style={{ color: "var(--ink-muted)" }}> · {s.note}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {m.exit && (
              <div className="caption roadmap__exit">
                <span style={{ color: "var(--amber-ink)" }}>exit:</span> <span dangerouslySetInnerHTML={{ __html: rendered[i].exit.replace(/^<p>|<\/p>\s*$/g, "") }} />
              </div>
            )}
            {(m.status === "done" ? rendered[i].intro || rendered[i].rest : rendered[i].rest) && (
              <details className={`roadmap__more${rendered[i].rest ? "" : " roadmap__more--scope"}`}>
                <summary className="caption">{m.status === "done" ? "scope and status notes" : "status notes"}</summary>
                {m.status === "done" && rendered[i].intro && <div className="md roadmap__intro roadmap__scope" dangerouslySetInnerHTML={{ __html: rendered[i].intro }} />}
                {rendered[i].rest && <div className="md" dangerouslySetInnerHTML={{ __html: rendered[i].rest }} />}
              </details>
            )}
          </Disclosure>
        ))}
      </ol>
      <Link href="/changelog" className="label roadmap__changelog">
        see what shipped in the changelog →
      </Link>
    </main>
  );
}
