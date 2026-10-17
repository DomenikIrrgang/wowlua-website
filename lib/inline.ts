import { escapeHtml } from "./highlight";

/** One line of Markdown (code, bold, links) as HTML, for text taken from the README. */
export function inlineMd(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="wl-icode">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, u: string) => `<a href="${u}">${t}</a>`);
}
