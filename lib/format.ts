/** "v0.9.0" → "0.9" */
export const shortVersion = (tag: string) => tag.replace(/^v/, "").split(".").slice(0, 2).join(".");

/** "2026-10-15T04:32:31Z" → "2026-10-15" (UTC, as GitHub shows it) */
export const isoDay = (date: string) => date.slice(0, 10);
