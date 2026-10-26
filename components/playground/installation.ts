// The user's World of Warcraft folder for the game tab: wowlua reads the game's art and data from it in the worker,
// in the browser, and uploads nothing (@wowlua/web's `useInstallation`). Remembered for the browser session only: in
// memory while the page lives, and a picked folder's handle in IndexedDB marked in sessionStorage, so a reload in
// the same tab asks the browser again instead of making the user pick the folder again.

export type Source = FileSystemDirectoryHandle | File[];
export type Opened = { flavor: string; product: string; files: number };

type Picker = (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
type Permissions = { queryPermission?(o: { mode: "read" }): Promise<PermissionState>; requestPermission?(o: { mode: "read" }): Promise<PermissionState> };

/** The folder picker where the browser has one (Chrome, Edge); elsewhere the page uses a folder `<input>`. */
export const directoryPicker = (): Picker | null =>
  typeof window !== "undefined" && "showDirectoryPicker" in window ? ((window as unknown as { showDirectoryPicker: Picker }).showDirectoryPicker) : null;

/** The choice while the page lives (a client-side navigation away and back keeps it). */
let current: { source: Source; opened: Opened } | null = null;
export const remembered = () => current;
export const remember = (source: Source, opened: Opened) => {
  current = { source, opened };
  if (!Array.isArray(source)) saveHandle(source);
};

const DB = "wowlua-playground";
const STORE = "installation";
const MARK = "wl-installation";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

async function store<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = run(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function saveHandle(handle: FileSystemDirectoryHandle) {
  try {
    await store("readwrite", (s) => s.put(handle, "folder"));
    sessionStorage.setItem(MARK, "1");
  } catch {}
}

/**
 * The folder picked earlier in this session: `ready` when the browser still lets the page read it, else it needs
 * the user's click again (`grant`). A handle from an earlier session is forgotten.
 */
export async function recall(): Promise<{ handle: FileSystemDirectoryHandle; ready: boolean } | null> {
  try {
    if (!sessionStorage.getItem(MARK)) {
      await store("readwrite", (s) => s.delete("folder"));
      return null;
    }
    const handle = await store<FileSystemDirectoryHandle | undefined>("readonly", (s) => s.get("folder"));
    if (!handle) return null;
    const state = await (handle as Permissions).queryPermission?.({ mode: "read" });
    return { handle, ready: state === "granted" };
  } catch {
    return null;
  }
}

/** Asks the browser again for a remembered folder (a click). */
export async function grant(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const state = await (handle as Permissions).requestPermission?.({ mode: "read" });
  return state === "granted";
}
