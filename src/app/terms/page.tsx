import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextLink } from "@/components/ui/TextLink";
import { SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/constants";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME}. Please read these terms before using our free QR code generator.`,
  path: "/terms",
});

/**
 * Terms of Service — aligned with the live product.
 * This is informational, not legal advice. Have a professional review before launch.
 */
export default function TermsPage() {
  return (
    <>
      <section aria-labelledby="terms-heading">
        <PageHeader
          headingId="terms-heading"
          title="Terms of Service"
          description={`Last updated: ${LEGAL_LAST_UPDATED}`}
          className="mb-9 sm:mb-11"
        />
      </section>
      <Container as="article" className="pb-16 sm:pb-24">
        <Card
          className="max-w-2xl space-y-8 text-base leading-relaxed text-muted"
          padding="lg"
        >
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. Agreement
            </h2>
            <p>
              By accessing {SITE_URL} (the “Site”), you agree to these Terms of
              Service. If you do not agree, please do not use the Site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. Use of the service
            </h2>
            <p>
              {SITE_NAME} provides free utility tools, including an online QR
              code generator for URLs, text, and Wi‑Fi networks. You agree to use
              the Site only for lawful purposes and in a way that does not harm
              the Site, other users, or third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. Your content
            </h2>
            <p>
              You are responsible for any content you enter into our tools (such
              as URLs, text, or Wi‑Fi details used to generate QR codes). Do not
              use the Site to create content that is illegal, harmful, or
              infringes someone else’s rights. Anyone who can see or scan a
              Wi‑Fi QR code may be able to join that network.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Intellectual property
            </h2>
            <p>
              The Site’s branding, design, and original content belong to{" "}
              {SITE_NAME} unless otherwise stated. You may use QR codes you
              generate for your own projects, subject to these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. Disclaimer
            </h2>
            <p>
              The Site is provided “as is” and “as available” without warranties
              of any kind. We do not guarantee uninterrupted access, error-free
              operation, or fitness for a particular purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Limitation of liability
            </h2>
            <p>
              To the fullest extent permitted by law, {SITE_NAME} is not liable
              for any indirect, incidental, or consequential damages arising
              from your use of the Site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              7. Third-party links &amp; ads
            </h2>
            <p>
              The Site may include links or advertisements from third parties
              (including Google AdSense). We are not responsible for their
              content, policies, or practices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              8. Changes
            </h2>
            <p>
              We may update these Terms at any time. Continued use of the Site
              after changes means you accept the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              9. Contact
            </h2>
            <p>
              Questions about these Terms? Email{" "}
              <TextLink href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</TextLink> or
              visit our <TextLink href="/contact">Contact page</TextLink>.
            </p>
          </section>
        </Card>
      </Container>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Terms of Service", path: "/terms" },
        ])}
      />
    </>
  );
}
