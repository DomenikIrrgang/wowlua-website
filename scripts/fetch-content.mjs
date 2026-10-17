#!/usr/bin/env node
// Downloads the wowlua repository's documentation into content/.cache/ before a
// build. wowlua is the source of truth: the site renders its docs/, spec/,
// README and examples, and its GitHub releases, as they are on GitHub.
//
//   content/.cache/refs.json          versions: main plus the newest tag of each minor
//   content/.cache/releases.json      GitHub releases (tag, name, date, notes)
//   content/.cache/unreleased.json    commits on main since the newest release
//   content/.cache/<version>/...      README.md, docs/, spec/, examples/ of that ref
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
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import * as tar from "tar";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "content", ".cache");
const REPO = process.env.WOWLUA_REPO || "DomenikIrrgang/wowlua";
const LOCAL = process.env.WOWLUA_LOCAL;
const OFFLINE = process.env.WOWLUA_OFFLINE === "1";
const TOKEN = process.env.GITHUB_TOKEN;

// What the site renders from each ref. Everything else in the repo is skipped.
const WANTED = ["README.md", "CHANGELOG.md", "docs/", "spec/", "examples/"];
const wanted = (p) => WANTED.some((w) => (w.endsWith("/") ? p.startsWith(w) : p === w));

async function main() {
  if (process.argv.includes("--if-missing") && existsSync(path.join(CACHE, "refs.json"))) {
    console.log("content: cache present, skipping fetch (npm run content refreshes it)");
    return;
  }
  if (OFFLINE) {
    if (!existsSync(path.join(CACHE, "refs.json"))) {
      throw new Error("WOWLUA_OFFLINE=1 but content/.cache is empty; run once with network access");
    }
    console.log("content: offline, using the existing cache");
    return;
  }

  const releases = (await api(`/repos/${REPO}/releases?per_page=100`))
    .filter((r) => !r.draft)
    .map((r) => ({
      tag: r.tag_name,
      name: r.name || r.tag_name,
      date: r.published_at,
      prerelease: r.prerelease,
      url: r.html_url,
      notes: r.body || "",
    }))
    .sort((a, b) => compareSemver(b.tag, a.tag));

  // One docs version per minor line: its newest release.
  const versions = [];
  for (const r of releases) {
    if (r.prerelease) continue;
    const v = parseSemver(r.tag);
    if (!v) continue;
    const id = `${v.major}.${v.minor}`;
    if (!versions.some((x) => x.id === id)) versions.push({ id, ref: r.tag, date: r.date });
  }

  const head = await api(`/repos/${REPO}/commits/main`);
  const refs = [
    { id: "main", ref: "main", sha: head.sha, date: head.commit.committer.date },
    ...versions,
  ];

  const latest = releases.find((r) => !r.prerelease);
  let unreleased = { base: null, commits: [] };
  if (latest) {
    const cmp = await api(`/repos/${REPO}/compare/${latest.tag}...${head.sha}`);
    unreleased = {
      base: latest.tag,
      total: cmp.total_commits,
      commits: cmp.commits
        .filter((c) => c.parents.length < 2)
        .map((c) => ({
          sha: c.sha,
          date: c.commit.committer.date,
          subject: c.commit.message.split("\n")[0],
          url: c.html_url,
        }))
        .reverse(),
    };
  }

  const next = `${CACHE}.next`;
  await rm(next, { recursive: true, force: true });
  await mkdir(next, { recursive: true });

  for (const r of refs) {
    const dest = path.join(next, r.id);
    await mkdir(dest, { recursive: true });
    if (r.id === "main" && LOCAL) {
      await copyLocal(path.resolve(LOCAL), dest);
      console.log(`content: main from ${LOCAL} (working tree)`);
    } else {
      await download(r.id === "main" ? r.sha : r.ref, dest);
      console.log(`content: ${r.id} from ${r.id === "main" ? r.sha.slice(0, 7) : r.ref}`);
    }
  }

  const meta = { repo: REPO, generatedAt: new Date().toISOString(), local: Boolean(LOCAL), refs };
  await writeFile(path.join(next, "refs.json"), JSON.stringify(meta, null, 2));
  await writeFile(path.join(next, "releases.json"), JSON.stringify(releases, null, 2));
  await writeFile(path.join(next, "unreleased.json"), JSON.stringify(unreleased, null, 2));

  // Swap in the new cache only once everything downloaded.
  await rm(CACHE, { recursive: true, force: true });
  await cp(next, CACHE, { recursive: true });
  await rm(next, { recursive: true, force: true });
  console.log(`content: ${refs.length} versions, ${releases.length} releases`);
}

async function api(route) {
  const res = await fetch(`https://api.github.com${route}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "wowlua-website",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${route}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function download(ref, dest) {
  const res = await fetch(`https://codeload.github.com/${REPO}/tar.gz/${ref}`, {
    headers: { "User-Agent": "wowlua-website" },
  });
  if (!res.ok || !res.body) throw new Error(`download ${ref}: ${res.status}`);
  await pipeline(
    Readable.fromWeb(res.body),
    tar.x({
      cwd: dest,
      strip: 1,
      // Entry paths start with "<repo>-<ref>/"; strip happens after the filter.
      filter: (p) => wanted(p.split("/").slice(1).join("/")),
    }),
  );
}

async function copyLocal(src, dest) {
  for (const w of WANTED) {
    const from = path.join(src, w);
    if (existsSync(from)) await cp(from, path.join(dest, w), { recursive: true });
  }
}

function parseSemver(tag) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/.exec(tag);
  return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || "" } : null;
}

function compareSemver(a, b) {
  const x = parseSemver(a);
  const y = parseSemver(b);
  if (!x || !y) return a.localeCompare(b);
  return (
    x.major - y.major ||
    x.minor - y.minor ||
    x.patch - y.patch ||
    (x.pre === y.pre ? 0 : x.pre === "" ? 1 : y.pre === "" ? -1 : x.pre.localeCompare(y.pre))
  );
}

main().catch(async (err) => {
  console.error(`content: ${err.message}`);
  // A failed refresh keeps a previous cache usable for local work.
  if (existsSync(path.join(CACHE, "refs.json")) && !process.env.CI) {
    console.error("content: keeping the previous cache");
    return;
  }
  process.exit(1);
});

