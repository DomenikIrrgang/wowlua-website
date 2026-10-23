export function syncContent(o: {
  root: string;
  repo: string;
  local?: { path: string; copy: (dest: string) => Promise<void> };
  token?: string;
  force?: boolean;
  log?: (msg: string) => void;
}): Promise<boolean>;

export const WANTED: string[];

export function hasContent(root: string): boolean;
