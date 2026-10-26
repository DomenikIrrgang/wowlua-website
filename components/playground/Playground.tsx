"use client";

// The playground (the "Playground" artboard of the wowlua.dev design): main.wowlua in an editor, and what wowlua makes
// of it in four tabs: the compiled Lua, the problems, what a run printed, and the addon running in the game with
// Blizzard's UI. wowlua runs in Web Workers (@wowlua/web); the editor and the workers load after the page, from this
// route only (editor.ts, wowlua.ts).
import type { Built, Connection, Diagnostic, Output, RunSettings, Started } from "@wowlua/web/client";
import { useEffect, useRef, useState } from "react";
import { diagHtml } from "@/lib/diag";
import type { Example } from "@/lib/playground";
import { type Opened, type Source, remember, remembered } from "./installation";
import { diagnosticText } from "./problems";
import { DEFAULT_SETTINGS, MINIFY, PROFILE, type Settings, buildDefaults, manifestText, settingsOf } from "./settings";
import { highlightLines } from "./tokens";

type Tab = "lua" | "problems" | "output" | "game";
type Problems = { html: string; errors: number; warnings: number };
type Lua = { file: string; html: string; failed: number };
type Ran = { running: boolean; html: string; ms?: number };
/** The user's WoW installation for the game tab (installation.ts). */
type Install =
  | { state: "none" | "reading" }
  | { state: "using"; opened: Opened }
  | { state: "failed"; message: string };

type Game = {
  phase: "idle" | "loading" | "ui" | "starting" | "running" | "stopped" | "failed";
  done: number;
  total: number;
  backend?: string;
  message?: string;
};

