// Compiler output as the terminal colours it, for the .wl-diag blocks of the docs, the diagnostic pages and the
// playground's problems. No Node dependencies: the playground imports it in the browser.
import { escapeHtml } from "./highlight";

/** Compiler output, coloured as the terminal prints it. */
export function diagHtml(text: string): string {
  // The carets take the colour of the diagnostic they belong to.
  let severity = "error";
  return text
    .split("\n")
    .map((line) => {
      const head = /^(error|warning)(\[[EWP]\d{4}\])?(:.*)$/.exec(line);
      if (head) severity = head[1];
      return diagLine(line, severity);
    })
    .join("\n");
}

/** One line of compiler output, coloured as the terminal prints it. */
function diagLine(line: string, severity: string): string {
  const head = /^(error|warning)(\[[EWP]\d{4}\])?(:.*)$/.exec(line);
  if (head) return `<span class="wl-diag__${head[1]}">${head[1]}${head[2] ?? ""}</span><span class="wl-diag__msg">${escapeHtml(head[3])}</span>`;
  const gutter = /^(\s*(?:\d+\s)?(?:│|┌─|└─|╭─|╰─|\|))(.*)$/.exec(line);
  if (gutter) {
    const rest = escapeHtml(gutter[2]).replace(/([\^~-]{1,}.*)$/, (m) => (/^[\^~]/.test(m.trim()) ? `<span class="wl-diag__${severity}">${m}</span>` : m));
    return `<span class="wl-diag__gutter">${escapeHtml(gutter[1])}</span>${rest}`;
  }
  const help = /^(\s*=\s*)(help|note)(:.*)$/.exec(line);
  if (help) return `${escapeHtml(help[1])}<span class="wl-diag__${help[2]}">${help[2]}</span>${escapeHtml(help[3])}`;
  return escapeHtml(line);
}
