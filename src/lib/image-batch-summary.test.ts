import { describe, expect, it } from "vitest";
import {
  SIZE_CHANGE_THRESHOLD_PERCENT,
  buildBatchSizeSummary,
  calculateByteDifference,
  classifySizeDelta,
  clearStaleActualBytes,
  countValidImages,
  formatBatchSizeCopy,
  replaceItemEstimate,
  sumActualOutputBytes,
  sumBytes,
  sumEstimatedBytes,
  sumOriginalBytes,
  sumSuccessfulSourceBytes,
  type BatchItemSizeInput,
} from "@/lib/image-batch-summary";

function item(
  overrides: Partial<BatchItemSizeInput> & Pick<BatchItemSizeInput, "id" | "size">,
): BatchItemSizeInput {
  return {
    valid: true,
    estimatedBytes: null,
    actualBytes: null,
    completed: false,
    failed: false,
    ...overrides,
  };
}

describe("sumBytes / original totals", () => {
  it("sums original batch totals for valid images only", () => {
    const items = [
      item({ id: "a", size: 1_000_000, valid: true }),
      item({ id: "b", size: 2_500_000, valid: true }),
      item({ id: "c", size: 9_999_999, valid: false }),
    ];
    expect(sumOriginalBytes(items)).toBe(3_500_000);
    expect(countValidImages(items)).toBe(2);
  });

  it("ignores null and negative values in sumBytes", () => {
    expect(sumBytes([100, null, undefined, -5, 50])).toBe(150);
  });
});

describe("estimated and actual totals", () => {
  it("sums estimated batch totals and counts coverage", () => {
    const items = [
      item({ id: "a", size: 1000, estimatedBytes: 200 }),
      item({ id: "b", size: 1000, estimatedBytes: 300 }),
      item({ id: "c", size: 1000, estimatedBytes: null }),
    ];
    expect(sumEstimatedBytes(items)).toEqual({ total: 500, count: 2 });
  });

  it("sums actual processed totals and excludes failed files", () => {
    const items = [
      item({
        id: "a",
        size: 1000,
        completed: true,
        actualBytes: 200,
      }),
      item({
        id: "b",
        size: 1000,
        completed: true,
        actualBytes: 300,
      }),
      item({
        id: "c",
        size: 1000,
        failed: true,
        actualBytes: 999,
      }),
    ];
    expect(sumActualOutputBytes(items)).toBe(500);
    expect(sumSuccessfulSourceBytes(items)).toBe(2000);
  });
});

describe("classifySizeDelta", () => {
  it("reports percentage smaller and exact bytes saved", () => {
    const delta = classifySizeDelta(1000, 200);
    expect(delta).toEqual({
      kind: "smaller",
      absoluteBytes: 800,
      percent: 80,
    });
    expect(calculateByteDifference(1000, 200)).toBe(800);
  });

  it("reports percentage larger and exact bytes added", () => {
    const delta = classifySizeDelta(1000, 1110);
    expect(delta?.kind).toBe("larger");
    expect(delta?.absoluteBytes).toBe(110);
    expect(delta?.percent).toBe(11);
  });

  it("treats differences below the threshold as unchanged", () => {
    const delta = classifySizeDelta(1000, 995, SIZE_CHANGE_THRESHOLD_PERCENT);
    expect(delta?.kind).toBe("unchanged");
  });
});

