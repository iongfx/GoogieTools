import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PasswordGenerator } from "@/components/password/PasswordGenerator";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolCardGrid } from "@/components/tools/ToolCardGrid";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { TrustNote } from "@/components/tools/TrustNote";
import { GoogieFreeBadge } from "@/components/brand/GoogieFreeBadge";
import { AccordionItem } from "@/components/ui/AccordionItem";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TextLink } from "@/components/ui/TextLink";
import { getFeaturedTools, PASSWORD_TOOL } from "@/config/tools";
import {
  PASSWORD_TOOL_FAQ,
  PASSWORD_TOOL_HOW_TO,
  PASSWORD_TOOL_USE_CASES,
} from "@/lib/password-tool-content";
import {
  breadcrumbSchema,
  faqPageSchema,
  webApplicationSchema,
} from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free Password Generator",
  description:
    "Create strong, random passwords in your browser with customizable length, numbers, symbols, and character options.",
  path: PASSWORD_TOOL.href,
  keywords: [...PASSWORD_TOOL.keywords],
});

/**
 * Free Password Generator — second tool in the Googie Tools platform.
 */
export default function PasswordGeneratorPage() {
  const relatedTools = getFeaturedTools(6).filter(
    (tool) => tool.slug !== PASSWORD_TOOL.slug,
  );

  return (
    <>
      <JsonLd
        data={webApplicationSchema({
          name: "Free Password Generator",
          path: PASSWORD_TOOL.href,
          description:
            "Create strong, random passwords directly in your browser with customizable length, numbers, symbols, and character options.",
          featureList: [
            "Custom password length",
            "Uppercase and lowercase letters",
            "Numbers and symbols",
            "Avoid ambiguous characters",
            "Estimated strength indicator",
            "Copy to clipboard",
            "No account required",
            "Client-side generation",
          ],
        })}
      />
      <JsonLd data={faqPageSchema(PASSWORD_TOOL_FAQ)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/#tools" },
          { name: "Password Generator", path: PASSWORD_TOOL.href },
        ])}
      />

      <ToolPageHeader
        title="Free Password Generator"
        description="Create strong, random passwords directly in your browser."
        headingId="generator-heading"
        icon={PASSWORD_TOOL.icon}
      />

      <section className="pt-2 pb-2 sm:pt-2.5" aria-labelledby="generator-heading">
        <Container>
          <div id="generator" className="scroll-mt-24">
            <PasswordGenerator />
          </div>
          <TrustNote className="mt-5">
            <p>
              Passwords are generated on your device and are not uploaded to our
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
              description="Three quick steps from options to a ready password."
            >
              How to use it
            </SectionTitle>
          </div>
          <ol className="grid list-none gap-8 p-0 sm:grid-cols-3">
            {PASSWORD_TOOL_HOW_TO.map((step, index) => (
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
              description="Practical ways people use this free password generator."
            >
              Common use cases
            </SectionTitle>
          </div>
          <ul className="grid list-none gap-8 p-0 sm:grid-cols-3">
            {PASSWORD_TOOL_USE_CASES.map((item) => (
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
              description="Quick answers about privacy, strength, and how generation works."
            >
              FAQ
            </SectionTitle>
          </div>
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {PASSWORD_TOOL_FAQ.map((item) => (
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
              description="More Googie Tools are on the way. Here’s what’s next."
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
