/**
 * Estimated password strength for UI feedback.
 *
 * This is a simple, explainable heuristic based on length and character-pool
 * size — not a guarantee against cracking. Keep it separate from generation.
 */

import {
  buildCharacterPool,
  clampPasswordLength,
  getEnabledCategories,
  PASSWORD_LENGTH,
  type PasswordOptions,
} from "@/lib/password-generator";

export type StrengthLabel = "Weak" | "Fair" | "Strong" | "Very strong";

export type StrengthEstimate = {
  /** 0–3 index matching Weak → Very strong */
  level: 0 | 1 | 2 | 3;
  label: StrengthLabel;
  /** Approximate entropy in bits (rounded, not false precision). */
  estimatedBits: number;
  /** Fill percentage for a restrained progress bar (0–100). */
  meterPercent: number;
  /** Fixed sparkle pixel size for this strength label. */
  sparkleSizePx: number;
  /**
   * How many sparkles to show.
   * Weak / Fair / Strong: always 1.
   * Very strong: 1–5 based on length bands (see `veryStrongStarCount`).
   */
  sparkleCount: 1 | 2 | 3 | 4 | 5;
};

const LABELS: StrengthLabel[] = ["Weak", "Fair", "Strong", "Very strong"];

/**
 * Discrete sparkle sizes by label.
 * Strong is intentionally smaller; Very strong stays readable in multi-star rows.
 */
const SPARKLE_SIZE_PX_BY_LEVEL = [
  14, // Weak
  18, // Fair
  14, // Strong
  18, // Very strong — count increases with length
] as const;

function log2(value: number): number {
  return Math.log(value) / Math.LN2;
}

/** 0–1 progress across the supported password length range. */
export function passwordLengthProgress(length: number): number {
  const clamped = clampPasswordLength(length);
  return (
    (clamped - PASSWORD_LENGTH.min) /
    (PASSWORD_LENGTH.max - PASSWORD_LENGTH.min)
  );
}

/**
 * Star count for “Very strong” passwords by length band:
 * - 13–23 → 1
 * - 24–34 → 2
 * - 35–45 → 3
 * - 46–56 → 4
 * - 57–64 → 5
 *
 * Lengths below 13 still map to 1 if the label is somehow Very strong.
 */
export function veryStrongStarCount(length: number): 1 | 2 | 3 | 4 | 5 {
  const n = clampPasswordLength(length);
  if (n <= 23) return 1;
  if (n <= 34) return 2;
  if (n <= 45) return 3;
  if (n <= 56) return 4;
  return 5;
}

/**
 * Estimate strength from the current length and enabled character options.
 * Uses approximate entropy: length × log2(pool size).
 */
export function estimatePasswordStrength(
  length: number,
  options: PasswordOptions,
): StrengthEstimate {
  const clampedLength = clampPasswordLength(length);
  const categories = getEnabledCategories(options);
  const pool = buildCharacterPool(options);
  const poolSize = Math.max(pool.length, 1);
  const lengthProgress = passwordLengthProgress(clampedLength);

  // Rough entropy for a uniformly random password from this pool.
  const estimatedBits = Math.round(clampedLength * log2(poolSize));

  let level: 0 | 1 | 2 | 3;

  if (categories.length === 0 || estimatedBits < 40 || clampedLength < 10) {
    level = 0;
  } else if (estimatedBits < 60) {
    level = 1;
  } else if (estimatedBits < 80) {
    level = 2;
  } else {
    level = 3;
  }

  // Soften ratings when only one or two character types are enabled.
  if (categories.length === 1 && level > 1) {
    level = 1;
  } else if (categories.length === 2 && level > 2) {
    level = 2;
  }

  // Continuous meter: label band + length progress so the bar keeps
  // moving after “Very strong” as length climbs toward 64.
  const bandFloor = (level / 3) * 55;
  const lengthBoost = lengthProgress * 45;
  const meterPercent = Math.min(100, Math.round(bandFloor + lengthBoost));

  const sparkleSizePx = SPARKLE_SIZE_PX_BY_LEVEL[level]!;
  const sparkleCount =
    level === 3 ? veryStrongStarCount(clampedLength) : 1;

  return {
    level,
    label: LABELS[level]!,
    estimatedBits,
    meterPercent,
    sparkleSizePx,
    sparkleCount,
  };
}
