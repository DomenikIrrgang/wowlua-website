# wowlua-website

The website of [wowlua](https://github.com/DomenikIrrgang/wowlua), the language, compiler, framework and package
manager for World of Warcraft AddOns. Next.js (App Router), every page prerendered.

## Where the content comes from

The wowlua repository is the source of truth. The site renders its files as they are on GitHub when the site is
built, so most changes to wowlua need no change here.

| On the site | From the wowlua repository |
| --- | --- |
| `/docs` guide pages | `docs/*.md`; the sidebar follows the list in `docs/README.md` |
| `/docs/spec/…` reference | `spec/**/*.md`; the sidebar follows the table in `spec/README.md` |
| `/docs/diagnostics/<code>` | the tables in `spec/appendix/diagnostics.md`, plus the spec sections that mention each code |
| the docs version picker | `main`, plus the newest release of each minor version (GitHub releases) |
| `/changelog` | `CHANGELOG.md` on main (GitHub release notes if it is missing), commits on main since the last release |
| `/roadmap` | `spec/roadmap.md`: milestones, status lines, exit criteria, stages |
| landing page facts | `README.md`: intro, install commands, sample diagnostic, the four tools table, debugging list |

Owned by this repository:

- the landing page layout and its headlines (`app/page.tsx`), and the terminal and `clamp` samples recorded from the
  compiler;
- blog posts, `content/blog/*.md` (front matter: `title`, `date`, `summary`, optional `author`, `tags`, `version`).
  Releases appear in the blog list and the RSS feed (`/blog/rss.xml`) on their own;
- the showcase, `content/showcase/*.json`;
- the design system: `styles/tokens.css`, `styles/design-system.css`, `styles/site.css`, and the site's own
  `styles/markdown.css`.

Links between wowlua's Markdown files are rewritten to site pages; links to other repository files go to GitHub at
the same version. Write the docs so they read well on GitHub too.

## Develop

```sh
npm install
npm run dev            # fetches the content once, then next dev
npm run content        # refresh the content from GitHub
npm run build          # fetch, then prerender every page
```

`scripts/fetch-content.mjs` downloads `README.md`, `CHANGELOG.md`, `docs/`, `spec/` and `examples/` of each docs
version into `content/.cache/` (not committed), plus the releases and the commits since the last one. Environment:

- `WOWLUA_LOCAL=../wowlua`: read main from a local checkout's working tree, to preview docs before pushing them.
- `WOWLUA_OFFLINE=1`: build from the existing cache without the network.
- `WOWLUA_REPO=owner/name`: another wowlua repository (a fork).
- `GITHUB_TOKEN`: raises the GitHub API rate limit (60 requests an hour without one; a fetch makes three).

## Deploy

https://wowlua.dev runs on the `suuui` droplet next to suuui.dev, as its own Compose project in `/opt/wowlua`.
Traefik from the suuui stack terminates TLS and reaches the app over the `suuui_web` network as `wowlua-app`.

`.github/workflows/deploy.yml` builds the image, pushes it to `registry.digitalocean.com/suuui/wowlua-website`, and
deploys it over SSH with a key that can only run `wowlua-deploy <tag>`. It runs on pushes to `main`, by hand, on a
`repository_dispatch` of type `wowlua-updated`, and every hour. The image tag names the site commit, wowlua's main
commit and its latest release, so the hourly run skips the build when nothing changed: wowlua changes reach the site
within the hour.

| Path in repo | On the droplet |
| --- | --- |
| `deploy/compose.yaml` | `/opt/wowlua/compose.yaml` |
| `deploy/deploy.sh` | `/usr/local/bin/wowlua-deploy` |
| `deploy/deploy-ssh.sh` | `/usr/local/bin/wowlua-deploy-ssh` |

The `production` environment holds the secrets `DIGITALOCEAN_ACCESS_TOKEN` and `DEPLOY_SSH_KEY`, and the variables
`DEPLOY_HOST` and `DEPLOY_KNOWN_HOSTS`.

## Licence

MIT. Fonts: Martian Mono and IBM Plex Mono (SIL Open Font License 1.1).
