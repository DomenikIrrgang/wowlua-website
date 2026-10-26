// What the API reference's server pages and its client parts (search, sidebar
// filter) share: the statuses' badges and every entry's URL.

export type Status = "implemented" | "recorded" | "guessed" | "not implemented";

export const STATUSES: Status[] = ["implemented", "recorded", "guessed", "not implemented"];

export const BADGE: Record<Status, string> = {
  implemented: "wl-badge--done",
  recorded: "wl-badge--note",
  guessed: "wl-badge--warning",
  "not implemented": "wl-badge--error",
};

/** The colour of a status in the bars. */
export const TONE: Record<Status, string> = {
  implemented: "var(--success)",
  recorded: "var(--note)",
  guessed: "var(--warning)",
  "not implemented": "var(--error)",
};

/** The global functions' namespace ("") in URLs. */
export const GLOBAL = "global";

export const namespaceHref = (ns: string) => `/api/${ns || GLOBAL}`;
/** `C_Container.GetContainerItemInfo` → /api/C_Container/GetContainerItemInfo, `GetTime` → /api/global/GetTime. */
export function functionHref(name: string) {
  const dot = name.indexOf(".");
  return dot < 0 ? `/api/${GLOBAL}/${name}` : `/api/${name.slice(0, dot)}/${name.slice(dot + 1)}`;
}
export const eventHref = (name: string) => `/api/events/${name}`;
export const widgetHref = (name: string) => `/api/widgets/${name}`;
/** A widget method has no page of its own: its row on the class page. */
export const methodHref = (widget: string, method: string) => `${widgetHref(widget)}#${method}`;

/** The search's entry kinds, in the names index (app/api/names.json). */
export const KINDS = ["function", "event", "method", "namespace"] as const;
export type Kind = (typeof KINDS)[number];

/**
 * One entry of the names index: its name, kind (index into KINDS), status (index into STATUSES, -1 for a namespace)
 * and, for a namespace, its number of functions.
 */
export type NameEntry = [name: string, kind: number, status: number, functions?: number];

export function entryHref([name, kind]: NameEntry): string {
  switch (KINDS[kind]) {
    case "function":
      return functionHref(name);
    case "event":
      return eventHref(name);
    case "method": {
      const [w, m] = name.split(":");
      return methodHref(w, m);
    }
    default:
      return namespaceHref(name === "global functions" ? "" : name);
  }
}

/** What the search shows beside an entry: a function's namespace, a method's widget. */
export function entryWhere([name, kind, , functions]: NameEntry): string {
  switch (KINDS[kind]) {
    case "function":
      return name.includes(".") ? name.slice(0, name.indexOf(".")) : GLOBAL;
    case "event":
      return "event";
    case "method":
      return name.split(":")[0];
    default:
      return `${functions ?? 0} functions`;
  }
}

/** `UnitAuras` → "unit auras", for a system's name in labels. */
export const humanize = (s: string) =>
  s
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();

const NUMBER = "number luaIndex time_t size_t uint32 int32 uint64 int double float fileID SingleColorValue BigUInteger BigInteger uiUnit".split(" ");
const STRING = ("cstring string mouseButton kstringClubId kstringLfgListApplicant kstringLfgListSearch ModelAsset textureAtlas textureKit " +
  "WOWGUID UnitToken UnitTokenVariant UnitTokenType UnitTokenPvPRestrictedForAddOns").split(" ");

/**
 * A type as wowlua declares it: Blizzard's `bool`, `cstring` and `luaIndex` are `boolean`, `string` and `number`,
 * `SimpleTexture` is `Texture` (wowlua-types-gen's `map_type`, crates/wowlua-types-gen/src/blizzard.rs).
 */
export function wowType(type: string): string {
  const m = /^(.*?)(\[\])?(\?)?$/.exec(type)!;
  const base = m[1];
  const mapped = NUMBER.includes(base)
    ? "number"
    : base === "bool"
      ? "boolean"
      : STRING.includes(base)
        ? "string"
        : base === "LuaValueReference" || base === ""
          ? "any"
          : /^Simple[A-Z]/.test(base)
            ? base.slice(6)
            : base;
  return `${mapped}${m[2] ?? ""}${m[3] ?? ""}`;
}

export const fmt = (n: number) => n.toLocaleString("en-US");
export const pct = (n: number, total: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : "0%");
