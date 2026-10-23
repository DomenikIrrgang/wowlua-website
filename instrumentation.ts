// Runs once when the server starts. In production it keeps wowlua's docs up to
// date without a redeploy: every few minutes it asks GitHub whether wowlua's
// main or its releases changed and, if so, downloads the new content. Pages
// pick it up when they next regenerate (`revalidate` in app/layout.tsx).
//
//   WOWLUA_REFRESH_MINUTES  how often to check (default 5 in production, off in
//                           `next dev`; 0 turns it off)
//   GITHUB_TOKEN            optional, raises the GitHub API rate limit
//                           (60 requests an hour without one; a check makes 2)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const minutes = Number(process.env.WOWLUA_REFRESH_MINUTES ?? (process.env.NODE_ENV === "production" ? 5 : 0));
  if (!(minutes > 0)) return;

  const { syncContent } = await import("./scripts/content-sync.mjs");
  let running = false;
  const refresh = async () => {
    if (running) return;
    running = true;
    try {
      await syncContent({
        // Relative to the working directory; process.cwd() here would make the
        // bundler trace the whole project into the server output.
        root: ".",
        repo: process.env.WOWLUA_REPO || "DomenikIrrgang/wowlua",
        token: process.env.GITHUB_TOKEN || undefined,
      });
    } catch (err) {
      // The current content stays; the next check tries again.
      console.error(`content: refresh failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      running = false;
    }
  };
  // Not awaited: the server starts with the content baked into the image.
  void refresh();
  setInterval(refresh, minutes * 60_000).unref();
}
