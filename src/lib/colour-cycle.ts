/**
 * Colour cycle sequence helpers (pure).
 */

import type { CycleColourItem, CycleOrder } from "@/lib/colour-screen-config";

export function enabledCycleItems(
  items: readonly CycleColourItem[],
): CycleColourItem[] {
  return items.filter((item) => item.enabled);
}

/**
 * Advance index within enabled items. Returns the new absolute index in `items`,
 * or the same index if there are no enabled colours.
 */
export function nextCycleIndex(
  items: readonly CycleColourItem[],
  currentIndex: number,
  order: CycleOrder,
  loop: boolean,
): number {
  const enabled = enabledCycleItems(items);
  if (enabled.length === 0) return currentIndex;

  if (order === "random") {
    if (enabled.length === 1) {
      return items.findIndex((item) => item.id === enabled[0].id);
    }
    const currentId = items[currentIndex]?.id;
    let pick = enabled[Math.floor(Math.random() * enabled.length)];
    let guard = 0;
    while (pick.id === currentId && guard < 8) {
      pick = enabled[Math.floor(Math.random() * enabled.length)];
      guard += 1;
    }
    return items.findIndex((item) => item.id === pick.id);
  }

  const enabledIndexes = items
    .map((item, index) => (item.enabled ? index : -1))
    .filter((index) => index >= 0);

  const position = enabledIndexes.indexOf(currentIndex);
  const start = position >= 0 ? position : -1;
  const nextPos = start + 1;

  if (nextPos < enabledIndexes.length) {
    return enabledIndexes[nextPos];
  }
  if (loop) {
    return enabledIndexes[0];
  }
  return currentIndex;
}

export function previousCycleIndex(
  items: readonly CycleColourItem[],
  currentIndex: number,
  loop: boolean,
): number {
  const enabledIndexes = items
    .map((item, index) => (item.enabled ? index : -1))
    .filter((index) => index >= 0);

  if (enabledIndexes.length === 0) return currentIndex;

  const position = enabledIndexes.indexOf(currentIndex);
  const start = position >= 0 ? position : 0;
  const prevPos = start - 1;

  if (prevPos >= 0) {
    return enabledIndexes[prevPos];
  }
  if (loop) {
    return enabledIndexes[enabledIndexes.length - 1];
  }
  return currentIndex;
}

export function moveCycleItem(
  items: readonly CycleColourItem[],
  fromIndex: number,
  toIndex: number,
): CycleColourItem[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}
