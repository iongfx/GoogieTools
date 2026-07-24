import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextLink } from "@/components/ui/TextLink";
import { SITE_EMAIL, SITE_NAME } from "@/lib/constants";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description: `Contact ${SITE_NAME} for questions, feedback, or support about our free QR code generator.`,
  path: "/contact",
  keywords: [
    "contact Googie Tools",
    "QR code support",
    "online tools feedback",
  ],
});

/**
 * Contact page — email is the reliable path until a form backend is added.
 */
export default function ContactPage() {
  return (
    <>
      <section aria-labelledby="contact-heading">
        <PageHeader
          headingId="contact-heading"
          title="Contact"
          description="Questions, feedback, or partnership ideas? We’d love to hear from you."
          className="mb-9 sm:mb-11"
        />
      </section>
      <Container className="pb-16 sm:pb-24">
        <Card className="max-w-xl" padding="lg">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Email us
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            The fastest way to reach the {SITE_NAME} team is by email. Tell us
            what you need help with, and include any links or screenshots if
            something looks broken.
          </p>
          <p className="mt-4 text-base text-foreground">
            <TextLink href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</TextLink>
          </p>
          <div className="mt-6">
            <Button href={`mailto:${SITE_EMAIL}`}>Open email app</Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            Prefer reading first? Check the{" "}
            <TextLink href="/faq">FAQ</TextLink> or our{" "}
            <TextLink href="/privacy">Privacy Policy</TextLink>.
          </p>
        </Card>
      </Container>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
    </>
  );
}
