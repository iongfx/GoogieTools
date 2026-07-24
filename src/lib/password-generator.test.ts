import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS_CHARS,
  buildCharacterPool,
  clampPasswordLength,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  getCategoryCharset,
  getEnabledCategories,
  PASSWORD_LENGTH,
  secureRandomChar,
  secureRandomInt,
  secureShuffle,
  validatePasswordOptions,
  wouldDisableLastCategory,
  type CharacterCategory,
  type PasswordOptions,
} from "@/lib/password-generator";

const AMBIGUOUS_SET = new Set(AMBIGUOUS_CHARS.split(""));

function options(overrides: Partial<PasswordOptions> = {}): PasswordOptions {
  return { ...DEFAULT_PASSWORD_OPTIONS, ...overrides };
}

function assertOkPassword(
  result: ReturnType<typeof generatePassword>,
): asserts result is { ok: true; password: string } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
}

function passwordUsesOnlyPool(password: string, pool: string): boolean {
  const allowed = new Set(pool.split(""));
  return [...password].every((char) => allowed.has(char));
}

function passwordIncludesCategory(
  password: string,
  category: CharacterCategory,
  avoidAmbiguous: boolean,
): boolean {
  const charset = new Set(getCategoryCharset(category, avoidAmbiguous).split(""));
  return [...password].some((char) => charset.has(char));
}

describe("clampPasswordLength", () => {
  it("clamps below the minimum up to the minimum", () => {
    expect(clampPasswordLength(3)).toBe(PASSWORD_LENGTH.min);
    expect(clampPasswordLength(0)).toBe(PASSWORD_LENGTH.min);
  });

  it("clamps above the maximum down to the maximum", () => {
    expect(clampPasswordLength(100)).toBe(PASSWORD_LENGTH.max);
  });

  it("keeps values inside the supported range", () => {
    expect(clampPasswordLength(PASSWORD_LENGTH.default)).toBe(
      PASSWORD_LENGTH.default,
    );
    expect(clampPasswordLength(32)).toBe(32);
  });

  it("falls back to the default for non-finite values", () => {
    expect(clampPasswordLength(Number.NaN)).toBe(PASSWORD_LENGTH.default);
    expect(clampPasswordLength(Number.POSITIVE_INFINITY)).toBe(
      PASSWORD_LENGTH.default,
    );
  });
});

