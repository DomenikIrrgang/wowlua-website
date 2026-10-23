#!/usr/bin/env node
// Downloads the wowlua repository's documentation into content/.cache before a
// build or `next dev` (see content-sync.mjs for the layout). The running
// server keeps it up to date on its own (instrumentation.ts).
//
// Environment:
//   WOWLUA_REPO     owner/name on GitHub (default DomenikIrrgang/wowlua)
//   WOWLUA_LOCAL    path to a local checkout: main is read from its working tree
//                   (unpushed docs show up), tags still come from GitHub
//   WOWLUA_OFFLINE  1: use what is already in the cache, never touch the network
//   GITHUB_TOKEN    optional, raises the GitHub API rate limit (CI)
//
// Flags:
//   --if-missing    do nothing when the cache already exists (npm run dev)

import { existsSync } from "node:fs";
import { cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WANTED, hasContent, syncContent } from "./content-sync.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  if (process.argv.includes("--if-missing") && hasContent(ROOT)) {
    console.log("content: cache present, skipping fetch (npm run content refreshes it)");
    return;
  }
  if (process.env.WOWLUA_OFFLINE === "1") {
    if (!hasContent(ROOT)) throw new Error("WOWLUA_OFFLINE=1 but content/.cache is empty; run once with network access");
    console.log("content: offline, using the existing cache");
    return;
  }
  const changed = await syncContent({
    root: ROOT,
    repo: process.env.WOWLUA_REPO || "DomenikIrrgang/wowlua",
    local: process.env.WOWLUA_LOCAL ? { path: process.env.WOWLUA_LOCAL, copy: copyLocal } : undefined,
    token: process.env.GITHUB_TOKEN,
  });
  if (!changed) console.log("content: up to date");
}

// Kept out of content-sync.mjs: the server bundles that, and a copy from an
// arbitrary path would make the bundler trace the whole project.
async function copyLocal(dest) {
  const src = path.resolve(process.env.WOWLUA_LOCAL);
  for (const w of WANTED) {
    const from = path.join(src, w);
    if (existsSync(from)) await cp(from, path.join(dest, w), { recursive: true });
  }
}

main().catch((err) => {
  console.error(`content: ${err.message}`);
  // A failed refresh keeps a previous cache usable for local work.
  if (hasContent(ROOT) && !process.env.CI) {
    console.error("content: keeping the previous cache");
    return;
  }
  process.exit(1);
});
