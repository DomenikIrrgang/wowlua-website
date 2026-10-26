// Renders the wowlua repository's Markdown with the design system's markup:
// links between repo files become site links, code blocks become .wl-code
// figures (```console a terminal, compiler output a .wl-diag block), tables
// .wl-table regions, GitHub alerts .wl-callout boxes, and ordered lists of
// `**Title** text `command`` items numbered steps. wowlua's CLAUDE.md lists
// these conventions for the docs' authors.
import type { Element, ElementContent, Root } from "hast";
import { toString } from "hast-util-to-string";
import path from "node:path";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { cache } from "react";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { githubUrl, hrefForRepoPath, readRepoFile } from "./content";
import { diagHtml } from "./diag";
import { diagnosticHref } from "./diagnostics";
import { escapeHtml, highlight } from "./highlight";

export type TocEntry = { id: string; text: string; depth: 2 | 3 };
export type Rendered = { html: string; title: string | null; description: string; toc: TocEntry[] };

type Ctx = { version: string; repoPath: string };

const el = (tagName: string, properties: Element["properties"], children: ElementContent[] = []): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});

const ALERTS: Record<string, { kind: string; glyph: string; label: string }> = {
  NOTE: { kind: "note", glyph: "i", label: "note" },
  TIP: { kind: "tip", glyph: "+", label: "tip" },
  IMPORTANT: { kind: "note", glyph: "!", label: "important" },
  WARNING: { kind: "warning", glyph: "!", label: "warning" },
  CAUTION: { kind: "error", glyph: "×", label: "caution" },
};

function rehypeDesign(ctx: Ctx, out: { title: string | null; description: string; toc: TocEntry[] }) {
  return (tree: Root) => {
    // The first H1 is the page title, shown in the page header instead.
    const h1 = tree.children.findIndex((n) => n.type === "element" && n.tagName === "h1");
    if (h1 >= 0) {
      out.title = toString(tree.children[h1] as Element).trim();
      tree.children.splice(h1, 1);
    }
    const paras = tree.children
      .filter((n): n is Element => n.type === "element" && n.tagName === "p")
      .map((p) => toString(p).replace(/\s+/g, " ").trim())
      .filter((t) => t.length >= 40 && !/^(Status|Last updated):/i.test(t));
    if (paras[0]) out.description = summarize(paras[0]);

    visit(tree, "element", (node, index, parent) => {
      const p = node.properties;
      switch (node.tagName) {
        case "h2":
        case "h3": {
          const depth = node.tagName === "h2" ? 2 : 3;
          p.className = [depth === 2 ? "heading-2" : "heading-3"];
          if (typeof p.id === "string") out.toc.push({ id: p.id, text: toString(node).trim(), depth });
          break;
        }
        case "h4":
        case "h5":
        case "h6":
          p.className = ["label"];
          break;
        case "a": {
          const href = typeof p.href === "string" ? p.href : "";
          p.href = rewriteHref(ctx, href);
          if (/^https?:/.test(String(p.href))) p.rel = ["noreferrer"];
          break;
        }
        case "code": {
          if (parent && (parent as Element).tagName === "pre") break;
          p.className = ["wl-icode"];
          const text = toString(node);
          const dh = /^[EWP]\d{4}$/.test(text) ? diagnosticHref(ctx.version, text) : null;
          if (dh && parent && index !== undefined && (parent as Element).tagName !== "a") {
            (parent as Element).children[index] = el("a", { href: dh, className: ["md-code-link"] }, [node]);
          }
          break;
        }
        case "pre": {
          const code = node.children[0] as Element | undefined;
          if (!code || code.tagName !== "code" || !parent || index === undefined) break;
          const cls = (code.properties.className as string[] | undefined) ?? [];
          const lang = (cls.find((c) => c.startsWith("language-")) ?? "").replace("language-", "");
          const text = toString(code).replace(/\n$/, "");
          const meta = attrs(String((code.data as { meta?: string } | undefined)?.meta ?? ""));
          (parent as Element).children[index] = { type: "raw", value: codeBlock(lang, text, meta) } as unknown as ElementContent;
          return "skip";
        }
        case "ol": {
          const steps = stepsOf(node);
          if (steps && parent && index !== undefined) {
            (parent as Element).children[index] = { type: "raw", value: steps } as unknown as ElementContent;
            return "skip";
          }
          break;
        }
        case "table": {
          if (!parent || index === undefined) break;
          // Each cell carries its column's name, so phones can show a row as a stacked card.
          const rows = (tag: string) =>
            node.children
              .filter((c): c is Element => c.type === "element" && c.tagName === tag)
              .flatMap((s) => s.children.filter((r): r is Element => r.type === "element" && r.tagName === "tr"));
          const cells = (tr: Element) => tr.children.filter((c): c is Element => c.type === "element" && (c.tagName === "td" || c.tagName === "th"));
          const labels = rows("thead").flatMap(cells).map((th) => toString(th).trim());
          for (const tr of rows("tbody")) cells(tr).forEach((td, i) => labels[i] && (td.properties.dataLabel = labels[i]));
          (parent as Element).children[index] = el("div", { className: ["wl-table"], role: "region", tabIndex: 0 }, [node]);
          return "skip";
        }
        case "blockquote": {
          if (!parent || index === undefined) break;
          const first = node.children.find((c): c is Element => c.type === "element");
          const marker = first && /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/.exec(toString(first));
          if (marker && first) {
            stripMarker(first);
            const a = ALERTS[marker[1]];
            (parent as Element).children[index] = el("aside", { className: ["wl-callout", `wl-callout--${a.kind}`], ariaLabel: a.label }, [
              el("div", { className: ["wl-callout__head"] }, [
                el("span", { className: ["wl-callout__glyph"], ariaHidden: "true" }, [{ type: "text", value: a.glyph }]),
                { type: "text", value: `${a.label}:` },
              ]),
              el("div", { className: ["wl-callout__body"] }, node.children),
            ]);
          } else {
            p.className = ["md-quote"];
          }
          break;
        }
      }
    });
  };
}

