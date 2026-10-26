import { highlight } from "@/lib/highlight";

// The hero's editor: a wowlua file with a typo, underlined, and the hover that
// explains it. The code and the message are what `wowlua check` printed for
// this file (0.12.0); the editor around them is a mock.
const CODE = `import event from "wowlua:events"
import print from "wowlua:log"

export class Ledger
    private balance: number = 0

    function update()
        self.balance = GetMoney()
    end
end

local ledger = Ledger.new()

@event("PLAYER_MONEY")
local function onMoney()
    ledger:updte()
    print(\`now {GetCoinTextureString(GetMoney())}\`)
end`;

const TYPO_LINE = 16;

export function EditorMock() {
  const lines = CODE.split("\n").map((l, i) => {
    const html = highlight(l, "wowlua");
    return i + 1 === TYPO_LINE ? html.replace("updte", '<span class="landing-sq">updte</span>') : html;
  });
  return (
    <figure
      className="landing-editor"
      role="img"
      aria-label="Mock of VS Code with a wowlua file: a typo in a method call is underlined, and the hover explains the error before the game loads the file"
    >
      <div className="landing-editor__tabs">
        <span className="landing-editor__tab">ledger.wowlua</span>
        <span className="landing-hide-s" style={{ padding: "0 14px" }}>
          main.wowlua
        </span>
        <span style={{ marginLeft: "auto", padding: "0 12px", color: "var(--error)" }}>1 problem</span>
      </div>
      <div className="landing-editor__code">
        {lines.map((html, i) => (
          <div className="landing-editor__line" key={i}>
            <span className="landing-editor__num">{i + 1}</span>
            <span dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ))}
        <div className="landing-editor__hover">
          <span>
            <span style={{ color: "var(--error)", fontWeight: 600 }}>error[E2003]</span>: <code>Ledger</code> has no method <code>updte</code>
          </span>
          <span style={{ color: "var(--ink-faint)" }}>wowlua · src/ledger.wowlua:16:12</span>
        </div>
      </div>
    </figure>
  );
}
