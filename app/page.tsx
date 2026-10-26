import Link from "next/link";
import { ApiSearchMock } from "@/components/landing/ApiSearchMock";
import { DebugMock } from "@/components/landing/DebugMock";
import { DevWindowMock } from "@/components/landing/DevWindowMock";
import { EditorMock } from "@/components/landing/EditorMock";
import { Terminal, type TermLine } from "@/components/landing/Terminal";
import { JsonLd, SITE } from "@/components/JsonLd";
import { DISCORD_URL, REPO_URL, findPage, latestRelease } from "@/lib/content";
import { highlight } from "@/lib/highlight";
import { inlineMd } from "@/lib/inline";
import { adoptionChecked, bringYourAddon, debugging, installCommands, intro, quickStart, stdlibModules } from "@/lib/readme";

const docsLink = (slug: string, fallback = "/docs") => (findPage("main", slug.split("/")) ? `/docs/${slug}` : fallback);

// The samples below were recorded from wowlua 0.12.0 in a scratch package:
// `wowlua check` printed BAGS_DIAG for BAGS_SRC, `wowlua build` emitted
// SUGAR_OUT for SUGAR_SRC (the lines of a function body, dev profile),
// STD_AFTER builds with LedgerDB and LedgerDBPerChar in the manifest's saved
// variables, WOWLUA_JSON builds as it is, and TEST_SRC (with the window it
// tests, camelot, `test.blizzard-ui` on) printed TEST_RUN.
const BAGS_SRC = `export function freeSlots(): number
    local free = 0
    for bag = 0, NUM_BAG_SLOTS do
        free += C_Container.GetContainerNumFreeSlots("bag" .. bag)
    end
    return free
end`;

const BAGS_DIAG = `error[E2001]: \`string\` is not assignable to \`number\`
  ┌─ src/bags.wowlua:4:54
  │
4 │         free += C_Container.GetContainerNumFreeSlots("bag" .. bag)
  │                                                      ^^^^^^^^^^^^ here

error: aborting due to 1 previous error`;

const STD_BEFORE = `local f = CreateFrame("Frame")
f:RegisterEvent("ADDON_LOADED")
f:RegisterEvent("PLAYER_MONEY")
f:SetScript("OnEvent", function(self, event, name)
    if event == "ADDON_LOADED" and name == "Ledger" then
        LedgerDB = LedgerDB or { }
        if LedgerDB.gold == nil then LedgerDB.gold = 0 end
    elseif event == "PLAYER_MONEY" then
        LedgerDB.gold = GetMoney()
    end
end)

SLASH_LEDGER1 = "/ledger"
SlashCmdList.LEDGER = function()
    print("Ledger: " .. GetCoinTextureString(LedgerDB.gold))
end`;

const STD_AFTER = `import event from "wowlua:events"
import slash from "wowlua:slash"
import print from "wowlua:log"
import * as saved from "wowlua:saved"

local db = saved.bind("LedgerDB", {
    version = 1,
    defaults = { gold = 0 },
    profiles = true,
})

@event("PLAYER_MONEY")
local function onMoney()
    db.gold = GetMoney()
end

@slash("/ledger")
local function show()
    print(GetCoinTextureString(db.gold))
end`;

// Modules shown as badges, with the docs page each links to.
const STD_BADGES: [string, string][] = [
  ["wowlua:events", "stdlib/events"],
  ["wowlua:saved", "stdlib/saved"],
  ["wowlua:slash", "stdlib/slash"],
  ["wowlua:timer", "stdlib/timers"],
  ["wowlua:settings", "stdlib/settings"],
  ["wowlua:launcher", "stdlib/settings"],
  ["wowlua:bindings", "stdlib/settings"],
  ["wowlua:locale", "stdlib/locale"],
  ["wowlua:comm", "stdlib/comm"],
  ["wowlua:aura", "stdlib/game"],
  ["wowlua:combat", "stdlib/combat"],
];

const TEST_SRC = `import test, expect from "wowlua:test"
import * as mock from "wowlua:mock"

@test("/ledger opens the window and reset clears the session")
local function resets()
    mock.slash("/ledger")
    expect(GoldLedgerWindow).toBeShown()
    mock.click(GoldLedgerWindow.reset)
    expect(GoldLedgerWindow.session).toHaveText("+0g")
    expect(GoldLedgerWindow).toMatchScreenshot()
end`;

