import { getNumberedDirs } from "../parsing/get-numbered-dirs.js";
import type { DirEntry } from "../types/dir-entry.js";
import type { Issue } from "../types/issue.js";

function minGapForDepth(depth: number): number {
  if (depth === 0) {
    return 100;
  }
  if (depth === 1) {
    return 10;
  }
  return 3;
}

function computeCeiling(
  current: DirEntry,
  nextSibling: DirEntry | undefined,
  depth: number,
  maxIndex: number,
): number | null {
  if (depth === 0) {
    const thousandBase = Math.floor(current.index / 1000) * 1000;
    const boundary = nextSibling ? nextSibling.index : maxIndex;
    return boundary - thousandBase;
  }

  if (!nextSibling) {
    return null;
  }
  return nextSibling.index - current.index;
}

function computeFloor(current: DirEntry, depth: number): number {
  if (depth !== 0) {
    return 1;
  }
  const thousandBase = Math.floor(current.index / 1000) * 1000;
  return current.index - thousandBase + 1;
}

function checkFloorViolations(
  children: DirEntry[],
  current: DirEntry,
  floor: number,
  rel: string,
  issues: Issue[],
): void {
  for (const child of children) {
    if (child.index < floor) {
      issues.push({
        severity: "error",
        path: `${rel}/${child.name}`,
        message:
          `index ${child.index} < ${floor} — ` + `below the range of "${current.name}"`,
      });
    }
  }
}

function checkCeilingViolations(
  children: DirEntry[],
  ceiling: number,
  nextSibling: DirEntry | undefined,
  maxIndex: number,
  depth: number,
  rel: string,
  issues: Issue[],
): void {
  for (const child of children) {
    if (child.index >= ceiling) {
      const boundaryName = nextSibling
        ? `sibling "${nextSibling.name}"`
        : `namespace limit ${maxIndex}`;
      issues.push({
        severity: "error",
        path: `${rel}/${child.name}`,
        message: `index ${child.index} >= ${ceiling} — ` + `overlaps ${boundaryName}`,
      });
    }
  }

  const minGap = minGapForDepth(depth);
  if (ceiling < minGap) {
    issues.push({
      severity: "warning",
      path: rel,
      message: `ceiling ${ceiling} < ${minGap} — namespace is tight, consider rebalancing`,
    });
  }
}

export function validateLevel(
  parentPath: string,
  rootPath: string,
  issues: Issue[],
  maxIndex: number,
  depth = 0,
): void {
  const dirs = getNumberedDirs(parentPath);
  if (dirs.length === 0) {
    return;
  }

  for (let i = 0; i < dirs.length; i++) {
    const current = dirs[i];
    if (!current) {
      continue;
    }
    const nextSibling = dirs[i + 1];
    const ceiling = computeCeiling(current, nextSibling, depth, maxIndex);
    const floor = computeFloor(current, depth);
    const rel = current.path.replace(`${rootPath}/`, "");

    if (depth === 0 && current.index >= maxIndex) {
      issues.push({
        severity: "error",
        path: rel,
        message: `index ${current.index} >= ${maxIndex} — exceeds namespace limit`,
      });
    }

    const children = getNumberedDirs(current.path);

    checkFloorViolations(children, current, floor, rel, issues);

    if (ceiling !== null) {
      checkCeilingViolations(
        children,
        ceiling,
        nextSibling,
        maxIndex,
        depth,
        rel,
        issues,
      );
    }

    validateLevel(current.path, rootPath, issues, maxIndex, depth + 1);
  }
}
