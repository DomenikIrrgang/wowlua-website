import { highlight } from "@/lib/highlight";

// VS Code debugging an addon in the emulated client, drawn as a mock. What the
// panels hold was recorded from wowlua 0.12.0 (`wowlua mcp`, the same debugger
// as `wowlua debug`): the addon below stopped at line 23 on camelot, its call
// stack, its upvalues and the exception breakpoints the debugger offers, at
// their defaults. The
// game's screen is a drawing of what the client drew at that stop.
const CODE = `import onLogin from "wowlua:lifecycle"
import * as saved from "wowlua:saved"

local db = saved.bind("GoldLedgerDB", {
    version = 1,
    defaults = { start = 0, welcomed = false },
})

const welcome = CreateFrame("Frame", "GoldLedgerWelcome", UIParent, "BasicFrameTemplate")
welcome:SetSize(260, 120)
welcome:SetPoint("CENTER")
welcome:Hide()

const text = welcome:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
text:SetPoint("CENTER", 0, -4)
text:SetText("Welcome to GoldLedger!\\nType /ledger to open it.")

@onLogin
local function greet()
    if not db.welcomed then
        db.start = GetMoney()
        welcome:Show()
        db.welcomed = true
    end
end`;

const STOP = 23;
// Phones show the handler only, from this line.
const HANDLER = 18;

const VARIABLES = [
  { name: "db", value: "table: 0x1054baa0 [tainted by GoldLedger]" },
  { name: "welcome", value: 'Frame "GoldLedgerWelcome" visible 260x120 [tainted by GoldLedger]' },
];

// Frames 1, 4, 5, 10, 11 and 13 of the recorded stack; the ones in wowlua's standard library are dimmed, as VS Code shows them.
const STACK = [
  { name: "function <src/main.wowlua:18>", at: "main.wowlua 23", own: true },
  { name: "runAll", at: "lifecycle.lua 26" },
  { name: "login", at: "lifecycle.lua 35" },
  { name: "dispatch", at: "events.lua 86" },
  { name: "Frame#69563:OnEvent", at: "events.lua 91" },
  { name: "event PLAYER_LOGIN", at: "" },
];

const BREAKPOINTS = [
  { label: "Errors that reach the error handler", on: true },
  { label: "Every error, caught ones too", on: false },
  { label: "Execution becomes tainted", on: false },
  { label: "A protected action is blocked", on: true },
  { label: "main.wowlua", at: "src  23", on: true },
];

const ACTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];

export function DebugMock() {
  return (
    <div
      className="landing-debug"
      role="img"
      aria-label="Mock of VS Code debugging an addon with wowlua: paused at a breakpoint inside an @onLogin handler, the call stack goes back to event PLAYER_LOGIN, the breakpoints include stopping when execution becomes tainted or a protected action is blocked, and the wowlua: UI panel shows the addon's welcome window as the game draws it"
    >
      <div className="landing-debug__side">
        <p className="landing-debug__title">Run and debug</p>
        <section>
          <h3 className="landing-debug__head">Variables</h3>
          <p className="landing-debug__scope">› Locals</p>
          <p className="landing-debug__scope">⌄ Upvalues</p>
          {VARIABLES.map((v) => (
            <p className="landing-debug__var" key={v.name}>
              <span style={{ color: "var(--syn-type)" }}>{v.name}</span>: <span style={{ color: "var(--ink-muted)" }}>{v.value}</span>
            </p>
          ))}
        </section>
        <section>
          <h3 className="landing-debug__head">Call stack</h3>
          {STACK.map((f) => (
            <p className={`landing-debug__frame${f.own ? " is-own" : ""}`} key={f.name}>
              <span>{f.name}</span>
              <span className="landing-debug__at">{f.at}</span>
            </p>
          ))}
        </section>
        <section>
          <h3 className="landing-debug__head">Breakpoints</h3>
          {BREAKPOINTS.map((b) => (
            <p className="landing-debug__bp" key={b.label}>
              <span className={`landing-debug__box${b.on ? " is-on" : ""}`} aria-hidden="true" />
              <span>{b.label}</span>
              {b.at && <span className="landing-debug__at">{b.at}</span>}
            </p>
          ))}
        </section>
      </div>

      <div className="landing-debug__editor">
        <div className="landing-debug__tabs">
          <span className="landing-debug__tab">main.wowlua</span>
          <span className="landing-debug__toolbar" aria-hidden="true">
            <span>▶</span>
            <span>↷</span>
            <span>↓</span>
            <span>↑</span>
            <span>⟲</span>
            <span style={{ color: "var(--error)" }}>■</span>
          </span>
        </div>
        <div className="landing-debug__code">
          {CODE.split("\n").map((l, i) => (
            <div className={`landing-debug__line${i + 1 === STOP ? " is-stop" : ""}${i + 1 < HANDLER ? " is-head" : ""}`} key={i}>
              <span className="landing-debug__num">
                {i + 1 === STOP && <span className="landing-debug__dot" aria-hidden="true" />}
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: highlight(l, "wowlua") }} />
            </div>
          ))}
        </div>
      </div>

      <div className="landing-debug__ui">
        <div className="landing-debug__tabs">
          <span className="landing-debug__tab">wowlua: UI</span>
          <span className="landing-debug__status">paused · camelot</span>
        </div>
        <div className="landing-debug__screen">
          <span className="landing-debug__zone">
            Elwynn Forest
            <small>Northshire Valley</small>
          </span>
          <span className="landing-debug__map" />
          <span className="landing-debug__window">
            <span className="landing-debug__close">×</span>
            Welcome to GoldLedger!
            <br />
            Type /ledger to open it.
          </span>
          <span className="landing-debug__player">
            <span className="landing-debug__portrait">60</span>
            <span className="landing-debug__bars">
              <span>Player</span>
              <i />
            </span>
          </span>
          <span className="landing-debug__actions">
            {ACTIONS.map((k) => (
              <span key={k}>{k}</span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
