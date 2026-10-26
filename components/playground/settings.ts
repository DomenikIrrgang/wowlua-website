// The playground's toolbar as wowlua.json: the build options have no arguments of their own in @wowlua/web, so
// they are a custom profile, `playground`, built with `build("playground")`, and the checking is `check.mode`.
// A shared link carries the manifest, so the toolbar comes back from it.

export const MINIFY = ["none", "strip", "compact", "rename", "max"] as const;
export type Minify = (typeof MINIFY)[number];
export type Settings = {
  checking: "basic" | "strict";
  build: "dev" | "release";
  minify: Minify;
  inline: boolean;
  cacheGlobals: boolean;
  deadCode: boolean;
};

export const PROFILE = "playground";

/** What `dev` and `release` set (crates/wowlua-manifest/src/profile.rs): picking a build starts from them. */
export function buildDefaults(build: Settings["build"]): Omit<Settings, "checking" | "build"> {
  const release = build === "release";
  return { minify: release ? "strip" : "none", inline: release, cacheGlobals: release, deadCode: release };
}

export const DEFAULT_SETTINGS: Settings = { checking: "basic", build: "dev", ...buildDefaults("dev") };

type Json = Record<string, unknown>;
const object = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});

/** The package's wowlua.json with the toolbar's settings: `check.mode` and `profiles.playground`. */
export function manifestText(template: string, s: Settings): string {
  let m: Json;
  try {
    m = object(JSON.parse(template));
  } catch {
    m = {};
  }
  m.check = { ...object(m.check), mode: s.checking };
  m.profiles = {
    ...object(m.profiles),
    [PROFILE]: {
      inherits: s.build,
      minify: s.minify,
      optimize: { inline: s.inline, "cache-globals": s.cacheGlobals ? "safe" : "off", "dead-code": s.deadCode },
    },
  };
  return JSON.stringify(m, null, 4) + "\n";
}

/** The toolbar's settings from a shared package's wowlua.json (defaults for what it does not say). */
export function settingsOf(manifest: string | undefined): Settings {
  let m: Json = {};
  try {
    m = object(JSON.parse(manifest ?? "{}"));
  } catch {}
  const p = object(object(m.profiles)[PROFILE]);
  const build = p.inherits === "release" ? "release" : "dev";
  const d = buildDefaults(build);
  const o = object(p.optimize);
  return {
    checking: object(m.check).mode === "strict" ? "strict" : "basic",
    build,
    minify: MINIFY.includes(p.minify as Minify) ? (p.minify as Minify) : d.minify,
    inline: typeof o.inline === "boolean" ? o.inline : d.inline,
    cacheGlobals: o["cache-globals"] === undefined ? d.cacheGlobals : o["cache-globals"] === "safe",
    deadCode: typeof o["dead-code"] === "boolean" ? o["dead-code"] : d.deadCode,
  };
}
