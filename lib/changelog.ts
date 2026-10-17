// Releases for the changelog page: wowlua's CHANGELOG.md on main when it has
// one (Keep a Changelog: "## [0.9.0] - 2026-10-15", "### Added"), otherwise
// the GitHub release notes.
import { cache } from "react";
import { readRepoFile, releases } from "./content";

export type Kind = "added" | "changed" | "fixed" | "removed" | "other";
export type Entry = {
  version: string | null; // null: unreleased
  date: string | null;
  intro: string; // Markdown
  sections: { kind: Kind; title: string; body: string }[]; // Markdown bodies
  url: string | null;
};

const KINDS: Kind[] = ["added", "changed", "fixed", "removed"];

export const changelog = cache((): { source: "changelog" | "releases"; entries: Entry[] } => {
  const md = readRepoFile("main", "CHANGELOG.md");
  const tags = new Map(releases().map((r) => [r.tag.replace(/^v/, ""), r]));
  if (md) {
    const entries: Entry[] = [];
    for (const part of md.split(/^## /m).slice(1)) {
      const nl = part.indexOf("\n");
      const head = part.slice(0, nl).trim();
      const body = part.slice(nl + 1).replace(/^\[[^\]]+\]:\s*\S+\s*$/gm, "").trim();
      const m = /^\[?([^\]\s]+)\]?(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/.exec(head);
      const unreleased = /^\[?unreleased\]?/i.test(head);
      const [intro, ...subs] = body.split(/^### /m);
      entries.push({
        version: unreleased ? null : (m?.[1] ?? head),
        date: unreleased ? null : (m?.[2] ?? null),
        intro: intro.trim(),
        sections: subs.map((s) => {
          const i = s.indexOf("\n");
          const title = s.slice(0, i).trim();
          const kind = (KINDS.find((k) => k === title.toLowerCase()) ?? "other") as Kind;
          return { kind, title: title.toLowerCase(), body: s.slice(i + 1).trim() };
        }),
        url: !unreleased && m ? (tags.get(m[1])?.url ?? null) : null,
      });
    }
    return { source: "changelog", entries };
  }
  return {
    source: "releases",
    entries: releases().map((r) => ({
      version: r.tag.replace(/^v/, ""),
      date: r.date.slice(0, 10),
      intro: r.notes.replace(/\*\*Full Changelog\*\*:.*$/m, "").trim(),
      sections: [],
      url: r.url,
    })),
  };
});
