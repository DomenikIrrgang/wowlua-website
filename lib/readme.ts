// Facts for the landing page, read from wowlua's README (and the standard
// library overview) so they change with them.
import { cache } from "react";
import { readRepoFile } from "./content";

type Section = { title: string; body: string };

const sections = cache((): Section[] => {
  const md = readRepoFile("main", "README.md") ?? "";
  const out: Section[] = [{ title: "", body: "" }];
  for (const line of md.split("\n")) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) out.push({ title: h[1].trim(), body: "" });
    else out[out.length - 1].body += line + "\n";
  }
  return out;
});

const section = (title: string) => sections().find((s) => s.title.toLowerCase() === title.toLowerCase())?.body ?? "";

const fences = (body: string) =>
  [...body.matchAll(/(?:^|\n)([^\n]*)\n+```(\w*)\n([\s\S]*?)\n```/g)].map((m) => ({ before: m[1].trim(), lang: m[2], code: m[3] }));

/** The README's first paragraph after its header block. */
export const intro = cache(() => {
  const body = sections()[0].body;
  const para = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p.startsWith("**wowlua**"));
  return para ? para.replace(/\s*\n\s*/g, " ") : "";
});

export type InstallCommand = { id: "unix" | "windows" | "source"; label: string; prompt: string; command: string; note: string };

/** Install commands from the README's "Install" section. */
export const installCommands = cache((): InstallCommand[] => {
  const out: InstallCommand[] = [];
  for (const f of fences(section("Install"))) {
    const before = f.before.toLowerCase();
    if (before.includes("windows")) {
      out.push({ id: "windows", label: "windows", prompt: ">", command: f.code.trim(), note: "Run it in PowerShell." });
    } else if (before.includes("source")) {
      const req = /\(([^)]+)\)/.exec(f.before)?.[1];
      out.push({ id: "source", label: "from source", prompt: "$", command: f.code.trim(), note: req ? `Needs ${req} and a clone of the repository.` : "Needs a clone of the repository." });
    } else {
      out.push({ id: "unix", label: "macos / linux", prompt: "$", command: f.code.trim(), note: "" });
    }
  }
  return out;
});

/** "A taste": the README's sample code and the diagnostic shown under it. */
export const taste = cache(() => {
  const f = fences(section("A taste"));
  return { code: f.find((x) => x.lang === "lua" || x.lang === "wowlua")?.code ?? "", output: f.find((x) => x.lang === "text")?.code ?? "" };
});

/** "Debugging in game": its bullet list. */
export const debugging = cache(() =>
  section("Debugging in game")
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim()),
);

/** The "Bring your addon" section's first paragraph. */
export const bringYourAddon = cache(() => {
  const body = section("Bring your addon").replace(/```[\s\S]*?```/g, "");
  return body.split(/\n\s*\n/).map((p) => p.trim().replace(/\s*\n\s*/g, " ")).find(Boolean) ?? "";
});

/** The README's "Developing" commands. */
export const developing = cache(() => fences(section("Developing"))[0]?.code ?? "");

/** How many addons the README says adopted builds are checked on ("checked on 36 addons"), or null. */
export const adoptionChecked = cache(() => {
  const m = /checked\s+on\s+(\d+)\s+addons/i.exec(section("Bring your addon").replace(/\s+/g, " "));
  return m ? Number(m[1]) : null;
});

/** The README's "Quick start" commands, each with its `# comment`. */
export const quickStart = cache(() =>
  (fences(section("Quick start"))[0]?.code ?? "")
    .split("\n")
    .map((l) => /^(.*?)\s*(?:#\s*(.*))?$/.exec(l.trim())!)
    .filter((m) => m[1])
    .map((m) => ({ cmd: m[1], comment: m[2] ?? "" })),
);

/** The `wowlua:*` modules the standard library overview (docs/stdlib/overview.md) lists in its tables. */
export const stdlibModules = cache(() => {
  const md = readRepoFile("main", "docs/stdlib/overview.md") ?? "";
  const names = md
    .split("\n")
    .filter((l) => l.startsWith("| `wowlua:"))
    .flatMap((l) => [...l.split("|")[1].matchAll(/`(wowlua:[\w-]+)`/g)].map((m) => m[1]));
  return [...new Set(names)];
});
