import { describe, expect, it } from "vitest";
import {
  DEFAULT_PASSWORD_OPTIONS,
  type PasswordOptions,
} from "@/lib/password-generator";
import {
  estimatePasswordStrength,
  passwordLengthProgress,
  veryStrongStarCount,
} from "@/lib/password-strength";

function options(overrides: Partial<PasswordOptions> = {}): PasswordOptions {
  return { ...DEFAULT_PASSWORD_OPTIONS, ...overrides };
}

describe("passwordLengthProgress", () => {
  it("is 0 at the minimum length and 1 at the maximum", () => {
    expect(passwordLengthProgress(8)).toBe(0);
    expect(passwordLengthProgress(64)).toBe(1);
  });
});

describe("veryStrongStarCount", () => {
  it("maps length bands to 1–5 stars", () => {
    expect(veryStrongStarCount(13)).toBe(1);
    expect(veryStrongStarCount(23)).toBe(1);
    expect(veryStrongStarCount(24)).toBe(2);
    expect(veryStrongStarCount(34)).toBe(2);
    expect(veryStrongStarCount(35)).toBe(3);
    expect(veryStrongStarCount(45)).toBe(3);
    expect(veryStrongStarCount(46)).toBe(4);
    expect(veryStrongStarCount(56)).toBe(4);
    expect(veryStrongStarCount(57)).toBe(5);
    expect(veryStrongStarCount(64)).toBe(5);
  });
});

describe("estimatePasswordStrength", () => {
  it("rates short or limited options as weaker than long default options", () => {
    const weak = estimatePasswordStrength(
      8,
      options({
        uppercase: false,
        lowercase: true,
        numbers: false,
        symbols: false,
      }),
    );
    const strong = estimatePasswordStrength(16, DEFAULT_PASSWORD_OPTIONS);

    expect(weak.level).toBeLessThan(strong.level);
    expect(weak.label).toBe("Weak");
    expect(strong.label).toMatch(/Strong|Very strong/);
  });

  it("returns Very strong for default options at typical lengths", () => {
    const estimate = estimatePasswordStrength(16, DEFAULT_PASSWORD_OPTIONS);
    expect(estimate.label).toBe("Very strong");
    expect(estimate.level).toBe(3);
    expect(estimate.sparkleCount).toBe(1);
  });

  it("increases Very strong sparkle count across length bands", () => {
    expect(
      estimatePasswordStrength(20, DEFAULT_PASSWORD_OPTIONS).sparkleCount,
    ).toBe(1);
    expect(
      estimatePasswordStrength(30, DEFAULT_PASSWORD_OPTIONS).sparkleCount,
    ).toBe(2);
    expect(
      estimatePasswordStrength(40, DEFAULT_PASSWORD_OPTIONS).sparkleCount,
    ).toBe(3);
    expect(
      estimatePasswordStrength(50, DEFAULT_PASSWORD_OPTIONS).sparkleCount,
    ).toBe(4);
    expect(
      estimatePasswordStrength(60, DEFAULT_PASSWORD_OPTIONS).sparkleCount,
    ).toBe(5);
  });

  it("keeps sparkle count at 1 when the label is not Very strong", () => {
    const estimate = estimatePasswordStrength(
      64,
      options({
        uppercase: false,
        lowercase: true,
        numbers: false,
        symbols: false,
      }),
    );

    expect(estimate.level).toBeLessThan(3);
    expect(estimate.sparkleCount).toBe(1);
  });

  it("caps a single character category at Fair or weaker", () => {
    const estimate = estimatePasswordStrength(
      64,
      options({
        uppercase: false,
        lowercase: true,
        numbers: false,
        symbols: false,
      }),
    );

    expect(estimate.level).toBeLessThanOrEqual(1);
  });

  it("increases the meter as length grows within Very strong", () => {
    const at16 = estimatePasswordStrength(16, DEFAULT_PASSWORD_OPTIONS);
    const at48 = estimatePasswordStrength(48, DEFAULT_PASSWORD_OPTIONS);

    expect(at16.label).toBe("Very strong");
    expect(at48.label).toBe("Very strong");
    expect(at48.meterPercent).toBeGreaterThan(at16.meterPercent);
  });

  it("uses a smaller sparkle for Strong than for Very strong", () => {
    const veryStrong = estimatePasswordStrength(16, DEFAULT_PASSWORD_OPTIONS);
    expect(veryStrong.level).toBe(3);
    expect(veryStrong.sparkleSizePx).toBe(18);
  });

  it("can land on Fair for mid-entropy option mixes", () => {
    const estimate = estimatePasswordStrength(
      12,
      options({
        uppercase: true,
        lowercase: true,
        numbers: false,
        symbols: false,
        avoidAmbiguous: false,
      }),
    );

    expect(["Fair", "Strong", "Weak"]).toContain(estimate.label);
  });

  it("caps two character categories at Strong or weaker", () => {
    const estimate = estimatePasswordStrength(
      64,
      options({
        uppercase: true,
        lowercase: true,
        numbers: false,
        symbols: false,
        avoidAmbiguous: false,
      }),
    );

    expect(estimate.level).toBeLessThanOrEqual(2);
    expect(estimate.label).not.toBe("Very strong");
  });
});
