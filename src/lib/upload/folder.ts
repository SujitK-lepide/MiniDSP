import { ALLOWED_EXTENSION } from './limits';

export const FOLDER_MAX_FILES = 50;

export type FolderEntry = { file: File; path: string };

export type SkippedEntry = { path: string; reason: string };

/** Display path inside the chosen folder (browsers set webkitRelativePath for directory pickers). */
export function relativePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

/**
 * Decides which files from a folder selection are sent to the server: only .csv/.txt, in path
 * order, at most `max`. Everything else is listed as skipped with a reason. Size/content checks
 * stay on the server (the authority).
 */
export function planFolderScan(files: readonly File[], max = FOLDER_MAX_FILES) {
  const sorted = [...files]
    .map((file) => ({ file, path: relativePath(file) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const toScan: FolderEntry[] = [];
  const skipped: SkippedEntry[] = [];
  for (const entry of sorted) {
    if (!ALLOWED_EXTENSION.test(entry.file.name)) skipped.push({ path: entry.path, reason: 'Not a .csv or .txt file' });
    else if (toScan.length >= max) skipped.push({ path: entry.path, reason: `Over the ${max}-file limit for one folder scan` });
    else toScan.push(entry);
  }
  return { toScan, skipped };
}
