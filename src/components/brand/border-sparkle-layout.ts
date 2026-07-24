/**
 * Random vertical placement for a pair of sparkles on left/right borders.
 * Keep a little inset so bursts aren't clipped on the extreme corners.
 */

export type BorderSparkleLayout = {
  leftOffsetPercent: number;
  rightOffsetPercent: number;
  /** When true, the right sparkle starts before the left. */
  rightFirst: boolean;
};

export const DEFAULT_BORDER_SPARKLE_LAYOUT: BorderSparkleLayout = {
  leftOffsetPercent: 28,
  rightOffsetPercent: 72,
  rightFirst: false,
};

function randomBorderOffsetPercent(): number {
  return 8 + Math.round(Math.random() * 84);
}

export function createBorderSparkleLayout(): BorderSparkleLayout {
  return {
    leftOffsetPercent: randomBorderOffsetPercent(),
    rightOffsetPercent: randomBorderOffsetPercent(),
    rightFirst: Math.random() < 0.5,
  };
}
