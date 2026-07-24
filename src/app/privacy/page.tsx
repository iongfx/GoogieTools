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
  title: "Privacy Policy",
  description: `Privacy Policy for ${SITE_NAME}. Learn how our free QR code generator handles information, cookies, and advertising.`,
  path: "/privacy",
});

/**
 * Privacy Policy — written for transparency and AdSense readiness.
 * This is informational, not legal advice. Have a professional review before launch.
 */
export default function PrivacyPage() {
  return (
    <>
      <section aria-labelledby="privacy-heading">
        <PageHeader
          headingId="privacy-heading"
          title="Privacy Policy"
          description={`Last updated: ${LEGAL_LAST_UPDATED}`}
          className="mb-9 sm:mb-11"
        />
      </section>
      <Container as="article" className="pb-16 sm:pb-24">
        <Card
          className="prose-legal max-w-2xl space-y-8 text-base leading-relaxed text-muted"
          padding="lg"
        >
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. Introduction
            </h2>
            <p>
              This Privacy Policy explains how {SITE_NAME} (“we”, “us”, or
              “our”) collects, uses, and shares information when you visit{" "}
              {SITE_URL} (the “Site”).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. Information we collect
            </h2>
            <p>
              We may collect information you voluntarily provide (such as when
              you email us), and technical data that browsers typically send
              automatically, such as IP address, browser type, device type,
              referring pages, and pages visited.
            </p>
            <p>
              When you use the QR code generator, content you enter (such as a
              URL, text, or Wi‑Fi details) is processed in your browser to create
              the code. We do not upload that content to our servers for
              generation. We will update this policy if that ever changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. Cookies and similar technologies
            </h2>
            <p>
              Cookies are small text files stored on your device. We may use:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-foreground">
                  Essential cookies
                </strong>{" "}
                — needed for basic site functions (for example, remembering your
                cookie preference).
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Analytics cookies
                </strong>{" "}
                — help us understand how the Site is used (if enabled).
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Advertising cookies
                </strong>{" "}
                — used by partners such as Google to serve and measure ads (if
                AdSense is enabled).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Google AdSense and advertising
            </h2>
            <p>
              We may display ads served by Google AdSense or similar partners.
              Google and its partners may use cookies (including the DoubleClick
              cookie) and similar technologies to show ads based on your visits
              to this Site and/or other sites on the internet.
            </p>
            <p>
              You can opt out of personalized advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                className="font-medium text-accent underline-offset-2 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google Ads Settings
              </a>
              . You can also visit{" "}
              <a
                href="https://www.aboutads.info/choices/"
                className="font-medium text-accent underline-offset-2 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                www.aboutads.info
              </a>{" "}
              for more choices. Learn more in{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                className="font-medium text-accent underline-offset-2 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google’s advertising policy
              </a>
              .
            </p>
            <p>
              If you are in the EEA, UK, or Switzerland, we will seek appropriate
              consent before using non-essential advertising cookies where
              required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. How we use information
            </h2>
            <p>
              We use information to operate and improve the Site, respond to
              messages, understand usage trends, prevent abuse, and (if enabled)
              show relevant advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Third-party services
            </h2>
            <p>
              We may use trusted third-party services (for example hosting,
              analytics, or advertising). Those providers process data under
              their own privacy policies. Examples may include our hosting
              provider and Google (for AdSense and related services).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              7. Data retention &amp; security
            </h2>
            <p>
              We keep information only as long as needed for the purposes
              described above, and take reasonable steps to protect it. No
              method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              8. Your choices and rights
            </h2>
            <p>
              Depending on where you live, you may have rights to access,
              correct, delete, or restrict certain personal information, or to
              object to certain processing. Contact us using the email below to
              make a request. You can also control cookies through your browser
              and the consent banner on this Site (when shown).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              9. Children’s privacy
            </h2>
            <p>
              This Site is not directed at children under 13. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              10. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. The “Last
              updated” date at the top will change when we do.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              11. Contact
            </h2>
            <p>
              Questions about this policy? Email us at{" "}
              <TextLink href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</TextLink>{" "}
              or visit our <TextLink href="/contact">Contact page</TextLink>.
            </p>
          </section>
        </Card>
      </Container>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ])}
      />
    </>
  );
}
