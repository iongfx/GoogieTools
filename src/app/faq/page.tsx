import { GoogieFreeBadge } from "@/components/brand/GoogieFreeBadge";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { AccordionItem } from "@/components/ui/AccordionItem";
import { PageHeader } from "@/components/ui/PageHeader";
import { SITE_NAME } from "@/lib/constants";
import { FAQ_ITEMS } from "@/lib/faq-data";
import { breadcrumbSchema, faqPageSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "FAQ — Common Questions About QR Codes",
  description: `Answers about ${SITE_NAME}: free QR generation, privacy, downloads, and upcoming online tools.`,
  path: "/faq",
  keywords: [
    "Googie Tools FAQ",
    "QR code FAQ",
    "how to create QR code",
    "free QR code questions",
  ],
});

/**
 * FAQ page with accessible accordion UI and FAQPage JSON-LD for rich results.
 */
export default function FaqPage() {
  return (
    <>
      <section aria-labelledby="faq-page-heading">
        <PageHeader
          headingId="faq-page-heading"
          title="Frequently asked questions"
          description={`Quick answers about ${SITE_NAME}, privacy, downloads, and how QR codes work.`}
          className="mb-9 sm:mb-11"
        />
      </section>

      <Container as="section" className="pb-16 sm:pb-24" aria-label="FAQ list">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              footer={item.showFreeBadge ? <GoogieFreeBadge /> : undefined}
            />
          ))}
        </div>
      </Container>

      <JsonLd data={faqPageSchema()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
    </>
  );
}
