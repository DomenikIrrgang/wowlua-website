// Milestones from spec/roadmap.md: status, exit criterion and stages, read
// from the text as the roadmap writes them ("**Status: done (date).**",
// "Done 2026-10-13 …", "- S1 **VM core**: … Done 2026-10-15").
import { cache } from "react";
import { readRepoFile } from "./content";

export type Status = "done" | "in progress" | "planned";

export type Stage = { id: string; title: string; status: Status; note: string };

export type Milestone = {
  id: string; // "M8"
  title: string;
  status: Status;
  date: string | null; // done date
  release: string | null; // "0.9.0" when the roadmap says "Released as 0.9.0"
  intro: string; // Markdown before the exit criterion
  exit: string | null; // Markdown of the exit criterion
  stages: Stage[];
  rest: string; // the remaining Markdown (status notes)
  anchor: string; // heading id on the spec page
};

const DATE = /\d{4}-\d{2}-\d{2}/;

function stageStatus(text: string): { status: Status; note: string } {
  const done = /\b(?:Done|done|complete)\b[^.]*?(\d{4}-\d{2}-\d{2})/.exec(text);
  if (done && !/\bBuilt\b/.test(text.slice(0, done.index))) return { status: "done", note: `done ${done[1]}` };
  const built = /\bBuilt (\d{4}-\d{2}-\d{2})/.exec(text);
  if (built) return { status: "in progress", note: `built ${built[1]}` };
  if (/in progress/i.test(text)) return { status: "in progress", note: "in progress" };
  return { status: "planned", note: "" };
}

export const milestones = cache((): Milestone[] => {
  const md = readRepoFile("main", "spec/roadmap.md");
  if (!md) return [];
  const parts = md.split(/^## /m).slice(1);
  const out: Milestone[] = [];
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const heading = part.slice(0, nl).trim();
    const m = /^(M\d+):\s*(.+)$/.exec(heading);
    if (!m) continue;
    const body = part.slice(nl + 1).trim();
    const paras = body.split(/\n\s*\n/);

    // Before the exit criterion: what the milestone covers (minus a leading
    // status line and the stage bullets, shown separately). After it: notes.
    const exitIdx = paras.findIndex((p) => p.startsWith("**Exit:**"));
    const before = exitIdx >= 0 ? paras.slice(0, exitIdx) : paras;
    const isStatus = (p: string) => p.startsWith("**Status:");
    const intro = before
      .filter((p) => !isStatus(p))
      .map((p) => p.split(/\n(?=- )/).filter((item) => !/^- S\d+\s/.test(item)).join("\n"))
      .filter((p) => p.trim())
      .join("\n\n");
    const exit = exitIdx >= 0 ? paras[exitIdx].replace(/^\*\*Exit:\*\*\s*/, "").trim() : null;
    const rest = [...before.filter(isStatus), ...(exitIdx >= 0 ? paras.slice(exitIdx + 1) : [])].join("\n\n");

    // Stages: "- S1 **VM core**: …" bullets with their continuation lines, up to a blank line (the last one is
    // followed by the exit criterion). A stage may have no title of its own ("- S7 Persistent incremental cache…"):
    // then its first sentence is the title.
    const stages: Stage[] = [];
    for (const item of body.split(/\n(?=- )/)) {
      const s = /^- (S\d+)\s+([\s\S]*)$/.exec(item.split(/\n\s*\n/)[0]);
      if (!s) continue;
      const named = /^\*\*(.+?)\*\*:?\s*([\s\S]*)$/.exec(s[2]) ?? /^([^:.`\n]{1,40}):\s*([\s\S]*)$/.exec(s[2]);
      const { status, note } = stageStatus(s[2]);
      const summary = (named ? named[2] : s[2]).split(/\n\s*(?:Done|Built|done)\b/)[0].replace(/\s*\n\s*/g, " ").trim();
      const title = named ? `${named[1].replace(/`/g, "")}${summary ? `: ${summary}` : ""}` : summary.replace(/`/g, "");
      stages.push({ id: s[1], title, status, note });
    }

    let status: Status = "planned";
    let date: string | null = null;
    const st = /\*\*Status: done \((\d{4}-\d{2}-\d{2})\)/.exec(body) ?? /^- Done (\d{4}-\d{2}-\d{2})/m.exec(body);
    if (st) {
      status = "done";
      date = st[1];
    } else if (stages.some((s) => s.status !== "planned") || /\b(?:Done|Built)\s+\d{4}-\d{2}-\d{2}/.test(body) || /in progress/i.test(body)) {
      status = "in progress";
    }
    const release = /Released as (\d+\.\d+\.\d+)/.exec(body)?.[1] ?? null;
    out.push({
      id: m[1],
      title: m[2],
      status,
      date: date && DATE.test(date) ? date : null,
      release,
      intro,
      exit,
      stages,
      rest,
      anchor: `${m[1]}-${m[2]}`.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-"),
    });
  }
  return out;
});

/** "M0 to M8 done, M9 (Test runner, …) in progress" */
export function roadmapSummary(): string {
  const ms = milestones();
  const done = ms.filter((m) => m.status === "done");
  const doing = ms.filter((m) => m.status === "in progress");
  const parts: string[] = [];
  if (done.length) parts.push(done.length > 1 ? `${done[0].id} to ${done[done.length - 1].id} done` : `${done[0].id} done`);
  for (const m of doing) parts.push(`${m.id} (${m.title.toLowerCase()}) in progress`);
  const next = ms.find((m) => m.status === "planned");
  if (next) parts.push(`next: ${next.title.toLowerCase()}`);
  return parts.join(", ") + ".";
}
