// Renders the wowlua repository's Markdown with the design system's markup:
// links between repo files become site links, code blocks become .wl-code
// figures, tables .wl-table regions, GitHub alerts .wl-callout boxes.
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
          (parent as Element).children[index] = {
            type: "raw",
            value:
              `<figure class="wl-code md-code"><div class="wl-code__bar"><span class="wl-code__lang">${escapeHtml(lang || "text")}</span>` +
              `<button class="wl-textbtn" type="button" data-copy>copy</button></div>` +
              `<pre class="wl-code__pre"><code>${highlight(text, lang)}</code></pre></figure>`,
          } as unknown as ElementContent;
          return "skip";
        }
        case "table": {
          if (!parent || index === undefined) break;
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