describe("buildBatchSizeSummary — estimated mode", () => {
  it("builds an estimated summary for the full batch", () => {
    const summary = buildBatchSizeSummary({
      preferActual: false,
      items: [
        item({ id: "a", size: 100_000, estimatedBytes: 10_000 }),
        item({ id: "b", size: 50_000, estimatedBytes: 5_000 }),
      ],
    });
    expect(summary.mode).toBe("estimated");
    expect(summary.validImageCount).toBe(2);
    expect(summary.allUploadedOriginalBytes).toBe(150_000);
    expect(summary.outputBytes).toBe(15_000);
    expect(summary.coverageComplete).toBe(true);
    expect(summary.delta?.kind).toBe("smaller");
  });

  it("represents partial estimate coverage without pretending full-batch totals", () => {
    const summary = buildBatchSizeSummary({
      preferActual: false,
      items: [
        item({ id: "a", size: 100_000, estimatedBytes: 10_000 }),
        item({ id: "b", size: 100_000, estimatedBytes: null }),
        item({ id: "c", size: 100_000, estimatedBytes: null }),
      ],
    });
    expect(summary.outputImageCount).toBe(1);
    expect(summary.comparisonOriginalBytes).toBe(100_000);
    expect(summary.outputBytes).toBe(10_000);
    expect(summary.coverageComplete).toBe(false);
    expect(summary.allUploadedOriginalBytes).toBe(300_000);

    const copy = formatBatchSizeCopy(summary);
    expect(copy.coverageLine).toMatch(/estimated for 1 of 3 images/i);
  });

  it("marks estimates unavailable when none are ready", () => {
    const summary = buildBatchSizeSummary({
      preferActual: false,
      items: [
        item({ id: "a", size: 100_000, estimatedBytes: null }),
        item({ id: "b", size: 50_000, estimatedBytes: null }),
      ],
    });
    expect(summary.outputBytes).toBeNull();
    expect(formatBatchSizeCopy(summary).coverageLine).toBe(
      "Batch estimate unavailable",
    );
    expect(formatBatchSizeCopy(summary).outputValue).toBe("Unavailable");
  });

  it("preserves updating state without clearing previous totals", () => {
    const summary = buildBatchSizeSummary({
      preferActual: false,
      isUpdating: true,
      items: [item({ id: "a", size: 1000, estimatedBytes: 400 })],
    });
    expect(summary.isUpdating).toBe(true);
    expect(summary.outputBytes).toBe(400);
    expect(formatBatchSizeCopy(summary).statusLine).toBe("Updating estimate…");
  });
});

describe("buildBatchSizeSummary — actual mode and failures", () => {
  it("uses successful source size as the comparison base", () => {
    const summary = buildBatchSizeSummary({
      preferActual: true,
      items: [
        item({
          id: "a",
          size: 100_000,
          completed: true,
          actualBytes: 10_000,
        }),
        item({
          id: "b",
          size: 50_000,
          completed: true,
          actualBytes: 5_000,
        }),
        item({
          id: "c",
          size: 40_000,
          failed: true,
          actualBytes: null,
        }),
      ],
    });

    expect(summary.mode).toBe("actual");
    expect(summary.completedCount).toBe(2);
    expect(summary.failedCount).toBe(1);
    expect(summary.allUploadedOriginalBytes).toBe(190_000);
    expect(summary.comparisonOriginalBytes).toBe(150_000);
    expect(summary.outputBytes).toBe(15_000);
    expect(summary.delta?.absoluteBytes).toBe(135_000);

    const copy = formatBatchSizeCopy(summary);
    expect(copy.uploadedLine).toMatch(/All uploaded files: .* original/);
    expect(copy.badge).toBe("Actual");
    expect(copy.deltaLine).toMatch(/Saved/);
  });

  it("excludes failed files from output totals", () => {
    const summary = buildBatchSizeSummary({
      preferActual: true,
      items: [
        item({
          id: "ok",
          size: 1000,
          completed: true,
          actualBytes: 200,
        }),
        item({
          id: "bad",
          size: 1000,
          failed: true,
          actualBytes: 9999,
        }),
      ],
    });
    expect(summary.outputBytes).toBe(200);
    expect(summary.outputImageCount).toBe(1);
  });

  it("sums exact processed blob sizes for the compressed batch total", () => {
    const summary = buildBatchSizeSummary({
      preferActual: true,
      items: [
        item({
          id: "a",
          size: 100_000,
          completed: true,
          actualBytes: 12_345,
        }),
        item({
          id: "b",
          size: 80_000,
          completed: true,
          actualBytes: 32_886,
        }),
      ],
    });

    // Unzipped total = sum of individual processed files, not ZIP packaging.
    expect(summary.outputBytes).toBe(45_231);
    const copy = formatBatchSizeCopy(summary);
    expect(copy.outputLabel).toBe("Compressed batch");
    expect(copy.outputValue).toBe("45.23 KB");
    expect(copy.coverageLine).toMatch(/Exact total of 2 processed image files/);
    expect(copy.coverageLine).toMatch(/not the ZIP size/);
  });

  it("formats size increases without savings language", () => {
    const summary = buildBatchSizeSummary({
      preferActual: true,
      items: [
        item({
          id: "a",
          size: 1000,
          completed: true,
          actualBytes: 1200,
        }),
      ],
    });
    const copy = formatBatchSizeCopy(summary);
    expect(copy.tone).toBe("increase");
    expect(copy.deltaLine).toMatch(/larger/);
    expect(copy.deltaLine).not.toMatch(/Saved/i);
  });

  it("formats effectively unchanged actual totals", () => {
    const summary = buildBatchSizeSummary({
      preferActual: true,
      items: [
        item({
          id: "a",
          size: 1000,
          completed: true,
          actualBytes: 995,
        }),
      ],
    });
    expect(formatBatchSizeCopy(summary).deltaLine).toBe(
      "No meaningful size change",
    );
  });
});

