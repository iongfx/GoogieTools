/**
 * Browser-based password generation utilities.
 *
 * Security notes:
 * - Uses Web Crypto (`crypto.getRandomValues`) — never `Math.random()`.
 * - Maps random bytes onto character sets with rejection sampling to avoid
 *   modulo bias.
 * - Guarantees at least one character from every enabled category, then
 *   fills the rest from the full pool and securely shuffles the result.
 * - Generation stays entirely in the browser; callers must not persist,
 *   log, or transmit passwords.
 */

/** Centralized length bounds — change here to adjust the tool. */
export const PASSWORD_LENGTH = {
  min: 8,
  max: 64,
  default: 16,
} as const;

/**
 * Characters commonly confused when reading or typing passwords.
 * When “Avoid ambiguous characters” is enabled, these are removed from
 * every enabled category pool:
 * - `I` (uppercase i)
 * - `l` (lowercase L)
 * - `1` (one)
 * - `O` (uppercase o)
 * - `o` (lowercase o)
 * - `0` (zero)
 */
export const AMBIGUOUS_CHARS = "Il1Oo0" as const;

const AMBIGUOUS_SET = new Set<string>(AMBIGUOUS_CHARS.split(""));

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  /**
   * Readable symbol set — avoids spaces and characters that are awkward
   * in forms or shell contexts while still covering common requirements.
   */
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

export type CharacterCategory = keyof typeof CHARSETS;

export type PasswordOptions = {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
};

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  avoidAmbiguous: true,
};

export type CategoryValidation =
  | { ok: true; enabledCategories: CharacterCategory[] }
  | { ok: false; error: string; enabledCategories: CharacterCategory[] };

const CATEGORY_ORDER: CharacterCategory[] = [
  "uppercase",
  "lowercase",
  "numbers",
  "symbols",
];

/** Clamp a length into the supported range. */
export function clampPasswordLength(value: number): number {
  if (!Number.isFinite(value)) return PASSWORD_LENGTH.default;
  return Math.min(
    PASSWORD_LENGTH.max,
    Math.max(PASSWORD_LENGTH.min, Math.round(value)),
  );
}

function stripAmbiguous(charset: string, avoidAmbiguous: boolean): string {
  if (!avoidAmbiguous) return charset;
  return [...charset].filter((char) => !AMBIGUOUS_SET.has(char)).join("");
}

/** Build the character pool for a single category after option filters. */
export function getCategoryCharset(
  category: CharacterCategory,
  avoidAmbiguous: boolean,
): string {
  return stripAmbiguous(CHARSETS[category], avoidAmbiguous);
}

/** Categories the user has enabled. */
export function getEnabledCategories(
  options: PasswordOptions,
): CharacterCategory[] {
  return CATEGORY_ORDER.filter((category) => options[category]);
}

/**
 * Validate that at least one character category is enabled and that each
 * enabled category still has characters after ambiguous filtering.
 */
export function validatePasswordOptions(
  options: PasswordOptions,
): CategoryValidation {
  const enabledCategories = getEnabledCategories(options);

  if (enabledCategories.length === 0) {
    return {
      ok: false,
      error: "Turn on at least one character type to generate a password.",
      enabledCategories,
    };
  }

  for (const category of enabledCategories) {
    const charset = getCategoryCharset(category, options.avoidAmbiguous);
    if (charset.length === 0) {
      return {
        ok: false,
        error:
          "These settings leave no characters available. Turn off “Avoid ambiguous characters” or enable another character type.",
        enabledCategories,
      };
    }
  }

  return { ok: true, enabledCategories };
}

/** Combined character pool for all enabled categories. */
export function buildCharacterPool(options: PasswordOptions): string {
  const validation = validatePasswordOptions(options);
  if (!validation.ok) return "";

  return validation.enabledCategories
    .map((category) => getCategoryCharset(category, options.avoidAmbiguous))
    .join("");
}

/**
 * Unbiased integer in `[0, maxExclusive)`.
 * Uses rejection sampling so values near 2^32 do not skew the result.
 */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive integer.");
  }

  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Secure randomness is not available in this environment.");
  }

  const maxUint32 = 0x1_0000_0000; // 2^32
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const buffer = new Uint32Array(1);

  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0]!;
  } while (value >= limit);

  return value % maxExclusive;
}

/** Pick one character from a non-empty charset using secure randomness. */
export function secureRandomChar(charset: string): string {
  if (charset.length === 0) {
    throw new Error("Cannot choose a character from an empty set.");
  }
  return charset[secureRandomInt(charset.length)]!;
}

/** Fisher–Yates shuffle using secure randomness. Returns a new array. */
export function secureShuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    const current = result[i]!;
    result[i] = result[j]!;
    result[j] = current;
  }
  return result;
}

export type GeneratePasswordResult =
  | { ok: true; password: string }
  | { ok: false; error: string };

/**
 * Generate a password of the requested length from the given options.
 * Ensures every enabled category appears at least once.
 */
export function generatePassword(
  length: number,
  options: PasswordOptions,
): GeneratePasswordResult {
  const clampedLength = clampPasswordLength(length);
  const validation = validatePasswordOptions(options);

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const { enabledCategories } = validation;

  if (clampedLength < enabledCategories.length) {
    return {
      ok: false,
      error: `Password length must be at least ${enabledCategories.length} so every selected character type can appear.`,
    };
  }

  const categoryPools = enabledCategories.map((category) =>
    getCategoryCharset(category, options.avoidAmbiguous),
  );
  const fullPool = categoryPools.join("");

  const chars: string[] = categoryPools.map((pool) => secureRandomChar(pool));

  for (let i = chars.length; i < clampedLength; i += 1) {
    chars.push(secureRandomChar(fullPool));
  }

  const password = secureShuffle(chars).join("");

  return { ok: true, password };
}

/**
 * Returns true when toggling `category` off would leave zero categories
 * enabled. Used by the UI to block invalid configurations.
 */
export function wouldDisableLastCategory(
  options: PasswordOptions,
  category: CharacterCategory,
): boolean {
  if (!options[category]) return false;
  return getEnabledCategories(options).length === 1;
}
