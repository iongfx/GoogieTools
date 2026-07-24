import { describe, expect, it } from "vitest";
import {
  buildOutputFilename,
  calculateSizeChange,
  formatExactFileSize,
  formatFileSize,
  looksLikeAnimatedWebp,
  parseDimensionInput,
  renameBasename,
  sanitizeFilename,
  stripExtension,
  uniquifyFilenames,
  validateBatchAddition,
  validateDecodedDimensions,
  validateImageFile,
  validateOutputDimensions,
  validateQuality,
} from "@/lib/image-file-utils";
import { IMAGE_BATCH_LIMITS } from "@/lib/image-compressor-config";

describe("validateImageFile", () => {
  it("accepts supported MIME types", () => {
    expect(validateImageFile({ name: "a.jpg", type: "image/jpeg", size: 10 })).toEqual({
      ok: true,
      kind: "jpeg",
    });
    expect(validateImageFile({ name: "a.png", type: "image/png", size: 10 })).toEqual({
      ok: true,
      kind: "png",
    });
    expect(validateImageFile({ name: "a.webp", type: "image/webp", size: 10 })).toEqual({
      ok: true,
      kind: "webp",
    });
  });

  it("accepts supported extensions when MIME is empty", () => {
    expect(validateImageFile({ name: "photo.JPEG", type: "", size: 10 })).toEqual({
      ok: true,
      kind: "jpeg",
    });
  });

  it("rejects SVG", () => {
    const result = validateImageFile({
      name: "icon.svg",
      type: "image/svg+xml",
      size: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/SVG/i);
    }
  });

  it("rejects GIF", () => {
    const result = validateImageFile({
      name: "anim.gif",
      type: "image/gif",
      size: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/GIF/i);
    }
  });

  it("rejects unsupported types", () => {
    const result = validateImageFile({
      name: "raw.heic",
      type: "image/heic",
      size: 10,
    });
    expect(result.ok).toBe(false);
  });

  it("prefers a supported MIME when the extension disagrees", () => {
    const result = validateImageFile({
      name: "photo.txt",
      type: "image/jpeg",
      size: 10,
    });
    expect(result).toEqual({ ok: true, kind: "jpeg" });
  });

  it("rejects when MIME and extension are both unsupported", () => {
    const result = validateImageFile({
      name: "notes.txt",
      type: "text/plain",
      size: 10,
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateDecodedDimensions", () => {
  it("rejects invalid and oversized decoded dimensions", () => {
    expect(validateDecodedDimensions(0, 100)).toMatch(/corrupted/i);
    expect(validateDecodedDimensions(100, -1)).toMatch(/corrupted/i);
    expect(
      validateDecodedDimensions(
        IMAGE_BATCH_LIMITS.maxDecodedWidth + 1,
        100,
      ),
    ).toMatch(/decode limit/i);
  });

  it("accepts normal dimensions", () => {
    expect(validateDecodedDimensions(4000, 3000)).toBeNull();
  });
});

describe("looksLikeAnimatedWebp", () => {
  it("detects ANIM chunks in a RIFF WEBP prefix", () => {
    const bytes = new Uint8Array(64);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    bytes.set([0x41, 0x4e, 0x49, 0x4d], 12); // ANIM
    expect(looksLikeAnimatedWebp(bytes.buffer)).toBe(true);
  });

  it("returns false for non-WebP buffers", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(looksLikeAnimatedWebp(bytes.buffer)).toBe(false);
  });
});

describe("validateBatchAddition", () => {
  it("enforces file count limit", () => {
    const existing = Array.from({ length: IMAGE_BATCH_LIMITS.maxFiles }, (_, i) => ({
      name: `f${i}.jpg`,
      type: "image/jpeg",
      size: 100,
    }));
    const result = validateBatchAddition(existing, [
      { name: "extra.jpg", type: "image/jpeg", size: 100 },
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.message).toMatch(/Batch limit/i);
  });

  it("enforces per-file size limit", () => {
    const result = validateBatchAddition([], [
      {
        name: "huge.jpg",
        type: "image/jpeg",
        size: IMAGE_BATCH_LIMITS.maxFileBytes + 1,
      },
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.message).toMatch(/larger than/i);
  });

  it("enforces combined size limit", () => {
    const existing = [
      {
        name: "a.jpg",
        type: "image/jpeg",
        size: IMAGE_BATCH_LIMITS.maxTotalBytes - 1000,
      },
    ];
    const result = validateBatchAddition(existing, [
      { name: "b.jpg", type: "image/jpeg", size: 2000 },
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.message).toMatch(/combined batch limit/i);
  });
});

describe("validateOutputDimensions", () => {
  it("rejects zero, negative, decimals, and NaN", () => {
    expect(validateOutputDimensions(0, 100, { required: true }).ok).toBe(false);
    expect(validateOutputDimensions(-1, 100, { required: true }).ok).toBe(false);
    expect(validateOutputDimensions(10.5, 100, { required: true }).ok).toBe(false);
    expect(validateOutputDimensions(Number.NaN, 100, { required: true }).ok).toBe(
      false,
    );
  });

  it("rejects values above the output limit", () => {
    const result = validateOutputDimensions(9000, 100, { required: true });
    expect(result.ok).toBe(false);
    expect(result.widthError).toMatch(/cannot exceed/i);
  });

  it("accepts valid whole-pixel dimensions", () => {
    expect(validateOutputDimensions(450, 300, { required: true }).ok).toBe(true);
  });

  it("allows null dimensions when not required", () => {
    expect(validateOutputDimensions(null, null, { required: false }).ok).toBe(true);
  });
});

describe("validateQuality", () => {
  it("accepts the supported range", () => {
    expect(validateQuality(82)).toBeNull();
    expect(validateQuality(40)).toBeNull();
    expect(validateQuality(100)).toBeNull();
  });

  it("rejects out-of-range values", () => {
    expect(validateQuality(39)).not.toBeNull();
    expect(validateQuality(101)).not.toBeNull();
  });
});

describe("filenames", () => {
  it("renames basename while keeping the extension", () => {
    expect(renameBasename("vacation photo.JPG", "hawaii")).toBe("hawaii.JPG");
    expect(renameBasename("a.png", "  my file  ")).toBe("my file.png");
    expect(renameBasename("keep.webp", "")).toBe("keep.webp");
  });

  it("builds dimension suffixes and replaces extensions", () => {
    expect(
      buildOutputFilename({
        sourceName: "DSC_1042.JPG",
        outputKind: "jpeg",
        width: 450,
        height: 300,
      }),
    ).toBe("DSC_1042-450x300.jpg");
  });

  it("uses output dimensions for keep-original when resolution is included", () => {
    expect(
      buildOutputFilename({
        sourceName: "photo.png",
        outputKind: "webp",
        width: 1920,
        height: 1080,
        keepOriginal: true,
      }),
    ).toBe("photo-1920x1080.webp");
  });

  it("adds duplicate index after the resolution suffix", () => {
    expect(
      buildOutputFilename({
        sourceName: "photo.jpg",
        outputKind: "jpeg",
        width: 450,
        height: 300,
        duplicateIndex: 2,
      }),
    ).toBe("photo-450x300-2.jpg");
    expect(
      buildOutputFilename({
        sourceName: "photo.jpg",
        outputKind: "jpeg",
        width: 450,
        height: 300,
        duplicateIndex: 3,
      }),
    ).toBe("photo-450x300-3.jpg");
  });

  it("applies prefix and can omit resolution", () => {
    expect(
      buildOutputFilename({
        sourceName: "photo.jpg",
        outputKind: "jpeg",
        width: 600,
        height: 600,
        filenamePrefix: "web",
      }),
    ).toBe("web-photo-600x600.jpg");

    expect(
      buildOutputFilename({
        sourceName: "photo.jpg",
        outputKind: "jpeg",
        width: 600,
        height: 600,
        filenamePrefix: "web",
        includeResolutionInFilename: false,
      }),
    ).toBe("web-photo.jpg");
  });

  it("sanitizes unsafe characters and strips paths", () => {
    expect(sanitizeFilename("../../evil<>name?.jpg")).toBe("evilname.jpg");
    expect(sanitizeFilename("folder\\photo.png")).toBe("photo.png");
  });

  it("uniquifies duplicate names", () => {
    expect(uniquifyFilenames(["photo.jpg", "photo.jpg", "other.png"])).toEqual([
      "photo.jpg",
      "photo-2.jpg",
      "other.png",
    ]);
  });

  it("uniquifies case-insensitive duplicates and ZIP resolution suffixes", () => {
    expect(
      uniquifyFilenames([
        "photo-450x300.jpg",
        "photo-450x300.JPG",
        "photo-450x300.jpg",
      ]),
    ).toEqual([
      "photo-450x300.jpg",
      "photo-450x300-2.jpg",
      "photo-450x300-3.jpg",
    ]);
  });

  it("handles spaces, punctuation, Unicode, and empty basenames", () => {
    expect(
      buildOutputFilename({
        sourceName: "my photo (1).jpg",
        outputKind: "jpeg",
        width: 450,
        height: 300,
      }),
    ).toBe("my photo (1)-450x300.jpg");

    expect(
      buildOutputFilename({
        sourceName: "фото.jpg",
        outputKind: "webp",
        width: 600,
        height: 600,
      }),
    ).toBe("фото-600x600.webp");

    expect(sanitizeFilename("")).toBe("image");
    expect(sanitizeFilename("...")).toBe("image");
    expect(sanitizeFilename("folder/../../name.jpg")).toBe("name.jpg");
  });

  it("strips extensions safely", () => {
    expect(stripExtension("DSC_1042.JPG")).toBe("DSC_1042");
  });
});

describe("formatFileSize", () => {
  it("formats B, KB, MB, GB, zero, and small values", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(999)).toBe("999 B");
    expect(formatFileSize(1500)).toBe("1.5 KB");
    expect(formatFileSize(2_500_000)).toBe("2.5 MB");
    expect(formatFileSize(1_500_000_000)).toBe("1.5 GB");
  });
});

describe("formatExactFileSize", () => {
  it("keeps two-decimal KB precision for exact processed totals", () => {
    expect(formatExactFileSize(45231)).toBe("45.23 KB");
    expect(formatExactFileSize(15_000)).toBe("15 KB");
    expect(formatExactFileSize(1_234_567)).toBe("1.23 MB");
  });
});

describe("calculateSizeChange", () => {
  it("reports savings", () => {
    const result = calculateSizeChange(1000, 320);
    expect(result.kind).toBe("saved");
    expect(result.label).toMatch(/Saved/i);
  });

  it("reports larger outputs", () => {
    const result = calculateSizeChange(1000, 1120);
    expect(result.kind).toBe("larger");
    expect(result.label).toMatch(/larger/i);
  });

  it("reports no meaningful change", () => {
    expect(calculateSizeChange(1000, 1000).kind).toBe("same");
  });

  it("protects zero-byte originals", () => {
    expect(calculateSizeChange(0, 10).kind).toBe("same");
  });
});

describe("parseDimensionInput", () => {
  it("parses whole numbers and rejects decimals", () => {
    expect(parseDimensionInput("450")).toBe(450);
    expect(Number.isNaN(parseDimensionInput("45.5"))).toBe(true);
    expect(parseDimensionInput("")).toBeNull();
  });
});