/** The words after a code block's language: `title=src/main.wowlua fragment` → { title: "src/main.wowlua", fragment: "" }. */
function attrs(meta: string): Record<string, string> {
  return Object.fromEntries(meta.split(/\s+/).filter(Boolean).map((w) => (w.includes("=") ? [w.slice(0, w.indexOf("=")), w.slice(w.indexOf("=") + 1)] : [w, ""])));
}

/** A copy button: the block's text, or `text` when given (components/Enhance.tsx). */
const copy = (text?: string) => `<button class="wl-textbtn" type="button" data-copy${text ? `="${escapeHtml(text).replace(/"/g, "&quot;")}"` : ""}>copy</button>`;

/** A fenced block: a terminal for `console`, compiler output for `text` that starts with a diagnostic, code otherwise. */
function codeBlock(lang: string, text: string, meta: Record<string, string>): string {
  const title = meta.title ? `<span class="wl-code__file">${escapeHtml(meta.title)}</span>` : "";
  if (lang === "console") {
    return (
      `<figure class="wl-term md-term"><div class="wl-term__bar"><span>${escapeHtml(meta.title ?? "terminal")}</span>${copy(commands(text))}</div>` +
      `<pre class="wl-term__body">${text.split("\n").map(termLine).join("\n")}</pre></figure>`
    );
  }
  if (lang === "text" && /^(error|warning)(\[[EWP]\d{4}\])?:/.test(text)) return `<pre class="wl-diag md-diag">${diagHtml(text)}</pre>`;
  // Phones wrap long code lines, except in file trees, whose columns only read unbroken.
  const tree = /[├└]──/.test(text) ? " data-nowrap" : "";
  return (
    `<figure class="wl-code md-code"${tree}><div class="wl-code__bar">${title}<span class="wl-code__lang">${escapeHtml(lang || "text")}</span>${copy()}</div>` +
    `<pre class="wl-code__pre"><code>${highlight(text, lang)}</code></pre></figure>`
  );
}

