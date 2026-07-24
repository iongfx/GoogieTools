import { describe, expect, it } from "vitest";
import { PRODUCTION_SITE_URL } from "@/config/brand";
import { getAvailableTools, TOOLS } from "@/config/tools";
import { SITEMAP_ROUTES } from "@/lib/constants";
import {
  faqPageSchema,
  organizationSchema,
  webApplicationSchema,
  websiteSchema,
} from "@/lib/schema";
import {
  APPROVED_LAUNCH_TOOL_SLUGS,
  EXPECTED_PUBLIC_ROUTES,
  runReleaseLinkChecks,
} from "@/lib/release-check";
import { FAQ_ITEMS } from "@/lib/faq-data";

describe("Googie Tools 1.0 release checks", () => {
  it("keeps the approved tool directory order and statuses", () => {
    expect(TOOLS.map((tool) => tool.slug)).toEqual([
      ...APPROVED_LAUNCH_TOOL_SLUGS,
    ]);
    expect(getAvailableTools().map((tool) => tool.slug)).toEqual([
      "qr-code-generator",
      "password-generator",
      "unit-converter",
      "batch-image-compressor",
      "colour-screen-pixel-tester",
    ]);
    expect(
      TOOLS.filter((tool) => tool.status === "coming-soon").map((t) => t.slug),
    ).toEqual(["invoice-generator", "mortgage-calculator"]);
  });

  it("passes static link and sitemap checks for production origin", () => {
    expect(runReleaseLinkChecks({ siteUrl: PRODUCTION_SITE_URL })).toEqual([]);
  });

  it("rejects localhost production origins", () => {
    const issues = runReleaseLinkChecks({
      siteUrl: "http://localhost:3000",
    });
    expect(issues.some((issue) => issue.code === "site-url-local")).toBe(true);
  });

  it("includes every expected public route in the sitemap once", () => {
    const paths = SITEMAP_ROUTES.map((route) =>
      route.path === "" ? "/" : route.path,
    );
    expect(paths).toEqual([...EXPECTED_PUBLIC_ROUTES]);
  });

  it("does not advertise coming-soon tools as WebApplications", () => {
    const schemas = [
      organizationSchema(),
      websiteSchema(),
      webApplicationSchema(),
      faqPageSchema(FAQ_ITEMS),
    ];
    const serialized = JSON.stringify(schemas);
    expect(serialized).not.toMatch(/invoice-generator|mortgage-calculator/i);
    expect(serialized).not.toMatch(/aggregateRating|ratingValue|reviewCount/i);
    expect(serialized).toContain("Colour style presets");
    for (const schema of schemas) {
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBeTruthy();
    }
  });

  it("defines the production canonical origin", () => {
    expect(PRODUCTION_SITE_URL).toBe("https://googietools.com");
  });

  it("uses Canadian spelling in shared FAQ copy for colour styles", () => {
    const qrFree = FAQ_ITEMS.find((item) =>
      item.question.toLowerCase().includes("qr code generator free"),
    );
    expect(qrFree?.answer).toMatch(/colour styles/i);
    expect(qrFree?.answer).not.toMatch(/\bcolor styles\b/i);
  });
});
