// wowlua in a Web Worker (@wowlua/web): the compiler, checker and language server off the page's thread. Loaded by
// the playground only, after the page is up.
import { connect, type Connection } from "@wowlua/web/client";

/**
 * The WebAssembly module (75 MB, the package's export). The bundler emits it once, as
 * /_next/static/media/wowlua_web_bg.<content hash>.wasm, which Next serves as immutable for a year; the worker's own
 * default URL for it (wasm-bindgen's) is the same file.
 */
const WASM = new URL("@wowlua/web/wowlua_web_bg.wasm", import.meta.url);

export function startWowlua(): Connection {
  return connect(new Worker(new URL("@wowlua/web/worker", import.meta.url), { type: "module" }), { wasm: WASM });
}