// The file's second test, a `mock.reloadUI()` round trip, is left out of TEST_SRC.
const TEST_RUN: TermLine[] = [
  { cmd: "wowlua test" },
  { out: " PASS tests/window.test.wowlua (camelot, 3.56s)" },
  { out: "   ✓ /ledger opens the window and reset clears the session" },
  { out: "   ✓ the session survives a /reload" },
  { out: "      Tested 2 passed, 0 failed, 0 skipped (1 file) in 3.67s" },
];

const SUGAR_SRC = `kills += 1
label = \`{kills} kills\``;

const SUGAR_OUT = `kills = kills + 1
label = tostring(kills) .. " kills"`;

const WOWLUA_JSON = `{
  "package": {
    "name": "gold-ledger",
    "version": "1.2.0"
  },
  "addon": { "title": "Gold Ledger" },
  "flavors": {
    "standard": {},
    "camelot": {}
  }
}`;

// `wowlua new` and the start of `wowlua dev`, recorded with WOWLUA_WOW_PATH set
// to a scratch folder; the Installed line shows the macOS default instead.
const CTA_RUN: TermLine[] = [
  { cmd: "wowlua new GoldLedger && cd GoldLedger" },
  { out: "     Created addon package in GoldLedger" },
  { cmd: "wowlua dev" },
  { out: "       Built GoldLedger 0.1.0-dev (dev: standard) in 0.08s" },
  { out: "   Installed /Applications/World of Warcraft/_retail_/Interface/AddOns/GoldLedger" },
  { out: "       Ready type /reload in game to load the changes" },
];

/** A compiler diagnostic in the design's wl-diag colours: the headline, the gutter, the carets. */
function Diag({ text }: { text: string }) {
  return (
    <pre className="wl-diag" style={{ margin: 0 }}>
      {text.split("\n").map((line, i) => {
        const end = i < text.split("\n").length - 1 ? "\n" : "";
        const head = /^(error|warning)(\[[A-Z]\d{4}\])?(:.*)$/.exec(line);
        if (head)
          return (
            <span key={i}>
              <span className={`wl-diag__${head[1]}`}>{head[1] + (head[2] ?? "")}</span>
              <span className="wl-diag__msg">{head[3]}</span>
              {end}
            </span>
          );
        const g = /^(\s*\d*\s*[│┌─]+)(.*)$/.exec(line);
        if (!g) return <span key={i}>{line + end}</span>;
        const caret = /^(\s*)(\^+.*)$/.exec(g[2]);
        return (
          <span key={i}>
            <span className="wl-diag__gutter">{g[1]}</span>
            {caret ? (
              <>
                {caret[1]}
                <span className="wl-diag__error">{caret[2]}</span>
              </>
            ) : (
              g[2]
            )}
            {end}
          </span>
        );
      })}
    </pre>
  );
}

function Code({ file, lang, code, hl = lang }: { file: string; lang?: string; code: string; hl?: string }) {
  return (
    <figure className="wl-code" style={{ margin: 0 }}>
      <div className="wl-code__bar">
        <span className="wl-code__file">{file}</span>
        {lang && <span className="wl-code__lang">{lang}</span>}
      </div>
      <pre className="wl-code__pre">
        <code dangerouslySetInnerHTML={{ __html: highlight(code, hl ?? "wowlua") }} />
      </pre>
    </figure>
  );
}

const Kicker = ({ children }: { children: string }) => (
  <span className="label" style={{ color: "var(--amber-ink)" }}>
    [ {children} ]
  </span>
);

/** A list of short claims, each after an amber arrow. Items are HTML. */
function Arrows({ items }: { items: string[] }) {
  return (
    <ul className="landing-arrows">
      {items.map((d) => (
        <li key={d}>
          <span style={{ color: "var(--amber-ink)" }}>→</span> <span dangerouslySetInnerHTML={{ __html: d }} />
        </li>
      ))}
    </ul>
  );
}

const More = ({ href, children }: { href: string; children: string }) => (
  <Link className="landing-more" href={href}>
    {children} →
  </Link>
);

