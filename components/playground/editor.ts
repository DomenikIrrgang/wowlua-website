// The playground's editor: CodeMirror 6 on main.wowlua, talking to wowlua's own language server in the worker
// (hover, completion, signature help, diagnostics as squiggles, go to definition with F12 or ctrl/⌘-click).
// Coloured with the site's tok-* classes (tokens.ts), so light and dark follow the design tokens.
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { StreamLanguage, indentUnit, syntaxHighlighting } from "@codemirror/language";
import {
  LSPClient,
  type Transport,
  hoverTooltips,
  jumpToDefinition,
  jumpToDefinitionKeymap,
  serverCompletion,
  serverDiagnostics,
  signatureHelp,
} from "@codemirror/lsp-client";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap, lineNumbers } from "@codemirror/view";
import { tagHighlighter, tags } from "@lezer/highlight";
import type { Connection } from "@wowlua/web/client";
import { type Tok, type TokState, copyState, readToken, startState } from "./tokens";

export const ROOT_URI = "file:///playground";
export const MAIN_URI = `${ROOT_URI}/src/main.wowlua`;

const TOKEN_NAMES: Record<Exclude<Tok, null>, string> = {
  k: "keyword",
  t: "typeName",
  s: "string",
  n: "number",
  c: "comment",
  d: "meta",
  f: "variableName.function",
  p: "operator",
};

/** wowlua as a stream language, with the playground's tokens. */
export const wowluaLanguage = StreamLanguage.define<TokState>({
  name: "wowlua",
  startState,
  copyState,
  token(stream, state) {
    const { end, tok } = readToken(stream.string, stream.pos, state);
    stream.pos = Math.max(end, stream.pos + 1);
    return tok ? TOKEN_NAMES[tok] : null;
  },
  languageData: { commentTokens: { line: "--", block: { open: "--[[", close: "]]" } } },
});

const classes = tagHighlighter([
  { tag: tags.keyword, class: "tok-k" },
  { tag: tags.typeName, class: "tok-t" },
  { tag: tags.string, class: "tok-s" },
  { tag: tags.number, class: "tok-n" },
  { tag: tags.comment, class: "tok-c" },
  { tag: tags.meta, class: "tok-d" },
  { tag: tags.function(tags.variableName), class: "tok-f" },
  { tag: tags.operator, class: "tok-p" },
]);

/** The worker's language server as the client's transport (it takes and gives JSON text). */
function transport(wowlua: Connection): Transport {
  const stops = new Map<(value: string) => void, () => void>();
  return {
    send: (message) => wowlua.lsp.send(JSON.parse(message)),
    subscribe: (handler) => stops.set(handler, wowlua.lsp.onMessage((m) => handler(JSON.stringify(m)))),
    unsubscribe: (handler) => {
      stops.get(handler)?.();
      stops.delete(handler);
    },
  };
}

/**
 * `sync` pushes the editor's pending changes to the language server. Do it before a check, build, run or share:
 * while main.wowlua is open there, @wowlua/web 0.12.0 compiles the server's copy and not what `writeFile` wrote.
 */
export type Editor = { view: EditorView; setText(text: string): void; sync(): void; destroy(): void };

export function createEditor(
  parent: HTMLElement,
  text: string,
  wowlua: Connection,
  on: { change(text: string): void; run(): void },
): Editor {
  const client = new LSPClient({
    rootUri: ROOT_URI,
    highlightLanguage: (name) => (name === "wowlua" || name === "lua" || name === "" ? wowluaLanguage : null),
    extensions: [serverCompletion(), hoverTooltips({ hoverTime: 300 }), serverDiagnostics(), signatureHelp()],
  }).connect(transport(wowlua));
  const run = () => {
    on.run();
    return true;
  };
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        closeBrackets(),
        autocompletion(),
        indentUnit.of("    "),
        EditorState.tabSize.of(4),
        wowluaLanguage,
        syntaxHighlighting(classes),
        keymap.of([
          { key: "Mod-Enter", run },
          { key: "Ctrl-Enter", run },
          ...jumpToDefinitionKeymap,
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...historyKeymap,
          indentWithTab,
          ...defaultKeymap,
        ]),
        client.plugin(MAIN_URI, "wowlua"),
        EditorView.contentAttributes.of({ "aria-label": "main.wowlua", spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
        // Go to definition: ctrl/⌘-click a name.
        EditorView.domEventHandlers({
          mousedown(event, v) {
            if (!(event.metaKey || event.ctrlKey) || event.button !== 0) return false;
            const pos = v.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos === null) return false;
            event.preventDefault();
            v.dispatch({ selection: { anchor: pos } });
            jumpToDefinition(v);
            return true;
          },
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) on.change(u.state.doc.toString());
        }),
      ],
    }),
  });
  return {
    view,
    setText(next) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next }, selection: { anchor: 0 }, scrollIntoView: true });
    },
    sync() {
      client.sync();
    },
    destroy() {
      view.destroy();
      client.disconnect();
    },
  };
}
