// Downloads the wowlua repository's documentation. wowlua is the source of
// truth: the site renders its docs/, spec/, README and examples, and its GitHub
// releases, as they are on GitHub. Used before a build (fetch-content.mjs) and
// by the running server, which checks for changes every few minutes
// (instrumentation.ts), so a wowlua release needs no redeploy of the site.
//
//   content/.cache                    symlink to the current snapshot in content/.store/
//   content/.cache/refs.json          versions: main plus the newest tag of each minor
//   content/.cache/releases.json      GitHub releases (tag, name, date, notes)
//   content/.cache/unreleased.json    commits on main since the newest release
//   content/.cache/<version>/...      README.md, CHANGELOG.md, docs/, spec/, examples/ of that ref
//
// A sync writes a new snapshot next to the current one and then repoints the
// symlink, so pages being rendered never see a half-written cache. Versions
// whose ref is unchanged are copied from the current snapshot, not downloaded.

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { cp, mkdir, readdir, readlink, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";

// What the site renders from each ref. Everything else in the repo is skipped.
export const WANTED = ["README.md", "CHANGELOG.md", "docs/", "spec/", "examples/"];
const wanted = (p) => WANTED.some((w) => (w.endsWith("/") ? p.startsWith(w) : p === w));

/**
 * @param {object} o
 * @param {string} o.root     the site's directory (content/ lives under it)
 * @param {string} o.repo     owner/name on GitHub
 * @param {{ path: string, copy: (dest: string) => Promise<void> }} [o.local]
 *   a local checkout: main is copied from its working tree (fetch-content.mjs)
 * @param {string} [o.token]  GitHub token, raises the API rate limit
 * @param {boolean} [o.force] write a new snapshot even when nothing changed
 * @param {(msg: string) => void} [o.log]
 * @returns {Promise<boolean>} whether the content changed
 */
export async function syncContent({ root, repo, local, token, force = false, log = console.log }) {
  const dirs = paths(root);
  const api = (route) => github(route, token);

  const releases = (await api(`/repos/${repo}/releases?per_page=100`))
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

  const head = await api(`/repos/${repo}/commits/main`);
  const refs = [{ id: "main", ref: "main", sha: head.sha, date: head.commit.committer.date }, ...versions];

  const current = readCurrent(dirs.cache);
  const sameRef = (r) => {
    const old = current?.meta.refs.find((x) => x.id === r.id);
    return old && (r.id === "main" ? old.sha === r.sha : old.ref === r.ref);
  };
  const unchanged =
    current &&
    !current.meta.local &&
    !local &&
    current.meta.repo === repo &&
    current.meta.refs.length === refs.length &&
    refs.every(sameRef) &&
    JSON.stringify(current.releases) === JSON.stringify(releases);
  if (unchanged && !force) return false;

  const latest = releases.find((r) => !r.prerelease);
  let unreleased = { base: null, commits: [] };
  if (latest) {
    const cmp = await api(`/repos/${repo}/compare/${latest.tag}...${head.sha}`);
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

  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  const next = path.join(dirs.store, name);
  await mkdir(next, { recursive: true });
  try {
    for (const r of refs) {
      const dest = path.join(next, r.id);
      if (r.id === "main" && local) {
        await mkdir(dest, { recursive: true });
        await local.copy(dest);
        log(`content: main from ${local.path} (working tree)`);
      } else if (sameRef(r) && !(r.id === "main" && current.meta.local) && existsSync(path.join(dirs.cache, r.id))) {
        await cp(path.join(dirs.cache, r.id), dest, { recursive: true });
      } else {
        await mkdir(dest, { recursive: true });
        await download(repo, r.id === "main" ? r.sha : r.ref, dest);
        log(`content: ${r.id} from ${r.id === "main" ? r.sha.slice(0, 7) : r.ref}`);
      }
    }
    const meta = { repo, generatedAt: new Date().toISOString(), local: Boolean(local), refs };
    await writeFile(path.join(next, "refs.json"), JSON.stringify(meta, null, 2));
    await writeFile(path.join(next, "releases.json"), JSON.stringify(releases, null, 2));
    await writeFile(path.join(next, "unreleased.json"), JSON.stringify(unreleased, null, 2));
  } catch (err) {
    await rm(next, { recursive: true, force: true });
    throw err;
  }

  await activate(dirs, name);
  log(`content: ${refs.length} versions, ${releases.length} releases (${latest?.tag ?? "none released"})`);
  return true;
}

export const hasContent = (root) => existsSync(path.join(paths(root).cache, "refs.json"));

const paths = (root) => ({ cache: path.join(root, "content", ".cache"), store: path.join(root, "content", ".store") });

function readCurrent(cache) {
  try {
    return {
      meta: JSON.parse(readFileSync(path.join(cache, "refs.json"), "utf8")),
      releases: JSON.parse(readFileSync(path.join(cache, "releases.json"), "utf8")),
    };
  } catch {
    return null;
  }
}

/** Points content/.cache at the snapshot, then removes all but it and the one before. */
async function activate({ cache, store }, name) {
  let previous = null;
  if (existsSync(cache) || isSymlink(cache)) {
    if (isSymlink(cache)) previous = path.basename(await readlink(cache));
    // A plain directory from before snapshots existed.
    else await rm(cache, { recursive: true, force: true });
  }
  const tmp = `${cache}.${process.pid}.tmp`;
  await rm(tmp, { force: true });
  await symlink(path.join(".store", name), tmp);
  await rename(tmp, cache); // atomic: readers see the old snapshot or the new one
  // The previous snapshot stays for pages that started rendering before the switch.
  for (const old of await readdir(store)) {
    if (old !== name && old !== previous) await rm(path.join(store, old), { recursive: true, force: true });
  }
}

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

async function github(route, token) {
  const res = await fetch(`https://api.github.com${route}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "wowlua-website",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GitHub API ${route}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function download(repo, ref, dest) {
  const res = await fetch(`https://codeload.github.com/${repo}/tar.gz/${ref}`, {
    headers: { "User-Agent": "wowlua-website" },
    signal: AbortSignal.timeout(300_000),
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
