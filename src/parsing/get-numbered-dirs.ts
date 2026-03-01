import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import type { DirEntry } from "../types/dir-entry.js";
import { parseIndex } from "./parse-index.js";

export function getNumberedDirs(parentPath: string): DirEntry[] {
  let entries: string[];
  try {
    entries = readdirSync(parentPath);
  } catch {
    return [];
  }

  const dirs: DirEntry[] = [];
  for (const name of entries) {
    const index = parseIndex(name);
    if (index === null) {
      continue;
    }
    try {
      if (!statSync(join(parentPath, name)).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    dirs.push({ name, index, path: join(parentPath, name) });
  }
  return dirs.sort((a, b) => a.index - b.index);
}
