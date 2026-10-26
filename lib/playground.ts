// The playground's example programs: examples/playground/*.wowlua on wowlua's main (examples/playground/README.md
// there). Line 1 is the picker's label (`-- Syntax and sugar`), line 2, when it is a comment too, the hint under the
// problems tab; the editor gets the rest.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { CACHE, readRepoFile } from "./content";

export type Example = { id: string; title: string; hint: string | null; code: string };

const DIR = "examples/playground";

export const playgroundExamples = cache((): Example[] => {
  const root = path.join(CACHE, "main", DIR);
  if (!existsSync(root)) return [];
  const order = (name: string) => Number(/^(\d+)/.exec(name)?.[1] ?? Infinity);
  return readdirSync(root)
    .filter((name) => name.endsWith(".wowlua"))
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map((name) => {
      const lines = (readRepoFile("main", `${DIR}/${name}`) ?? "").replace(/\r\n/g, "\n").split("\n");
      const title = /^--\s*(.+)$/.exec(lines[0] ?? "")?.[1].trim() ?? name.replace(/^\d+-|\.wowlua$/g, "");
      let start = /^--/.test(lines[0] ?? "") ? 1 : 0;
      const hint = start && /^--\s/.test(lines[1] ?? "") ? lines[1].replace(/^--\s*/, "").trim() : null;
      if (hint) start = 2;
      return { id: name.replace(/\.wowlua$/, ""), title, hint, code: lines.slice(start).join("\n").replace(/\n+$/, "") };
    });
});
