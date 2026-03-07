import { getNumberedDirs } from "../parsing/get-numbered-dirs.js";
import type { DirEntry } from "../types/dir-entry.js";
import type { Issue } from "../types/issue.js";

function computeGroupBase(maxIndex: number): number {
  if (maxIndex <= 10) return 1;
  return 10 ** (Math.floor(Math.log10(maxIndex)) - 1);
}

function minGapForDepth(depth: number, groupBase: number): number {
  if (depth === 0) {
    return groupBase / 10;
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
  groupBase: number,
): number | null {
  if (depth === 0) {
    const base = Math.floor(current.index / groupBase) * groupBase;
    const boundary = nextSibling ? nextSibling.index : maxIndex;
    return boundary - base;
  }

  if (!nextSibling) {
    return null;
  }
  return nextSibling.index - current.index;
}

function computeFloor(current: DirEntry, depth: number, groupBase: number): number {
  if (depth !== 0) {
    return 1;
  }
  const base = Math.floor(current.index / groupBase) * groupBase;
  return current.index - base + 1;
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
  groupBase: number,
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

  const minGap = minGapForDepth(depth, groupBase);
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
  const groupBase = computeGroupBase(maxIndex);
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
    const ceiling = computeCeiling(current, nextSibling, depth, maxIndex, groupBase);
    const floor = computeFloor(current, depth, groupBase);
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
        groupBase,
        rel,
        issues,
      );
    }

    validateLevel(current.path, rootPath, issues, maxIndex, depth + 1);
  }
}
