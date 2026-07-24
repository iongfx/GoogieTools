import Link from "next/link";
import { ColourScreenPixelTester } from "@/components/colour-screen/ColourScreenPixelTester";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolCardGrid } from "@/components/tools/ToolCardGrid";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { TrustNote } from "@/components/tools/TrustNote";
import { GoogieFreeBadge } from "@/components/brand/GoogieFreeBadge";
import { AccordionItem } from "@/components/ui/AccordionItem";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TextLink } from "@/components/ui/TextLink";
import { COLOUR_TOOL, getFeaturedTools } from "@/config/tools";
import {
  COLOUR_TOOL_FAQ,
  COLOUR_TOOL_HOW_TO,
  COLOUR_TOOL_USE_CASES,
} from "@/lib/colour-screen-content";
import {
  breadcrumbSchema,
  faqPageSchema,
  webApplicationSchema,
} from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free Colour Screen & Pixel Tester",
  description:
    "Create fullscreen colour tests, inspect pixels, cycle display colours, and sample HEX, RGB, HSL, HSV, and CMYK values from your screen or images.",
  path: COLOUR_TOOL.href,
  keywords: [...COLOUR_TOOL.keywords],
});

/**
 * Free Colour Screen & Pixel Tester — fifth tool in the Googie Tools platform.
 */
export default function ColourScreenPixelTesterPage() {
  const relatedTools = getFeaturedTools(7).filter(
    (tool) => tool.slug !== COLOUR_TOOL.slug,
  );

  return (
    <>
      <JsonLd
        data={webApplicationSchema({
          name: "Free Colour Screen & Pixel Tester",
          path: COLOUR_TOOL.href,
          description:
            "Create fullscreen colour tests, inspect pixels, cycle display colours, and sample HEX, RGB, HSL, HSV, and CMYK values from your screen or images.",
          featureList: [
            "Fullscreen solid colour display tests",
            "RGB white black cyan magenta yellow grey presets",
            "HEX RGB HSL HSV CMYK colour inputs",
            "Independent cursor marker for pixel inspection",
            "Colour cycle with manual and timed advance",
            "Chroma green and chroma blue presets",
            "Screen EyeDropper colour sampling",
            "Image upload paste and URL colour picker",
            "Pixel loupe and coordinate sampling",
            "Copy HEX RGB HSL HSV CMYK values",
            "No account required",
            "Client-side processing",
          ],
        })}
      />
      <JsonLd data={faqPageSchema(COLOUR_TOOL_FAQ)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/#tools" },
          { name: "Colour Screen & Pixel Tester", path: COLOUR_TOOL.href },
        ])}
      />

      <ToolPageHeader
        title="Free Colour Screen & Pixel Tester"
        description="Create fullscreen colour tests, inspect pixels, cycle display colours, and sample HEX, RGB, HSL, HSV, and CMYK values from your screen or images."
        headingId="generator-heading"
        icon={COLOUR_TOOL.icon}
        descriptionEnd={
          <>
            <span className="inline-block w-3 sm:w-4" aria-hidden="true" />
            <Button
              href="#how-to"
              variant="secondary"
              size="sm"
              className="!relative !top-[-0.1em] !inline-flex"
            >
              How to use
            </Button>
          </>
        }
      />

      <section className="pt-2 pb-2 sm:pt-2.5" aria-labelledby="generator-heading">
        <Container>
          <div id="generator" className="scroll-mt-24">
            <ColourScreenPixelTester />
          </div>
          <TrustNote className="mt-5">
            <p>
              Colour tests and image sampling run in your browser. Uploaded and
              pasted images are not sent to our servers for this tool.
            </p>
            <p className="mt-3">
              CMYK values are approximate screen conversions and may not match
              printed output.
            </p>
          </TrustNote>
        </Container>
      </section>

      <Section
        id="how-to"
        className="scroll-mt-24"
        aria-labelledby="how-to-heading"
      >
        <Container>
          <div className="mb-9 max-w-2xl sm:mb-11">
            <SectionTitle
              id="how-to-heading"
              sparkle={false}
              description="Three quick steps from colour choice to fullscreen inspection."
            >
              How to use it
            </SectionTitle>
          </div>
          <ol className="grid list-none gap-8 p-0 sm:grid-cols-3">
            {COLOUR_TOOL_HOW_TO.map((step, index) => (
              <li key={step.title}>
                <article>
                  <p className="text-[0.9375rem] font-semibold text-accent">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2.5 font-display text-xl font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-base leading-relaxed text-muted">
                    {step.description}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section
        className="border-y border-border/80 bg-surface/50"
        aria-labelledby="use-cases-heading"
      >
        <Container>
          <div className="mb-9 max-w-2xl sm:mb-11">
            <SectionTitle
              id="use-cases-heading"
              sparkle={false}
              description="Practical ways people use this free colour screen and pixel tester."
            >
              Common use cases
            </SectionTitle>
          </div>
          <ul className="grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {COLOUR_TOOL_USE_CASES.map((item) => (
              <li key={item.title}>
                <article>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted">
                    {item.description}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section
        className="scroll-mt-24 py-12 sm:py-16"
        id="faq"
        aria-labelledby="faq-heading"
      >
        <Container>
          <div className="mb-9 max-w-2xl sm:mb-11">
            <SectionTitle
              id="faq-heading"
              sparkle={false}
              description="Quick answers about privacy, CMYK, chroma key, and fullscreen exit."
            >
              FAQ
            </SectionTitle>
          </div>
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {COLOUR_TOOL_FAQ.map((item) => (
              <AccordionItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                footer={item.showFreeBadge ? <GoogieFreeBadge /> : undefined}
              />
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-sm text-muted">
            More questions? See the full{" "}
            <TextLink href="/faq">FAQ page</TextLink> or{" "}
            <TextLink href="/privacy">Privacy Policy</TextLink>.
          </p>
        </Container>
      </Section>

      <Section
        className="border-t border-border/80 bg-surface/40"
        aria-labelledby="related-heading"
      >
        <Container>
          <div className="mb-9 max-w-2xl sm:mb-11">
            <SectionTitle
              id="related-heading"
              description="More free Googie Tools you can use next."
            >
              Related tools
            </SectionTitle>
          </div>
          <ToolCardGrid tools={relatedTools.slice(0, 3)} />
          <p className="mt-9 text-[0.9375rem] text-muted sm:text-base">
            <Link
              href="/#tools"
              className="font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              Browse all tools
            </Link>
          </p>
        </Container>
      </Section>
    </>
  );
}