describe("estimated-to-actual transition copy", () => {
  it("labels pre-process totals as estimated", () => {
    const summary = buildBatchSizeSummary({
      preferActual: false,
      items: [
        item({ id: "a", size: 142_600_000, estimatedBytes: 11_800_000 }),
        item({ id: "b", size: 0, estimatedBytes: null, valid: false }),
      ],
    });
    const copy = formatBatchSizeCopy(summary);
    expect(copy.badge).toBe("Estimated");
    expect(copy.outputValue.startsWith("~")).toBe(true);
    expect(copy.deltaLine).toMatch(/approximately/i);
  });

  it("labels post-process totals as actual without estimate wording", () => {
    const summary = buildBatchSizeSummary({
      preferActual: true,
      items: [
        item({
          id: "a",
          size: 100_000,
          completed: true,
          actualBytes: 12_000,
        }),
      ],
    });
    const copy = formatBatchSizeCopy(summary);
    expect(copy.badge).toBe("Actual");
    expect(copy.outputValue.startsWith("~")).toBe(false);
    expect(copy.deltaLine).toMatch(/^Saved/);
    expect(copy.deltaLine).not.toMatch(/approximately/i);
  });
});

describe("estimate mutations", () => {
  it("updates totals when adding and removing images", () => {
    let items = [
      item({ id: "a", size: 1000, estimatedBytes: 200 }),
      item({ id: "b", size: 1000, estimatedBytes: 300 }),
    ];
    expect(buildBatchSizeSummary({ preferActual: false, items }).outputBytes).toBe(
      500,
    );

    items = [...items, item({ id: "c", size: 1000, estimatedBytes: 100 })];
    expect(buildBatchSizeSummary({ preferActual: false, items }).outputBytes).toBe(
      600,
    );

    items = items.filter((entry) => entry.id !== "b");
    expect(buildBatchSizeSummary({ preferActual: false, items }).outputBytes).toBe(
      300,
    );
  });

  it("replaces an estimate with an actual value in actual mode", () => {
    const items = [
      item({
        id: "a",
        size: 1000,
        estimatedBytes: 250,
        actualBytes: 180,
        completed: true,
      }),
    ];
    const estimated = buildBatchSizeSummary({ preferActual: false, items });
    const actual = buildBatchSizeSummary({ preferActual: true, items });
    expect(estimated.outputBytes).toBe(250);
    expect(actual.outputBytes).toBe(180);
  });

  it("clears stale actual outputs when settings change", () => {
    const cleared = clearStaleActualBytes([
      { actualBytes: 120 },
      { actualBytes: 80 },
    ]);
    expect(cleared.every((item) => item.actualBytes === null)).toBe(true);
  });

  it("updates a single image estimate without touching others", () => {
    const items = [
      item({ id: "a", size: 1000, estimatedBytes: 200 }),
      item({ id: "b", size: 1000, estimatedBytes: 300 }),
    ];
    const next = replaceItemEstimate(items, "a", 150);
    expect(next.find((entry) => entry.id === "a")?.estimatedBytes).toBe(150);
    expect(next.find((entry) => entry.id === "b")?.estimatedBytes).toBe(300);
  });
});
