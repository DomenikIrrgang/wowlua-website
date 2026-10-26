// The playground's wowlua and Lua tokens, coloured as the design's playground: keywords, types, strings, numbers
// (and true, false, nil), comments, decorators, the name after `function`, and operators; brackets, commas and dots
// stay plain. One line at a time with a state for comments and strings that span lines, so CodeMirror's
// StreamLanguage (editor.ts), the lua tab and the page's first render share it. No dependencies.

export type Tok = "k" | "t" | "s" | "n" | "c" | "d" | "f" | "p" | null;

/** What carries over to the next line: an open long comment or string, and the last word. */
export type TokState = { close: string | null; tok: Tok; word: string };

export const startState = (): TokState => ({ close: null, tok: null, word: "" });
export const copyState = (s: TokState): TokState => ({ ...s });

const KEYWORDS = new Set(
  (
    "and break do else elseif end for function goto if in local not or repeat return then until while " +
    "abstract as class const constructor continue declare enum export extends from implements import interface keyof " +
    "new override private protected public readonly self static super type typeof"
  ).split(" "),
);
const ATOMS = new Set(["true", "false", "nil"]);
const TYPES = new Set("any boolean never number string table unknown void thread userdata".split(" "));

const NUMBER = /0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?/y;
const DECORATOR = /@[A-Za-z_][\w.]*/y;
const WORD = /[A-Za-z_]\w*/y;
const OPERATOR = /\.\.\.|\.\.=?|[:=<>~?|&+\-*/%#^]+/y;
const SPACE = /\s+/y;

const at = (re: RegExp, line: string, pos: number) => {
  re.lastIndex = pos;
  const m = re.exec(line);
  return m ? m[0] : null;
};

/** Reads the token at `pos`: its end and colour. Advances at least one character. */
export function readToken(line: string, pos: number, state: TokState): { end: number; tok: Tok } {
  if (state.close !== null) {
    const i = line.indexOf(state.close, pos);
    if (i < 0) return { end: line.length, tok: state.tok };
    const end = i + state.close.length;
    const tok = state.tok;
    state.close = null;
    return { end, tok };
  }
  const space = at(SPACE, line, pos);
  if (space) return { end: pos + space.length, tok: null };
  // (only a name right after `function` is the function's name)
  const prev = state.word;
  state.word = "";
  const long = /^(--)?\[(=*)\[/.exec(line.slice(pos));
  if (long) {
    const tok: Tok = long[1] ? "c" : "s";
    state.close = `]${long[2]}]`;
    state.tok = tok;
    return { end: closeAt(line, pos + long[0].length, state), tok };
  }
  if (line.startsWith("--", pos)) return { end: line.length, tok: "c" };
  const ch = line[pos];
  if (ch === '"' || ch === "'") {
    let i = pos + 1;
    while (i < line.length && line[i] !== ch) i += line[i] === "\\" ? 2 : 1;
    return { end: Math.min(i + 1, line.length), tok: "s" };
  }
  if (ch === "`") {
    const i = line.indexOf("`", pos + 1);
    if (i >= 0) return { end: i + 1, tok: "s" };
    state.close = "`";
    state.tok = "s";
    return { end: line.length, tok: "s" };
  }
  const num = at(NUMBER, line, pos);
  if (num) return { end: pos + num.length, tok: "n" };
  const deco = at(DECORATOR, line, pos);
  if (deco) return { end: pos + deco.length, tok: "d" };
  const word = at(WORD, line, pos);
  if (word) {
    const tok: Tok = KEYWORDS.has(word)
      ? "k"
      : ATOMS.has(word)
        ? "n"
        : TYPES.has(word)
          ? "t"
          : prev === "function"
            ? "f"
            : /^[A-Z]/.test(word)
              ? "t"
              : null;
    state.word = word;
    return { end: pos + word.length, tok };
  }
  const op = at(OPERATOR, line, pos);
  if (op) return { end: pos + op.length, tok: op === "..." ? null : "p" };
  return { end: pos + 1, tok: null };
}

/** The end of a long comment or string opened before `from` (closing it when it ends on this line). */
function closeAt(line: string, from: number, state: TokState): number {
  const i = state.close === null ? -1 : line.indexOf(state.close, from);
  if (i < 0) return line.length;
  const end = i + state.close!.length;
  state.close = null;
  return end;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML for each line of `code`, with the design's tok-* classes. */
export function highlightLines(code: string): string[] {
  const state = startState();
  return code.split("\n").map((line) => {
    let html = "";
    let pos = 0;
    while (pos < line.length) {
      const { end, tok } = readToken(line, pos, state);
      const text = escape(line.slice(pos, end));
      html += tok ? `<span class="tok-${tok}">${text}</span>` : text;
      pos = end;
    }
    return html;
  });
}
