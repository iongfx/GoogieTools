import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextLink } from "@/components/ui/TextLink";
import { SITE_NAME } from "@/lib/constants";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: `About ${SITE_NAME}`,
  description: `Learn about ${SITE_NAME} — simple online tools that make life easier, starting with a free QR code generator.`,
  path: "/about",
  keywords: [
    "about Googie Tools",
    "online utility tools",
    "free QR code tool",
  ],
});

export default function AboutPage() {
  return (
    <>
      <section aria-labelledby="about-heading">
        <PageHeader
          headingId="about-heading"
          title={`About ${SITE_NAME}`}
          description="Who we are, what we’re building, and why these tools stay simple."
          className="mb-9 sm:mb-11"
        />
      </section>

      <Container as="article" className="pb-16 sm:pb-24">
        <Card className="max-w-2xl" padding="lg" as="div">
          <div className="space-y-5 text-base leading-relaxed text-muted">
            <p>
              {SITE_NAME} is a growing collection of simple, friendly online
              tools. Our goal is clear: help you get things done without
              sign-ups, clutter, or unnecessary complexity.
            </p>
            <p>
              Available tools include a free QR Code Generator for websites,
              text, and Wi‑Fi details, a Password Generator for strong random
              passwords, a Unit Converter for everyday measurements, a Batch
              Image Compressor for resizing and compressing photos in your
              browser, and a Colour Screen & Pixel Tester for display checks and
              colour sampling. More utilities are on the way.
            </p>
            <p>
              Where it makes sense, tools run in your browser so pages stay fast
              and your content does not need to leave your device for
              processing. The site follows modern web standards for performance,
              accessibility, and search visibility.
            </p>
            <p>
              Ready to try something useful? Open the{" "}
              <TextLink href="/tools/qr-code-generator">
                QR Code Generator
              </TextLink>
              {", "}
              <TextLink href="/tools/password-generator">
                Password Generator
              </TextLink>
              {", "}
              <TextLink href="/tools/unit-converter">Unit Converter</TextLink>
              {", "}
              <TextLink href="/tools/batch-image-compressor">
                Batch Image Compressor
              </TextLink>
              {", or "}
              <TextLink href="/tools/colour-screen-pixel-tester">
                Colour Screen & Pixel Tester
              </TextLink>
              . Browse the <TextLink href="/#tools">tools directory</TextLink>, or{" "}
              <TextLink href="/contact">contact us</TextLink> with feedback.
            </p>
          </div>
        </Card>
      </Container>

      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
    </>
  );
}
