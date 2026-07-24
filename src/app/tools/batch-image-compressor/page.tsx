import Link from "next/link";
import { BatchImageCompressor } from "@/components/image-compressor/BatchImageCompressor";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolCardGrid } from "@/components/tools/ToolCardGrid";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { TrustNote } from "@/components/tools/TrustNote";
import { GoogieFreeBadge } from "@/components/brand/GoogieFreeBadge";
import { AccordionItem } from "@/components/ui/AccordionItem";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TextLink } from "@/components/ui/TextLink";
import { getFeaturedTools, IMAGE_TOOL } from "@/config/tools";
import {
  IMAGE_TOOL_FAQ,
  IMAGE_TOOL_HOW_TO,
  IMAGE_TOOL_USE_CASES,
} from "@/lib/image-compressor-content";
import {
  breadcrumbSchema,
  faqPageSchema,
  webApplicationSchema,
} from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free Batch Image Compressor",
  description:
    "Resize, crop, convert, and compress multiple JPG, PNG, and WebP images directly in your browser.",
  path: IMAGE_TOOL.href,
  keywords: [...IMAGE_TOOL.keywords],
});

/**
 * Free Batch Image Compressor — fourth tool in the Googie Tools platform.
 */
export default function BatchImageCompressorPage() {
  const relatedTools = getFeaturedTools(6).filter(
    (tool) => tool.slug !== IMAGE_TOOL.slug,
  );

  return (
    <>
      <JsonLd
        data={webApplicationSchema({
          name: "Free Batch Image Compressor",
          path: IMAGE_TOOL.href,
          description:
            "Resize, crop, convert, and compress multiple JPG, PNG, and WebP images directly in your browser.",
          featureList: [
            "Batch image upload",
            "Resize and crop presets",
            "Keep original dimensions with stable preview",
            "Manual zoom and pan framing",
            "Crop-aware thumbnails",
            "Double-click filename rename",
            "Filename prefix and resolution naming",
            "JPG PNG WebP output",
            "Quality control",
            "Transparency checkerboard preview",
            "Individual downloads",
            "ZIP download",
            "No account required",
            "Client-side processing",
          ],
        })}
      />
      <JsonLd data={faqPageSchema(IMAGE_TOOL_FAQ)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/#tools" },
          { name: "Batch Image Compressor", path: IMAGE_TOOL.href },
        ])}
      />

      <ToolPageHeader
        title="Free Batch Image Compressor"
        description="Resize, crop, convert, and compress multiple images directly in your browser."
        headingId="generator-heading"
        icon={IMAGE_TOOL.icon}
      />

      <section className="pt-2 pb-2 sm:pt-2.5" aria-labelledby="generator-heading">
        <Container>
          <div id="generator" className="scroll-mt-24">
            <BatchImageCompressor />
          </div>
          <TrustNote className="mt-5">
            <p>
              Processed images are re-created in your browser, which normally
              removes embedded metadata such as camera and location details.
            </p>
            <p className="mt-3">
              Images are processed on your device and are not uploaded to our
              servers.
            </p>
          </TrustNote>
        </Container>
      </section>

      <Section aria-labelledby="how-to-heading">
        <Container>
          <div className="mb-9 max-w-2xl sm:mb-11">
            <SectionTitle
              id="how-to-heading"
              sparkle={false}
              description="Three quick steps from upload to framed, renamed, downloadable results."
            >
              How to use it
            </SectionTitle>
          </div>
          <ol className="grid list-none gap-8 p-0 sm:grid-cols-3">
            {IMAGE_TOOL_HOW_TO.map((step, index) => (
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
              description="Practical ways people use this free batch image compressor."
            >
              Common use cases
            </SectionTitle>
          </div>
          <ul className="grid list-none gap-8 p-0 sm:grid-cols-3">
            {IMAGE_TOOL_USE_CASES.map((item) => (
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
              description="Quick answers about privacy, formats, cropping, and ZIP downloads."
            >
              FAQ
            </SectionTitle>
          </div>
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {IMAGE_TOOL_FAQ.map((item) => (
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
