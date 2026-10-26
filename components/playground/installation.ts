// The user's World of Warcraft folder for the game tab: wowlua reads the game's art and data from it in the worker,
// in the browser, and uploads nothing (@wowlua/web's `useInstallation`). It is chosen with a folder `<input>`: the
// folder picker (`showDirectoryPicker`) refuses folders in /Applications, where macOS installs the game. The choice
// is kept while the page lives (a client-side navigation away and back keeps it).

export type Source = File[];
export type Opened = { flavor: string; product: string; files: number };

let current: { source: Source; opened: Opened } | null = null;
export const remembered = () => current;
export const remember = (source: Source, opened: Opened) => {
  current = { source, opened };
};
