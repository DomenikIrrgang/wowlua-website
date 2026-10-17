// Small highlighters for the code in wowlua's docs. They emit the design
// system's syntax classes (tok-k keyword, tok-t type, tok-s string, tok-n
// number, tok-c comment, tok-d decorator, tok-f function name, tok-p punctuation).

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const span = (cls: string, text: string) => `<span class="${cls}">${escapeHtml(text)}</span>`;

const LUA_KEYWORDS = new Set(
  (
    "and break do else elseif end false for function goto if in local nil not or repeat return then true until while " +
    // wowlua additions
    "abstract as class const constructor continue declare enum export extends from implements import interface keyof " +
    "new override private protected public readonly self static super type typeof"
  ).split(" "),
);
const BUILTIN_TYPES = new Set("any boolean never number string table unknown void thread userdata".split(" "));

type Rule = [RegExp, (m: string, prev: string) => string];

function tokenize(code: string, rules: Rule[]): string {
  let out = "";
  let i = 0;
  let prevWord = "";
  outer: while (i < code.length) {
    for (const [re, emit] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m.index === i && m[0].length) {
        out += emit(m[0], prevWord);
        if (/\w/.test(m[0])) prevWord = m[0];
        i += m[0].length;
        continue outer;
      }
    }
    out += escapeHtml(code[i]);
    i++;
  }
  return out;
}

const luaRules: Rule[] = [
  [/--\[(=*)\[[\s\S]*?\]\1\]/y, (m) => span("tok-c", m)],
  [/--[^\n]*/y, (m) => span("tok-c", m)],
  [/\[(=*)\[[\s\S]*?\]\1\]/y, (m) => span("tok-s", m)],
  [/"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?/y, (m) => span("tok-s", m)],
  [/0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?/y, (m) => span("tok-n", m)],
  [/@[A-Za-z_][\w.]*/y, (m) => span("tok-d", m)],
  [
    /[A-Za-z_]\w*/y,
    (m, prev) => {
      if (LUA_KEYWORDS.has(m)) return span("tok-k", m);
      if (BUILTIN_TYPES.has(m)) return span("tok-t", m);
      if (prev === "function") return span("tok-f", m);
      if (/^[A-Z]/.test(m)) return span("tok-t", m);
      return escapeHtml(m);
    },
  ],
  [/\.\.\.|\.\.|[:=<>~?|&+\-*/%#^,;{}()[\]]/y, (m) => span("tok-p", m)],
];

const jsonRules: Rule[] = [
  [/"(?:\\.|[^"\\])*"(?=\s*:)/y, (m) => span("tok-t", m)],
  [/"(?:\\.|[^"\\])*"/y, (m) => span("tok-s", m)],
  [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, (m) => span("tok-n", m)],
  [/\b(?:true|false|null)\b/y, (m) => span("tok-k", m)],
  [/\/\/[^\n]*/y, (m) => span("tok-c", m)],
  [/[{}[\]:,]/y, (m) => span("tok-p", m)],
];

const shellRules: Rule[] = [
  [/#[^\n]*/y, (m) => span("tok-c", m)],
  [/"(?:\\.|[^"\\])*"|'[^']*'/y, (m) => span("tok-s", m)],
  [/(?<=\s)--?[A-Za-z][\w-]*/y, (m) => span("tok-t", m)],
  [/[|&;><]/y, (m) => span("tok-p", m)],
];

const xmlRules: Rule[] = [
  [/<!--[\s\S]*?-->/y, (m) => span("tok-c", m)],
  [/"[^"]*"/y, (m) => span("tok-s", m)],
  [/<\/?[\w:.-]+|\/?>/y, (m) => span("tok-k", m)],
];

const yamlRules: Rule[] = [
  [/#[^\n]*/y, (m) => span("tok-c", m)],
  [/[\w.-]+(?=:)/y, (m) => span("tok-t", m)],
  [/"(?:\\.|[^"\\])*"|'[^']*'/y, (m) => span("tok-s", m)],
];

const ebnfRules: Rule[] = [
  [/\(\*[\s\S]*?\*\)/y, (m) => span("tok-c", m)],
  [/"[^"]*"|'[^']*'/y, (m) => span("tok-s", m)],
  [/::=|[=|;,{}()[\]?*+]/y, (m) => span("tok-p", m)],
];

/** Compiler and terminal output: diagnostics get the wl-diag colours. */
function highlightOutput(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      const m = /^(error|warning|note|help)(\[[A-Z]\d{4}\])?(:.*)$/.exec(line);
      if (m) {
        const cls = m[1] === "error" ? "wl-diag__error" : m[1] === "warning" ? "wl-diag__warning" : "wl-diag__help";
        return span(cls, m[1] + (m[2] ?? "")) + span("wl-diag__msg", m[3]);
      }
      const g = /^(\s*(?:\d+\s*)?[│┌└─|]+)(.*)$/.exec(line);
      if (g && /[│┌]/.test(g[1])) return span("wl-diag__gutter", g[1]) + escapeHtml(g[2]);
      const p = /^(\$ )(.*)$/.exec(line);
      if (p) return span("wl-term__prompt", "$") + " " + escapeHtml(p[2]);
      return escapeHtml(line);
    })
    .join("\n");
}

const LANGS: Record<string, Rule[] | "output"> = {
  wowlua: luaRules,
  lua: luaRules,
  json: jsonRules,
  jsonc: jsonRules,
  sh: shellRules,
  bash: shellRules,
  shell: shellRules,
  console: "output",
  powershell: shellRules,
  ps1: shellRules,
  xml: xmlRules,
  yaml: yamlRules,
  yml: yamlRules,
  ebnf: ebnfRules,
  text: "output",
  "": "output",
};

/** HTML for a code block's lines (each line wrapped for the design's line styles). */
export function highlight(code: string, lang: string): string {
  const rules = LANGS[lang.toLowerCase()] ?? "output";
  const html = rules === "output" ? highlightOutput(code) : tokenize(code, rules);
  // Spans never cross lines except comments and long strings; close and reopen them per line.
  return splitLines(html)
    // An empty block line would collapse; a space keeps its height.
    .map((l) => `<span class="wl-code__line">${l.replace(/<[^>]+>/g, "") === "" ? l + " " : l}</span>`)
    .join("");
}

function splitLines(html: string): string[] {
  const lines: string[] = [];
  let open: string[] = [];
  let cur = "";
  const re = /(<span [^>]*>)|(<\/span>)|(\n)|([^<\n]+|<)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1]) {
      open.push(m[1]);
      cur += m[1];
    } else if (m[2]) {
      open.pop();
      cur += m[2];
    } else if (m[3]) {
      lines.push(cur + "</span>".repeat(open.length));
      cur = open.join("");
    } else cur += m[4];
  }
  lines.push(cur + "</span>".repeat(open.length));
  open = [];
  return lines;
}