describe("validatePasswordOptions", () => {
  it("rejects when every character category is disabled", () => {
    const result = validatePasswordOptions(
      options({
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.enabledCategories).toEqual([]);
  });

  it("accepts the default options", () => {
    const result = validatePasswordOptions(DEFAULT_PASSWORD_OPTIONS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.enabledCategories).toEqual([
        "uppercase",
        "lowercase",
        "numbers",
        "symbols",
      ]);
    }
  });
});

describe("wouldDisableLastCategory", () => {
  it("is true when turning off the only remaining category", () => {
    const onlyLowercase = options({
      uppercase: false,
      lowercase: true,
      numbers: false,
      symbols: false,
    });

    expect(wouldDisableLastCategory(onlyLowercase, "lowercase")).toBe(true);
  });

  it("is false when another category would remain enabled", () => {
    expect(
      wouldDisableLastCategory(DEFAULT_PASSWORD_OPTIONS, "symbols"),
    ).toBe(false);
  });
});

describe("generatePassword", () => {
  it("honours the requested length at min, default, and max", () => {
    for (const length of [
      PASSWORD_LENGTH.min,
      PASSWORD_LENGTH.default,
      PASSWORD_LENGTH.max,
    ]) {
      const result = generatePassword(length, DEFAULT_PASSWORD_OPTIONS);
      assertOkPassword(result);
      expect(result.password).toHaveLength(length);
    }
  });

  it("clamps out-of-range lengths before generating", () => {
    const tooShort = generatePassword(4, DEFAULT_PASSWORD_OPTIONS);
    assertOkPassword(tooShort);
    expect(tooShort.password).toHaveLength(PASSWORD_LENGTH.min);

    const tooLong = generatePassword(80, DEFAULT_PASSWORD_OPTIONS);
    assertOkPassword(tooLong);
    expect(tooLong.password).toHaveLength(PASSWORD_LENGTH.max);
  });

  it("includes only characters from enabled categories", () => {
    const opts = options({
      uppercase: true,
      lowercase: true,
      numbers: false,
      symbols: false,
      avoidAmbiguous: false,
    });
    const pool = buildCharacterPool(opts);
    const result = generatePassword(16, opts);
    assertOkPassword(result);

    expect(passwordUsesOnlyPool(result.password, pool)).toBe(true);
    expect(/[0-9]/.test(result.password)).toBe(false);
  });

  it("includes at least one character from every enabled category", () => {
    const opts = DEFAULT_PASSWORD_OPTIONS;
    const enabled = getEnabledCategories(opts);

    // Repeat a few times so a flaky guarantee would be more likely to fail.
    for (let i = 0; i < 20; i += 1) {
      const result = generatePassword(16, opts);
      assertOkPassword(result);

      for (const category of enabled) {
        expect(
          passwordIncludesCategory(
            result.password,
            category,
            opts.avoidAmbiguous,
          ),
        ).toBe(true);
      }
    }
  });

  it("excludes ambiguous characters when that option is enabled", () => {
    for (let i = 0; i < 15; i += 1) {
      const result = generatePassword(32, options({ avoidAmbiguous: true }));
      assertOkPassword(result);

      for (const char of result.password) {
        expect(AMBIGUOUS_SET.has(char)).toBe(false);
      }
    }
  });

  it("may include ambiguous characters when that option is disabled", () => {
    // Not a proof of randomness — only that the filter is not always on.
    const opts = options({
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false,
      avoidAmbiguous: false,
    });
    const pool = buildCharacterPool(opts);
    expect([...AMBIGUOUS_CHARS].some((char) => pool.includes(char))).toBe(true);

    const result = generatePassword(24, opts);
    assertOkPassword(result);
    expect(passwordUsesOnlyPool(result.password, pool)).toBe(true);
  });

  it("fails when all character categories are disabled", () => {
    const result = generatePassword(
      16,
      options({
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("does not always return the same password across generations", () => {
    const passwords = new Set<string>();

    for (let i = 0; i < 12; i += 1) {
      const result = generatePassword(16, DEFAULT_PASSWORD_OPTIONS);
      assertOkPassword(result);
      passwords.add(result.password);
    }

    expect(passwords.size).toBeGreaterThan(1);
  });
});

describe("secureShuffle", () => {
  it("returns the same characters and length", () => {
    const input = ["a", "b", "c", "d", "e", "f", "1", "2", "!"];
    const shuffled = secureShuffle(input);

    expect(shuffled).toHaveLength(input.length);
    expect([...shuffled].sort().join("")).toBe([...input].sort().join(""));
  });

  it("does not mutate the original array", () => {
    const input = ["x", "y", "z"];
    const copy = [...input];
    secureShuffle(input);
    expect(input).toEqual(copy);
  });
});

describe("getCategoryCharset", () => {
  it("removes ambiguous characters from each category when requested", () => {
    const upper = getCategoryCharset("uppercase", true);
    const lower = getCategoryCharset("lowercase", true);
    const numbers = getCategoryCharset("numbers", true);

    expect(upper.includes("I")).toBe(false);
    expect(upper.includes("O")).toBe(false);
    expect(lower.includes("l")).toBe(false);
    expect(lower.includes("o")).toBe(false);
    expect(numbers.includes("1")).toBe(false);
    expect(numbers.includes("0")).toBe(false);
  });
});

describe("secureRandomInt / secureRandomChar", () => {
  it("returns values in range for secureRandomInt", () => {
    for (let i = 0; i < 20; i += 1) {
      const value = secureRandomInt(10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });

  it("rejects invalid maxExclusive values", () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError);
    expect(() => secureRandomInt(-1)).toThrow(RangeError);
    expect(() => secureRandomInt(1.5)).toThrow(RangeError);
  });

  it("rejects an empty charset for secureRandomChar", () => {
    expect(() => secureRandomChar("")).toThrow(
      "Cannot choose a character from an empty set.",
    );
  });
});
