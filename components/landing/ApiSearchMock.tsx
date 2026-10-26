// The WoW API search as a picture: a query, its filters and four results with
// their emulator status. The counts are camelot's in wowlua 0.12.0 (5,111
// documented functions, 1,815 events); the rest is a mock.
const RESULTS = [
  { name: "C_Spell.GetSpellInfo", kind: "function", text: "Returns spell info: name, icon, cast time, range and the spell's ID." },
  { name: "C_Spell.GetSpellDescription", kind: "function", text: "The spell's tooltip text, with the numbers for the current character." },
  { name: "SPELL_DATA_LOAD_RESULT", kind: "event", text: "Fires when spell data requested from the server has arrived." },
  { name: "C_SpellBook.GetSpellBookItemInfo", kind: "function", text: "What sits in a slot of the player's spellbook." },
];

export function ApiSearchMock() {
  return (
    <figure
      className="landing-api"
      role="img"
      aria-label="Mock of the WoW API search on wowlua.dev: searching for spellinfo lists matching functions and events with their status in the emulator"
    >
      <div className="landing-api__query">
        <span style={{ color: "var(--amber-ink)" }}>/</span>
        <span style={{ fontSize: 15 }}>spellinfo</span>
        <span className="wl-caret" aria-hidden="true" />
        <span className="caption landing-hide-s" style={{ marginLeft: "auto", color: "var(--ink-muted)" }}>
          camelot · 5,111 functions · 1,815 events
        </span>
      </div>
      <div className="landing-api__filters">
        <span className="is-on">all</span>
        <span>functions</span>
        <span>events</span>
        <span>widgets</span>
      </div>
      <div style={{ display: "grid" }}>
        {RESULTS.map((r, i) => (
          <div className={`landing-api__row${i === 0 ? " is-hl" : ""}`} key={r.name}>
            <span className="landing-api__head">
              <span style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{r.name}</span>
              <span className="caption" style={{ color: "var(--ink-muted)" }}>
                {r.kind}
              </span>
              <span className="wl-badge wl-badge--done" style={{ marginLeft: "auto" }}>
                implemented
              </span>
            </span>
            <span className="body-s" style={{ color: "var(--ink-muted)" }}>
              {r.text}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}
