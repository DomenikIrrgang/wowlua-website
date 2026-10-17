import type { Metadata } from "next";
import { githubUrl } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { milestones, type Status } from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "wowlua's milestones, their exit criteria and status, from the roadmap in the wowlua repository.",
};

const md = async (text: string) => (await renderMarkdown(text, { version: "main", repoPath: "spec/roadmap.md" })).html;

const COLOR: Record<Status, string> = { done: "var(--success)", "in progress": "var(--amber)", planned: "var(--line-strong)" };
const MARK: Record<Status, { glyph: string; color: string }> = {
  done: { glyph: "✓", color: "var(--success)" },
  "in progress": { glyph: "~", color: "var(--amber-ink)" },
  planned: { glyph: "·", color: "var(--ink-muted)" },
};

export default async function RoadmapPage() {
  const ms = milestones();
  const count = (s: Status) => ms.filter((m) => m.status === s).length;
  const rendered = await Promise.all(
    ms.map(async (m) => ({ intro: await md(m.intro), exit: m.exit ? await md(m.exit) : "", rest: m.rest ? await md(m.rest) : "" })),
  );

  return (
    <main className="page" id="main" style={{ maxWidth: 1008 }}>
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
      </div>

      <ol className="roadmap">
        {ms.map((m, i) => (
          <li key={m.id} className="roadmap__item" id={m.anchor}>
            <span aria-hidden="true" className="roadmap__dot" style={{ background: COLOR[m.status] }} />
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
            {m.status !== "done" && <div className="md roadmap__intro" dangerouslySetInnerHTML={{ __html: rendered[i].intro }} />}
            {m.stages.length > 0 && m.status !== "done" && (
              <div className="roadmap__stages">
                <span className="label" style={{ color: "var(--ink-muted)" }}>
                  stages
                </span>
                <ul>
                  {m.stages.map((s) => (
                    <li key={s.id}>
                      <span style={{ color: MARK[s.status].color }}>{MARK[s.status].glyph}</span> {s.id} {s.title.split(":")[0]}
                      {s.note && <span style={{ color: "var(--ink-muted)" }}> · {s.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.exit && (
              <div className="caption roadmap__exit">
                <span style={{ color: "var(--amber-ink)" }}>exit:</span> <span dangerouslySetInnerHTML={{ __html: rendered[i].exit.replace(/^<p>|<\/p>\s*$/g, "") }} />
              </div>
            )}
            {(m.status === "done" ? rendered[i].intro || rendered[i].rest : rendered[i].rest) && (
              <details className="roadmap__more">
                <summary className="caption">{m.status === "done" ? "scope and status notes" : "status notes"}</summary>
                {m.status === "done" && rendered[i].intro && <div className="md roadmap__intro" dangerouslySetInnerHTML={{ __html: rendered[i].intro }} />}
                {rendered[i].rest && <div className="md" dangerouslySetInnerHTML={{ __html: rendered[i].rest }} />}
              </details>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
