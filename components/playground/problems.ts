// The problems tab: each diagnostic as `wowlua check` prints it. @wowlua/web gives that text as `text` after 0.12.0
// (wowlua commit 39eac1fd); 0.12.0's diagnostics have only the message, with the first label after ": " and the
// notes and help on their own lines, so the text is put together here the way the terminal lays it out.
import type { Diagnostic } from "@wowlua/web/client";

/** The package's paths as the user sees them: main.wowlua is the only file. */
export const shownPath = (path: string) => path.replace(/^src\/main\.wowlua\b/, "main.wowlua");

export function diagnosticText(d: Diagnostic & { text?: string }, source: string): string {
  if (typeof d.text === "string" && d.text) return d.text.replace(/(┌─ )src\/main\.wowlua/g, "$1main.wowlua").replace(/\s+$/, "");
  const [first, ...more] = d.message.split("\n");
  const helps = more.filter((l) => l.startsWith("help: ")).map((l) => l.slice(6));
  const notes = more.filter((l) => !l.startsWith("help: "));
  // "message: label" (the label of the first span); a message without a label keeps its last ": " part.
  const cut = first.lastIndexOf(": ");
  const [message, label] = d.file && cut > 0 ? [first.slice(0, cut), first.slice(cut + 2)] : [first, ""];
  const head = `${d.severity}${d.code ? `[${d.code}]` : ""}: ${message}`;
  const out = [head];
  const tail = [...notes.map((n) => `= ${/^note: /.test(n) ? n : `note: ${n}`}`), ...helps.map((h) => `= help: ${h}`)];
  if (d.file) {
    const { start, end } = d.range;
    const ln = String(start.line + 1);
    const pad = " ".repeat(ln.length + 1);
    const text = (d.file === "src/main.wowlua" ? source.split("\n")[start.line] : undefined) ?? "";
    out.push(`${pad}┌─ ${shownPath(d.file)}:${start.line + 1}:${start.character + 1}`);
    if (text || d.file === "src/main.wowlua") {
      const width = Math.max(1, (end.line === start.line ? end.character : text.length) - start.character);
      out.push(`${pad}│`, `${ln} │ ${text}`, `${pad}│ ${" ".repeat(start.character)}${"^".repeat(width)}${label ? ` ${label}` : ""}`);
    }
    if (tail.length) out.push(`${pad}│`, ...tail.map((t) => `${pad}${t}`));
  } else {
    out.push(...tail.map((t) => `  ${t}`));
  }
  return out.join("\n");
}