const MAIN = "src/main.wowlua";
const MANIFEST_URI = "file:///playground/wowlua.json";
const TABS: Tab[] = ["lua", "problems", "output", "game"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const numbered = (lines: string[]) => lines.map((l, i) => `<span class="pg-ln">${i + 1}</span>${l}`).join("\n");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** The addon's paths as the user knows them. */
const shown = (s: string) => s.replace(/Interface\/AddOns\/Playground\/src\/main\.lua/g, "main.lua").replace(/\bsrc\/main\.wowlua\b/g, "main.wowlua");
/** An example's hint: `code` and **bold**. */
const hintHtml = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code class="wl-icode">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");

const MINIFY_SAYS: Record<Settings["minify"], string | null> = {
  none: null,
  strip: "comments and indentation stripped",
  compact: "only the spaces Lua needs",
  rename: "local names shortened",
  max: "every pass, private names and repeated strings too",
};

function luaCaption(s: Settings, lua: Lua | null): string {
  const name = lua?.file ? lua.file.split("/").pop() : "main.lua";
  const head = `${name} · Lua 5.1 · ${s.build} build, minify ${s.minify}`;
  if (lua?.failed) return `${head}: did not build, ${plural(lua.failed, "error")} (see problems). This is the last build that worked.`;
  const says = s.build === "dev" ? ["each line stays on its line", "functions get the profiler"] : ["bundled into one file", "no debugging code"];
  if (MINIFY_SAYS[s.minify]) says.push(MINIFY_SAYS[s.minify]!);
  if (s.inline) says.push("small functions inlined");
  if (s.cacheGlobals) says.push("globals cached in locals");
  if (s.deadCode) says.push("unused code removed");
  const plain = s.build === "dev" && s.minify === "none" && !s.inline && !s.cacheGlobals && !s.deadCode;
  return `${head}: ${says.join(", ")}.${plain ? " Switch to release and a minify level to see the shipped code." : ""}`;
}

function gameCaption(g: Game): string {
  const files = g.total ? `${g.done.toLocaleString("en")} of ${g.total.toLocaleString("en")} files` : "";
  switch (g.phase) {
    case "idle":
    case "loading":
      return "starting wowlua in your browser…";
    case "ui":
      return `loading Blizzard's UI${files ? ` · ${files}` : "…"}`;
    case "starting":
      return "starting main.wowlua…";
    case "running":
      return g.done < g.total
        ? `running main.wowlua with Blizzard's UI · ${files}, the rest loads meanwhile`
        : `running main.wowlua in the emulated client with Blizzard's UI${g.backend ? ` · drawn with ${g.backend === "Gl" ? "WebGL 2" : "WebGPU"}` : ""} · click and type in the game`;
    case "stopped":
      return "stopped · run starts main.wowlua again";
    case "failed":
      return g.message ?? "the game did not start";
  }
}

export function Playground({ examples }: { examples: Example[] }) {
  const [exampleId, setExampleId] = useState(examples[0]?.id ?? "");
  const [fromLink, setFromLink] = useState(false);
  const [placeholder, setPlaceholder] = useState(examples[0]?.code ?? "");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>("lua");
  const [version, setVersion] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [problems, setProblems] = useState<Problems | null>(null);
  const [lua, setLua] = useState<Lua | null>(null);
  const [ran, setRan] = useState<Ran | null>(null);
  const [game, setGame] = useState<Game>({ phase: "idle", done: 0, total: 0 });
  const [shared, setShared] = useState<"idle" | "copied" | "failed">("idle");
  const [install, setInstall] = useState<Install>(() => {
    const r = remembered();
    return r ? { state: "using", opened: r.opened } : { state: "none" };
  });

  const wowluaRef = useRef<Connection | null>(null);
  const editorRef = useRef<{ setText(text: string): void; sync(): void; destroy(): void } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameBoxRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Connection | null>(null);
  const uiReadyRef = useRef(false);
  const pendingInstallRef = useRef<Source | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef(examples[0]?.code ?? "");
  const templateRef = useRef("{}");
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const tabRef = useRef<Tab>("lua");
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hashRef = useRef("");
  const actions = useRef({ compile: async () => {}, run: async () => {}, open: async (_hash: string) => false });

  const fail = (e: unknown) => setFailure(String((e as Error)?.message ?? e));

  /** main.wowlua into the package, and the editor's changes to the language server, whose copy wowlua compiles. */
  const flush = (wowlua: Connection) => {
    editorRef.current?.sync();
    return wowlua.call("writeFile", MAIN, codeRef.current);
  };

  /** Writes main.wowlua, then checks and builds it with the toolbar's profile. */
  const compile = async () => {
    const wowlua = wowluaRef.current;
    if (!wowlua) return;
    clearTimeout(timerRef.current);
    const seq = ++seqRef.current;
    const code = codeRef.current;
    try {
      await flush(wowlua);
      const diagnostics: Diagnostic[] = await wowlua.call("check");
      const built: Built = await wowlua.call("build", PROFILE);
      if (seq !== seqRef.current) return;
      const errors = diagnostics.filter((d) => d.severity === "error").length;
      const warnings = diagnostics.filter((d) => d.severity === "warning").length;
      setProblems({ html: diagHtml(diagnostics.map((d) => diagnosticText(d, code)).join("\n\n")), errors, warnings });
      // main.lua in a dev build, the one bundled file in a release build
      const file = built.files.find((f) => f.path === "src/main.lua") ?? built.files.find((f) => /^[^/]+\.lua$/.test(f.path));
      if (built.ok && file && "text" in file) setLua({ file: file.path, html: numbered(highlightLines(file.text.replace(/\n$/, ""))), failed: 0 });
      else setLua((l) => ({ file: l?.file ?? "", html: l?.html ?? "", failed: Math.max(1, built.diagnostics.filter((d) => d.severity === "error").length) }));
    } catch (e) {
      fail(e);
    }
  };

  const writeManifest = async (s: Settings) => {
    const wowlua = wowluaRef.current;
    if (!wowlua) return;
    await wowlua.call("writeFile", "wowlua.json", manifestText(templateRef.current, s));
    // (the language server checks with the manifest's mode too)
    wowlua.lsp.send({ jsonrpc: "2.0", method: "workspace/didChangeWatchedFiles", params: { changes: [{ uri: MANIFEST_URI, type: 2 }] } });
  };

  const change = (patch: Partial<Settings>) => {
    const s = { ...settingsRef.current, ...(patch.build ? buildDefaults(patch.build) : {}), ...patch };
    settingsRef.current = s;
    setSettings(s);
    writeManifest(s).then(compile, fail);
  };

  /** Runs main.wowlua without Blizzard's UI: what it prints while it loads and logs in. */
  const runOutput = async () => {
    const wowlua = wowluaRef.current;
    if (!wowlua) return;
    setRan((r) => ({ html: r?.html ?? "", ms: r?.ms, running: true }));
    try {
      await flush(wowlua);
      const t0 = performance.now();
      const started: Started = await wowlua.call("run", { flavor: "camelot" });
      let printed: Output[] = [];
      if (started.ok) {
        try {
          printed = await wowlua.call("world", "");
        } finally {
          await wowlua.call("stop").catch(() => {});
        }
      }
      const ms = performance.now() - t0;
      const lines = printed.map((o) =>
        o.kind === "error" ? `<span class="pg-err">${esc(shown(o.text))}</span>${o.stack ? `\n<span class="pg-faint">${esc(shown(o.stack))}</span>` : ""}` : esc(o.text),
      );
      if (!started.ok) {
        const errors = started.diagnostics.filter((d) => d.severity === "error").length;
        lines.push(`<span class="pg-err">${esc(started.error ? shown(started.error) : `did not build: ${plural(errors, "error")}, see problems`)}</span>`);
      } else if (!printed.length) lines.push('<span class="pg-faint">(it printed nothing)</span>');
      setRan({ running: false, html: lines.join("\n"), ms });
    } catch (e) {
      setRan({ running: false, html: `<span class="pg-err">${esc(String((e as Error)?.message ?? e))}</span>` });
    }
  };

  /**
   * Draws the addon in the game: the second worker, the user's installation, Blizzard's UI, the canvas. Only once the
   * game tab is open and the user chose their WoW folder: without it the game would draw placeholder art.
   */
  const openGame = async () => {
    if (gameRef.current) return;
    const chosen = pendingInstallRef.current ?? remembered()?.source;
    const canvas = canvasRef.current;
    if (!chosen || !canvas) return;
    pendingInstallRef.current = null;
    setGame({ phase: "loading", done: 0, total: 0 });
    try {
      const { startWowlua } = await import("./wowlua");
      const conn = startWowlua();
      gameRef.current = conn;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(320, Math.round(r.width * dpr));
      canvas.height = Math.round((canvas.width * 9) / 16);
      const backend = await conn.attachCanvas(canvas);
      conn.onProgress((done, total) => setGame((g) => ({ ...g, done, total })));
      setGame((g) => ({ ...g, phase: "ui", backend }));
      if (!(await applyInstallation(chosen))) {
        // the folder was not a WoW installation: the tab asks again
        conn.terminate();
        gameRef.current = null;
        setGame({ phase: "idle", done: 0, total: 0 });
        return;
      }
      await conn.call("loadBlizzardUI", { flavor: "camelot", background: true });
      uiReadyRef.current = true;
      await runGame();
    } catch (e) {
      setGame((g) => ({ ...g, phase: "failed", message: `the game did not start: ${(e as Error)?.message ?? e}` }));
    }
  };

  const runGame = async () => {
    const conn = gameRef.current;
    if (!conn) return openGame();
    setGame((g) => ({ ...g, phase: "starting", message: undefined }));
    try {
      await conn.call("stop").catch(() => {});
      await conn.call("reset", { "wowlua.json": manifestText(templateRef.current, settingsRef.current), [MAIN]: codeRef.current });
      const started: Started = await conn.call("run", { flavor: "camelot", blizzardUI: true });
      const errors = started.diagnostics.filter((d) => d.severity === "error").length;
      setGame((g) => ({
        ...g,
        phase: started.ok ? "running" : "failed",
        message: started.ok ? undefined : started.error ? shown(started.error) : `did not build: ${plural(errors, "error")}, see problems`,
      }));
      if (started.ok) canvasRef.current?.focus({ preventScroll: true });
    } catch (e) {
      setGame((g) => ({ ...g, phase: "failed", message: String((e as Error)?.message ?? e) }));
    }
  };

  /** Gives the game worker the user's installation (starting the game first); a run that is up starts again. */
  const applyInstallation = async (source: Source): Promise<boolean> => {
    const conn = gameRef.current;
    if (!conn) {
      pendingInstallRef.current = source;
      setInstall({ state: "reading" });
      await openGame();
      return true;
    }
    setInstall({ state: "reading" });
    try {
      const opened = await conn.useInstallation(source, { flavor: "camelot" });
      remember(source, opened);
      setInstall({ state: "using", opened });
      if (uiReadyRef.current) await runGame();
      return true;
    } catch (e) {
      setInstall({ state: "failed", message: String((e as Error)?.message ?? e) });
      return false;
    }
  };

  const chooseInstallation = () => folderInputRef.current?.click();

  const stopGame = async () => {
    await gameRef.current?.call("stop").catch(() => {});
    setGame((g) => ({ ...g, phase: "stopped" }));
  };

  const run = async () => {
    if (tabRef.current === "game") return runGame();
    select("output", false);
    return runOutput();
  };

  const select = (t: Tab, autoRun = true) => {
    tabRef.current = t;
    setTab(t);
    if (t === "game") openGame();
    if (t === "output" && autoRun && !ran) runOutput();
  };

  /** Opens a share link's package: its main.wowlua and its toolbar. */
  const open = async (hash: string) => {
    const wowlua = wowluaRef.current;
    if (!wowlua || hash.length < 2) return false;
    const how: RunSettings | null = await wowlua.call("openShared", hash);
    if (!how) return false;
    hashRef.current = hash;
    const files: Record<string, string> = await wowlua.call("files");
    const s = settingsOf(files["wowlua.json"]);
    templateRef.current = files["wowlua.json"] ?? templateRef.current;
    settingsRef.current = s;
    setSettings(s);
    codeRef.current = files[MAIN] ?? "";
    setPlaceholder(codeRef.current);
    editorRef.current?.setText(codeRef.current);
    setFromLink(true);
    setExampleId("");
    setRan(null);
    await writeManifest(s);
    if (how.blizzardUI) select("game");
    return true;
  };

  const pick = (id: string) => {
    const example = examples.find((e) => e.id === id);
    if (!example) return;
    setExampleId(id);
    setFromLink(false);
    setRan(null);
    codeRef.current = example.code;
    setPlaceholder(example.code);
    editorRef.current?.setText(example.code);
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    compile();
  };

  const share = async () => {
    const wowlua = wowluaRef.current;
    if (!wowlua) return;
    try {
      await flush(wowlua);
      const fragment: string = await wowlua.call("share", { flavor: "camelot", ...(tabRef.current === "game" ? { blizzardUI: true } : {}) });
      const hash = `#${fragment.replace(/^#/, "")}`;
      hashRef.current = hash;
      history.replaceState(null, "", hash);
      await navigator.clipboard.writeText(location.href);
      setShared("copied");
    } catch {
      setShared("failed");
    }
    setTimeout(() => setShared("idle"), 2400);
  };

  actions.current = { compile, run, open };

  useEffect(() => {
    let gone = false;
    let wowlua: Connection | null = null;
    (async () => {
      try {
        const [{ startWowlua }, { createEditor }] = await Promise.all([import("./wowlua"), import("./editor")]);
        if (gone) return;
        wowlua = startWowlua();
        wowluaRef.current = wowlua;
        const files: Record<string, string> = await wowlua.call("files");
        templateRef.current = files["wowlua.json"] ?? "{}";
        if (!examples.length) codeRef.current = files[MAIN] ?? "";
        const opened = await actions.current.open(location.hash);
        if (!opened) await wowlua.call("writeFile", "wowlua.json", manifestText(templateRef.current, settingsRef.current));
        await wowlua.call("writeFile", MAIN, codeRef.current);
        const v: string = await wowlua.call("version");
        if (gone || !hostRef.current) return;
        setVersion(v);
        editorRef.current = createEditor(hostRef.current, codeRef.current, wowlua, {
          change(text) {
            codeRef.current = text;
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => actions.current.compile(), 300);
          },
          run: () => void actions.current.run(),
        });
        setEditorReady(true);
        await actions.current.compile();
      } catch (e) {
        if (!gone) fail(e);
      }
    })();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.defaultPrevented) {
        e.preventDefault();
        actions.current.run();
      }
    };
    const onHash = () => {
      if (location.hash !== hashRef.current) actions.current.open(location.hash).then((ok) => (ok ? actions.current.compile() : undefined));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      gone = true;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
      clearTimeout(timerRef.current);
      editorRef.current?.destroy();
      editorRef.current = null;
      wowlua?.terminate();
      wowluaRef.current = null;
      gameRef.current?.terminate();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The game's drawing size follows its box (16:9, at most twice the CSS pixels).
  useEffect(() => {
    const box = gameBoxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const observer = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      if (!gameRef.current || r.width < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width * dpr);
      gameRef.current.resize(w, Math.round((w * 9) / 16));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const example = examples.find((e) => e.id === exampleId);
  const count = problems ? problems.errors + problems.warnings : 0;
  const gameBusy = game.phase === "loading" || game.phase === "ui" || game.phase === "starting";
  const using = install.state === "using" ? install.opened : null;
  const progress = game.total ? Math.round((game.done / game.total) * 100) : 0;

  return (
    <main className="pg" id="main">
      <div className="pg-bar">
        <h1 className="heading-3 pg-title">playground</h1>
        <div className="wl-field pg-field pg-field--example">
          <label className="wl-field__label" htmlFor="pg-example">
            example
          </label>
          <div className="wl-select wl-select--small">
            <select className="wl-select__control" id="pg-example" value={exampleId} onChange={(e) => pick(e.target.value)}>
              {fromLink && <option value="">from the link</option>}
              {!fromLink && !examples.length && <option value="">hello from the playground</option>}
              {examples.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="wl-field pg-field pg-field--mode">
          <label className="wl-field__label" htmlFor="pg-mode">
            checking
          </label>
          <div className="wl-select wl-select--small">
            <select className="wl-select__control" id="pg-mode" value={settings.checking} onChange={(e) => change({ checking: e.target.value as Settings["checking"] })}>
              <option value="basic">basic</option>
              <option value="strict">strict</option>
            </select>
          </div>
        </div>
        <div className="wl-field pg-field pg-field--mode">
          <label className="wl-field__label" htmlFor="pg-profile">
            build
          </label>
          <div className="wl-select wl-select--small">
            <select className="wl-select__control" id="pg-profile" value={settings.build} onChange={(e) => change({ build: e.target.value as Settings["build"] })}>
              <option value="dev">dev</option>
              <option value="release">release</option>
            </select>
          </div>
        </div>
        <div className="wl-field pg-field pg-field--minify">
          <label className="wl-field__label" htmlFor="pg-minify">
            minify
          </label>
          <div className="wl-select wl-select--small">
            <select className="wl-select__control" id="pg-minify" value={settings.minify} onChange={(e) => change({ minify: e.target.value as Settings["minify"] })}>
              {MINIFY.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset className="pg-opts">
          <legend className="wl-field__label">optimize</legend>
          <label className="wl-check pg-check">
            <input className="wl-check__box" type="checkbox" checked={settings.inline} onChange={(e) => change({ inline: e.target.checked })} /> inline
          </label>
          <label className="wl-check pg-check">
            <input className="wl-check__box" type="checkbox" checked={settings.cacheGlobals} onChange={(e) => change({ cacheGlobals: e.target.checked })} /> cache globals
          </label>
          <label className="wl-check pg-check">
            <input className="wl-check__box" type="checkbox" checked={settings.deadCode} onChange={(e) => change({ deadCode: e.target.checked })} /> dead code
          </label>
        </fieldset>
        <div className="pg-actions">
          <span className="caption pg-muted">compiles as you type</span>
          <button className="wl-btn wl-btn--secondary wl-btn--small" type="button" onClick={() => run()} disabled={!version}>
            run <kbd className="wl-kbd">ctrl ↵</kbd>
          </button>
          <button className="wl-btn wl-btn--primary wl-btn--small" type="button" onClick={share} disabled={!version} aria-live="polite">
            {shared === "copied" ? "link copied" : shared === "failed" ? "copy failed" : "share"}
          </button>
        </div>
      </div>

      <div className="pg-panes">
        <section className="pg-src" aria-label="wowlua source">
          <div className="wl-code__bar pg-bar2">
            <span className="wl-code__file">main.wowlua</span>
            <span className="wl-code__lang">wowlua</span>
          </div>
          <div className="pg-editor">
            <div className="pg-editor__host" ref={hostRef} />
            {!editorReady && <pre className="code pg-code pg-code--placeholder" aria-busy="true" dangerouslySetInnerHTML={{ __html: numbered(highlightLines(placeholder)) }} />}
          </div>
        </section>

        <section className="pg-results" aria-label="Results">
          <div role="tablist" aria-label="Results" className="pg-tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className="pg-tab"
                role="tab"
                type="button"
                id={`pg-tab-${t}`}
                aria-controls={`pg-panel-${t}`}
                aria-selected={tab === t}
                onClick={() => select(t)}
              >
                {t}
                {t === "problems" && <span className="wl-tabs__count">{count}</span>}
              </button>
            ))}
          </div>

          <div role="tabpanel" id="pg-panel-lua" aria-labelledby="pg-tab-lua" aria-label="Compiled Lua" className="pg-panel" hidden={tab !== "lua"}>
            <div className="caption pg-cap">{failure ? `wowlua did not load: ${failure}` : lua ? luaCaption(settings, lua) : "compiling main.wowlua…"}</div>
            <pre className={`code pg-code${lua?.failed ? " pg-code--stale" : ""}`} dangerouslySetInnerHTML={{ __html: lua?.html ?? "" }} />
          </div>

          <div role="tabpanel" id="pg-panel-problems" aria-labelledby="pg-tab-problems" aria-label="Problems" className="pg-panel" hidden={tab !== "problems"}>
            {problems && count > 0 ? (
              <pre className="wl-diag pg-diag" dangerouslySetInnerHTML={{ __html: problems.html }} />
            ) : (
              <p className="body-s pg-none">{problems ? "No problems: main.wowlua passes the check." : "checking main.wowlua…"}</p>
            )}
            <p className="body-s pg-hint">
              {example?.hint && <span dangerouslySetInnerHTML={{ __html: hintHtml(example.hint) + " " }} />}
              <a href="/docs/reference/diagnostics">All errors and warnings</a>.
            </p>
          </div>

          <div role="tabpanel" id="pg-panel-output" aria-labelledby="pg-tab-output" aria-label="Output" className="pg-panel" hidden={tab !== "output"}>
            <div className="caption pg-cap">
              {ran?.running
                ? "running main.wowlua…"
                : ran?.ms !== undefined
                  ? `ran main.lua in the emulated client, without Blizzard's UI · ${ran.ms < 10 ? ran.ms.toFixed(1) : Math.round(ran.ms)} ms`
                  : "run (ctrl ↵) runs main.wowlua in the emulated client and shows what it prints"}
            </div>
            <pre className="code pg-code pg-log" dangerouslySetInnerHTML={{ __html: ran?.html ?? "" }} />
          </div>

          <div role="tabpanel" id="pg-panel-game" aria-labelledby="pg-tab-game" aria-label="Game" className="pg-panel" hidden={tab !== "game"}>
            <div className="caption pg-cap pg-cap--game">
              <span className={`pg-cap__text${game.phase === "failed" ? " pg-err" : ""}`}>
                {using ? gameCaption(game) : "the game needs your World of Warcraft folder"}
              </span>
              {using && game.total > 0 && game.done < game.total && (
                <span className="pg-progress" role="progressbar" aria-label="Blizzard's UI" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <i style={{ width: `${progress}%` }} />
                </span>
              )}
              {using && (
                <button className="wl-btn wl-btn--secondary wl-btn--small pg-install" type="button" onClick={chooseInstallation}>
                  use another folder
                </button>
              )}
              {using &&
                (game.phase === "running" ? (
                  <button className="wl-btn wl-btn--secondary wl-btn--small" type="button" onClick={stopGame}>
                    stop
                  </button>
                ) : (
                  <button className="wl-btn wl-btn--secondary wl-btn--small" type="button" onClick={() => runGame()} disabled={gameBusy}>
                    run
                  </button>
                ))}
              {using && (
                <span className="pg-cap__note">
                  drawn with your installation&apos;s art: {using.product} ({using.flavor}, {using.files.toLocaleString("en")} files), read in your browser and never uploaded
                </span>
              )}
            </div>
            <div className="pg-game" ref={gameBoxRef}>
              {!using && (
                <div className="pg-game__ask">
                  <h2 className="heading-3">Choose your World of Warcraft folder</h2>
                  <p className="body-s">
                    The game tab runs main.wowlua in wowlua&apos;s emulated client with Blizzard&apos;s UI, drawn with the art and fonts of your own installation. Choose
                    the folder that holds <code className="wl-icode">Data</code> and the WoW Forever client, <code className="wl-icode">_classic_beta_</code>: on a Mac
                    that is <code className="wl-icode">/Applications/World of Warcraft</code>.
                  </p>
                  <p className="caption">
                    Your browser then asks whether to upload the folder&apos;s files to wowlua.dev. Nothing is uploaded: wowlua reads the files here, in this page, and
                    only while it is open.
                  </p>
                  <button className="wl-btn wl-btn--primary" type="button" onClick={chooseInstallation} disabled={install.state === "reading"}>
                    {install.state === "reading" ? "reading your installation…" : "choose your WoW folder"}
                  </button>
                  {install.state === "failed" && <p className="caption pg-err">{install.message}</p>}
                </div>
              )}
              <div className="pg-game__screen" hidden={!using}>
                <canvas ref={canvasRef} className="pg-canvas" aria-label="The game, with the addon running" tabIndex={0} />
              </div>
            </div>
            <input
              ref={folderInputRef}
              type="file"
              hidden
              multiple
              {...{ webkitdirectory: "" }}
              aria-label="Your World of Warcraft folder"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                if (files.length) applyInstallation(files);
              }}
            />
          </div>
        </section>
      </div>

      <div className="caption pg-status">
        <span>{version ? `wowlua ${version} in your browser` : failure ? "wowlua did not load" : "loading wowlua in your browser…"}</span>
        <span>{settings.checking} checking</span>
        <span>
          {settings.build} build · minify {settings.minify}
        </span>
        <span className={problems?.errors ? "pg-err" : undefined}>{plural(problems?.errors ?? 0, "error")}</span>
        <span className={problems?.warnings ? "pg-warn" : undefined}>{plural(problems?.warnings ?? 0, "warning")}</span>
        <a href="/docs/language/tour" className="pg-status__tour">
          take the language tour →
        </a>
      </div>
    </main>
  );
}