/** A terminal's commands, without prompts and comments: what its copy button copies. */
const commands = (text: string) =>
  text
    .split("\n")
    .map((l) => /^\$ ?(.*?)(\s+#.*)?$/.exec(l)?.[1])
    .filter(Boolean)
    .join("\n");

/** `$ wowlua test  # comment` is a command; other lines are its output, with cargo-style status words and test marks coloured. */
function termLine(line: string): string {
  const cmd = /^\$ ?(.*?)(\s+#.*)?$/.exec(line);
  if (cmd) {
    const comment = cmd[2] ? `<span class="wl-term__comment">${escapeHtml(cmd[2])}</span>` : "";
    return `<span class="wl-term__prompt">$</span> <span class="wl-term__cmd">${escapeHtml(cmd[1])}</span>${comment}`;
  }
  const out = escapeHtml(line)
    .replace(/^(\s*)(FAIL|✗|error(?:\[\w+\])?:?)(?=\s|$)/, '$1<span class="wl-term__err">$2</span>')
    .replace(/^(\s*)(PASS|✓|[A-Z][a-z]+)(?=\s)/, (m, sp, w) => (/^[A-Z][a-z]+$/.test(w) && sp.length < 2 ? m : `${sp}<span class="wl-term__ok">${w}</span>`));
  return `<span class="wl-term__out">${out}</span>`;
}

/**
 * An ordered list whose every item is `**Title**`, a sentence and an inline `command`: numbered steps. Any other
 * ordered list stays a list.
 */
function stepsOf(ol: Element): string | null {
  const items = ol.children.filter((c): c is Element => c.type === "element" && c.tagName === "li");
  if (!items.length) return null;
  const parts = items.map((li) => {
    // A loose list wraps the item's content in a paragraph.
    const inline = li.children.length === 1 && (li.children[0] as Element).tagName === "p" ? (li.children[0] as Element).children : li.children;
    const kids = inline.filter((c) => !(c.type === "text" && !c.value.trim()));
    const first = kids[0] as Element | undefined;
    const last = kids.at(-1) as Element | undefined;
    if (!first || first.type !== "element" || first.tagName !== "strong") return null;
    if (!last || last.type !== "element" || last.tagName !== "code" || kids.length < 3) return null;
    const middle = kids.slice(1, -1);
    const html = middle
      .map((c) => (c.type === "text" ? escapeHtml(c.value) : c.type === "element" && c.tagName === "code" ? `<code class="wl-icode">${escapeHtml(toString(c))}</code>` : escapeHtml(toString(c as Element))))
      .join("")
      .replace(/^[\s—:.-]+/, "")
      .replace(/[\s:]+$/, "");
    return { title: toString(first), text: html, cmd: toString(last) };
  });
  if (parts.some((p) => !p)) return null;
  return (
    `<ol class="wl-steps md-steps">` +
    parts
      .map(
        (p) =>
          `<li class="wl-steps__item"><h3 class="wl-steps__title">${escapeHtml(p!.title)}</h3><p class="wl-steps__text">${p!.text}</p>` +
          `<div class="wl-steps__cmd"><code><span class="wl-term__prompt">$</span>${escapeHtml(p!.cmd)}</code>${copy(p!.cmd)}</div></li>`,
      )
      .join("") +
    `</ol>`
  );
}

/** At most ~160 characters, ending at a sentence or word boundary. */
function summarize(text: string): string {
  if (text.length <= 160) return text;
  const cut = text.slice(0, 160);
  const sentence = cut.lastIndexOf(". ");
  return sentence > 80 ? cut.slice(0, sentence + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
}

function stripMarker(node: Element) {
  const t = node.children.find((c) => c.type === "text");
  if (t && t.type === "text") t.value = t.value.replace(/^\s*\[!\w+\]\s*/, "");
  // The line break after the marker.
  if (node.children[1]?.type === "element" && (node.children[1] as Element).tagName === "br") node.children.splice(1, 1);
}

function rewriteHref(ctx: Ctx, href: string): string {
  if (!href || href.startsWith("#") || href.startsWith("/") || /^[a-z]+:/i.test(href)) return href;
  const [file, hash] = href.split("#");
  const repoPath = path.posix.normalize(path.posix.join(path.posix.dirname(ctx.repoPath), file));
  if (repoPath.startsWith("..")) return href;
  const site = file.endsWith(".md") ? hrefForRepoPath(ctx.version, repoPath) : null;
  const url = site ?? githubUrl(ctx.version, repoPath, !/\.\w+$/.test(file));
  return hash ? `${url}#${hash}` : url;
}

export async function renderMarkdown(source: string, ctx: Ctx): Promise<Rendered> {
  const out = { title: null as string | null, description: "", toc: [] as TocEntry[] };
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(() => rehypeDesign(ctx, out))
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(source);
  return { html: String(file), ...out };
}


/** A repo file rendered once per build, however many times a route asks for it. */
export const renderRepoFile = cache(async (version: string, repoPath: string): Promise<Rendered | null> => {
  const md = readRepoFile(version, repoPath);
  return md === null ? null : renderMarkdown(md, { version, repoPath });
});