export default function Home() {
  const latest = latestRelease();
  const commands = installCommands();
  const unix = commands.find((c) => c.id === "unix");
  const windows = commands.find((c) => c.id === "windows");
  const checked = adoptionChecked();
  const modules = stdlibModules();
  const badges = modules.length ? STD_BADGES.filter(([m]) => modules.includes(m)) : STD_BADGES;
  const ship = quickStart().filter((c) => /^wowlua (build|publish)\b/.test(c.cmd));
  const startHref = docsLink("guide/getting-started");
  const adoptHref = docsLink("guide/adopting");

  return (
    <main id="main" className="landing">
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "WebSite", name: "wowlua", url: SITE },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "wowlua",
            description: intro().replace(/\*\*/g, ""),
            url: SITE,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "macOS, Linux, Windows",
            ...(latest ? { softwareVersion: latest.tag.replace(/^v/, ""), releaseNotes: `${SITE}/changelog` } : {}),
            downloadUrl: `${REPO_URL()}/releases/latest`,
            license: "https://opensource.org/licenses/MIT",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            sameAs: [REPO_URL()],
          },
        ]}
      />

      <section className="landing-sec landing-row landing-hero" aria-labelledby="hero">
        <div className="landing-col" style={{ flex: "1 1 460px", gap: 24 }}>
          <p className="landing-hero__meta">
            {latest && <span style={{ color: "var(--amber-ink)", fontWeight: 600 }}>{latest.tag}</span>}
            {latest ? " · " : ""}for World of Warcraft addon developers · macOS, Linux, Windows · MIT
          </p>
          <h1 id="hero" className="display-xl" style={{ margin: 0 }}>
            Addons that work before you /reload
            <span className="wl-caret" aria-hidden="true" />
          </h1>
          <p
            className="body-l"
            style={{ margin: 0, maxWidth: "56ch", color: "var(--ink-muted)" }}
            dangerouslySetInnerHTML={{ __html: inlineMd(intro().replace(/^\*\*wowlua\*\* is /, "wowlua is ")) }}
          />
          <div className="landing-actions">
            <Link className="wl-btn wl-btn--primary" href={startHref}>
              get started
            </Link>
            <Link className="wl-btn wl-btn--secondary" href={adoptHref}>
              bring your addon
            </Link>
            <More href={docsLink("language/tour")}>take the language tour</More>
          </div>
          {unix && (
            <div className="wl-copy-cmd" style={{ maxWidth: 640 }}>
              <span className="wl-copy-cmd__prompt" aria-hidden="true">
                $
              </span>
              <code className="wl-copy-cmd__text">{unix.command}</code>
              <button className="wl-copy-cmd__btn" type="button" aria-label="copy install command" data-copy={unix.command}>
                copy
              </button>
            </div>
          )}
          <p className="caption" style={{ margin: "-12px 0 0", color: "var(--ink-muted)" }}>
            {windows && (
              <>
                Windows: <code className="wl-icode">{windows.command.replace(/https?:\/\/\S+\/(?=[^/\s]+\.ps1)/, "…/")}</code> ·{" "}
              </>
            )}
            <Link href={docsLink("guide/install")}>all install options</Link>
          </p>
        </div>
        <EditorMock />
      </section>

      <section className="landing-sec" style={{ paddingTop: 72 }} aria-labelledby="proof">
        <div className="landing-proof">
          <h2 id="proof" className="label" style={{ margin: 0, color: "var(--ink-muted)", flex: "0 0 auto" }}>
            bring an existing addon
          </h2>
          <p className="landing-proof__items">
            <span>every Lua file is valid wowlua</span>
            <span>.pkgmeta projects adopt in one command</span>
            <span>builds match the packager&apos;s{checked ? ` on ${checked} real addons` : ""}</span>
          </p>
        </div>
      </section>

      <section className="landing-sec landing-row" aria-labelledby="check">
        <div className="landing-col" style={{ flex: "1 1 360px" }}>
          <Kicker>checked</Kicker>
          <h2 id="check" className="display-l" style={{ margin: 0 }}>
            Catch bugs before the game does
          </h2>
          <p className="body" style={{ margin: 0, color: "var(--ink-muted)" }}>
            The checker knows the whole WoW API of the client you build for, generated from Blizzard&apos;s documentation, plus your own types. Typos, wrong arguments,
            accidental globals and, in strict mode, possible nils show up in your editor and terminal instead of in an error popup.
          </p>
          <Arrows
            items={[
              "every API function, widget method and event payload typed",
              "secret values checked as you type, not discovered in a boss fight",
              'plain <code class="wl-icode">.lua</code> files only get warnings, so nothing breaks while you adopt',
              "gradual types: annotate what you want, inference does the rest",
            ]}
          />
          <More href={docsLink("language/types")}>how types work</More>
        </div>
        <div className="landing-col" style={{ flex: "1 1 560px", gap: 12 }}>
          <Code file="src/bags.wowlua" lang="wowlua" code={BAGS_SRC} />
          <Diag text={BAGS_DIAG} />
        </div>
      </section>

      <section className="landing-sec landing-stack" aria-labelledby="std">
        <div className="landing-split">
          <div className="landing-col" style={{ flex: "1 1 420px" }}>
            <Kicker>standard library</Kicker>
            <h2 id="std" className="display-l" style={{ margin: 0 }}>
              The boring parts, already written
            </h2>
          </div>
          <p className="body" style={{ flex: "1 1 420px", minWidth: 0, margin: 0, color: "var(--ink-muted)" }}>
            Events, saved variables, slash commands, timers, an options page, a minimap button, keybindings and addon messages, without embedding third-party libraries.
            Decorators are wired up at compile time, every handler is typed against the event&apos;s payload, and only the modules you import end up in your addon.
          </p>
        </div>
        <div className="wl-compare">
          <Code file="before · plain Lua" lang="lua" code={STD_BEFORE} />
          <div className="wl-compare__arrow" aria-hidden="true">
            <b>→</b>with wowlua
          </div>
          <Code file="after · src/main.wowlua" lang="wowlua" code={STD_AFTER} />
        </div>
        <ul className="landing-badges" aria-label="Some of the standard library's modules">
          {badges.map(([m, slug]) => (
            <li key={m}>
              <Link className="wl-badge" href={docsLink(slug)}>
                {m}
              </Link>
            </li>
          ))}
          <li>
            <Link className="wl-badge" href={docsLink("stdlib/overview")}>
              {modules.length > badges.length ? `and ${modules.length - badges.length} more →` : "every module →"}
            </Link>
          </li>
        </ul>
      </section>

      <section className="landing-sec landing-stack" aria-labelledby="vscode">
        <div className="landing-split">
          <div className="landing-col" style={{ flex: "1 1 420px" }}>
            <Kicker>vs code</Kicker>
            <h2 id="vscode" className="display-l" style={{ margin: 0 }}>
              Debug your addon next to the game&apos;s screen
            </h2>
          </div>
          <p className="body" style={{ flex: "1 1 420px", minWidth: 0, margin: 0, color: "var(--ink-muted)" }}>
            The wowlua extension runs your addon in an emulated WoW client and shows the UI beside your code, drawn with your own installation&apos;s textures and fonts. Set
            a breakpoint on <code className="wl-icode">PLAYER_LOGIN</code> or a button&apos;s <code className="wl-icode">OnClick</code>, click in the picture, and step through
            what happens.
          </p>
        </div>
        <figure style={{ margin: 0, display: "grid", gap: 10 }}>
          <DebugMock />
          <figcaption className="caption" style={{ color: "var(--ink-muted)" }}>
            An addon paused in an <code className="wl-icode">@onLogin</code> handler. Left: its upvalues, the call stack back to{" "}
            <code className="wl-icode">event PLAYER_LOGIN</code>, and breakpoints for taint and blocked protected actions. Right: the game&apos;s screen at that stop.
          </figcaption>
        </figure>
        <ul className="landing-tiles">
          <li className="landing-tile">
            <h3 className="heading-3">Errors as you type</h3>
            <p className="body-s">The language server checks your unsaved edits a moment after you stop typing, against the API of every flavor you build for.</p>
          </li>
          <li className="landing-tile">
            <h3 className="heading-3">The API explained on hover</h3>
            <p className="body-s">
              Every game function shows what it does, its parameters and a link to its warcraft.wiki.gg page. The <Link href={"/api"}>API reference</Link> has
              the same text.
            </p>
          </li>
          <li className="landing-tile">
            <h3 className="heading-3">Rename and find references</h3>
            <p className="body-s">
              F2 renames a method across files and packages, or tells you why it can&apos;t. Find All References finds <code className="wl-icode">self.</code> fields too.
            </p>
          </li>
          <li className="landing-tile">
            <h3 className="heading-3">Tests in the Testing view</h3>
            <p className="body-s">Run or debug a single test with a click, and see which lines your tests covered.</p>
          </li>
        </ul>
        <More href={docsLink("guide/vscode")}>set up VS Code</More>
      </section>

      <section className="landing-sec landing-row" aria-labelledby="test">
        <div className="landing-col" style={{ flex: "1 1 360px" }}>
          <Kicker>tested</Kicker>
          <h2 id="test" className="display-l" style={{ margin: 0 }}>
            Test your addon without logging in
          </h2>
          <p className="body" style={{ margin: 0, color: "var(--ink-muted)" }}>
            <code className="wl-icode">wowlua test</code> loads your addon into an emulated client: a Lua 5.1 VM with WoW&apos;s taint and secret values, the flavor&apos;s API
            and Blizzard&apos;s own UI. Type slash commands, click buttons, spawn units, move time forward, then check what the player would see, down to a screenshot.
          </p>
          <Arrows
            items={[
              "runs anywhere, in CI too, no game client needed",
              "screenshot tests drawn with your installation's textures and fonts",
              "world profiles: a character with its gear and bags, the units around it, a party",
              "examples in your doc comments run as tests",
            ]}
          />
          <More href={docsLink("guide/testing")}>write your first test</More>
        </div>
        <div className="landing-col" style={{ flex: "1 1 560px", gap: 12 }}>
          <Code file="tests/window.test.wowlua" lang="wowlua" code={TEST_SRC} />
          <Terminal title="~/GoldLedger" lines={TEST_RUN} />
        </div>
      </section>

      <section className="landing-sec landing-row" aria-labelledby="api">
        <div className="landing-col" style={{ flex: "1 1 360px" }}>
          <Kicker>wow api</Kicker>
          <h2 id="api" className="display-l" style={{ margin: 0 }}>
            The whole WoW API, documented
          </h2>
          <p className="body" style={{ margin: 0, color: "var(--ink-muted)" }}>
            Every function, event and widget method of the camelot client, searchable, with what it does, its parameters and its results; retail and Classic Era are
            coming. Where Blizzard and the wiki are silent, wowlua wrote the description. Each page also tells you how well the emulator knows it, so you know what your
            tests can rely on.
          </p>
          <ul className="landing-arrows">
            <li>
              <span className="wl-badge wl-badge--done">implemented</span> modelled by the emulator
            </li>
            <li>
              <span className="wl-badge wl-badge--note">recorded</span> answered as the real client answered
            </li>
            <li>
              <span className="wl-badge wl-badge--warning">guessed</span> worked out from the documentation
            </li>
            <li>
              <span className="wl-badge wl-badge--error">not implemented</span> calls fail with &quot;not mocked&quot;
            </li>
          </ul>
          <More href={"/api"}>search the API</More>
        </div>
        <ApiSearchMock />
      </section>

      <section className="landing-sec landing-row landing-dev" aria-labelledby="dev">
        <DevWindowMock />
        <div className="landing-col" style={{ flex: "1 1 340px" }}>
          <Kicker>in game</Kicker>
          <h2 id="dev" className="display-l" style={{ margin: 0 }}>
            A dev window inside the game
          </h2>
          <p className="body" style={{ margin: 0, color: "var(--ink-muted)" }}>
            Dev builds profile every function, monitor events, scripts and timers, capture errors and watch values, without a single change to your code. Type{" "}
            <code className="wl-icode">/wl</code>. Release builds contain none of it.
          </p>
          <Arrows items={debugging().map(inlineMd)} />
          <More href={docsLink("guide/debugging")}>debugging guide</More>
        </div>
      </section>

      <section className="landing-sec landing-stack" aria-labelledby="ship">
        <div className="landing-col" style={{ maxWidth: 760 }}>
          <Kicker>shipped</Kicker>
          <h2 id="ship" className="display-l" style={{ margin: 0 }}>
            From one source folder to every addon site
          </h2>
          <p className="body" style={{ margin: 0, color: "var(--ink-muted)" }}>
            wowlua writes the TOC file, embeds your libraries and builds a complete, installable AddOn, for any of seven game flavors: retail (
            <code className="wl-icode">standard</code>, the default), WoW Forever, the Classic clients and Classic Era.
          </p>
        </div>
        <div className="landing-ship">
          <article className="landing-tile">
            <h3 className="heading-2">Compiles to the Lua you&apos;d write</h3>
            <p className="body-s">Types disappear and sugar becomes plain Lua 5.1. Dev builds keep your line numbers, so errors point at your code.</p>
            <Code file="wowlua" code={SUGAR_SRC} hl="wowlua" />
            <Code file="emitted" lang="lua 5.1" code={SUGAR_OUT} hl="lua" />
          </article>
          <article className="landing-tile">
            <h3 className="heading-2">No TOC, no Libs folder to babysit</h3>
            <p className="body-s">
              The TOC file is generated from <code className="wl-icode">wowlua.json</code>. Lua libraries are fetched, locked and embedded with only the files the game loads.
            </p>
            <Code file="wowlua.json" lang="json" code={WOWLUA_JSON} />
          </article>
          <article className="landing-tile">
            <h3 className="heading-2">Publish with one command</h3>
            <p className="body-s">
              Builds, runs your tests, packages the zip and uploads it to CurseForge, Wago, WoWInterface and GitHub Releases. Push a tag and CI does it for you.
            </p>
            {ship.length > 0 && <Terminal title="~/GoldLedger" lines={ship} small commentsAbove />}
          </article>
        </div>
      </section>

      <section className="landing-sec" aria-labelledby="adopt">
        <div className="landing-adopt">
          <div className="landing-col" style={{ flex: "1 1 420px", gap: 14 }}>
            <Kicker>bring your addon</Kicker>
            <h2 id="adopt" className="heading-1" style={{ margin: 0 }}>
              Keep your code. Get the tools today.
            </h2>
            <p className="body" style={{ margin: 0, color: "var(--ink-muted)" }} dangerouslySetInnerHTML={{ __html: inlineMd(bringYourAddon()) }} />
            <More href={adoptHref}>read the adoption guide</More>
          </div>
          <Terminal
            title="~/MyExistingAddon"
            style={{ flex: "1 1 440px", minWidth: 0 }}
            lines={[
              { cmd: "wowlua init --from-pkgmeta" },
              { cmd: "wowlua dev", comment: "build, sync, watch" },
              { cmd: "wowlua types convert src", comment: "LuaLS annotations → types" },
            ]}
          />
        </div>
      </section>

      <section className="landing-sec" style={{ paddingTop: 56 }} aria-labelledby="mcp">
        <div className="landing-agents">
          <h2 id="mcp" className="heading-3" style={{ margin: 0, flex: "0 0 auto" }}>
            Working with an AI agent?
          </h2>
          <p className="body-s" style={{ margin: 0, flex: "1 1 420px", color: "var(--ink-muted)" }}>
            <code className="wl-icode">wowlua mcp</code> lets it start your addon in the emulated client, look at screenshots, click, type slash commands, set breakpoints and
            profile, just like you can.
          </p>
          <More href={docsLink("guide/agents")}>how it works</More>
        </div>
      </section>

      <section className="landing-sec landing-cta" aria-labelledby="cta">
        <h2 id="cta" className="display-l" style={{ margin: 0, maxWidth: "20ch" }}>
          Your next addon, in about a minute
        </h2>
        <Terminal title="~" lines={CTA_RUN} caret style={{ width: "100%", maxWidth: 760 }} />
        <div className="landing-actions">
          <Link className="wl-btn wl-btn--primary" href={startHref}>
            get started
          </Link>
          <a className="wl-btn wl-btn--secondary" href={REPO_URL()}>
            github ↗
          </a>
          <a className="wl-btn wl-btn--ghost" href={DISCORD_URL}>
            join the discord
          </a>
        </div>
      </section>
    </main>
  );
}
