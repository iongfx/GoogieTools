import { SparkleMark } from "@/components/brand/SparkleMark";
import { Container } from "@/components/layout/Container";
import { ToolCardGrid } from "@/components/tools/ToolCardGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getFeaturedTools } from "@/config/tools";
import { HOME_DESCRIPTION, HOME_TITLE } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: "/",
  keywords: [
    "Googie Tools",
    "online tools",
    "free utility tools",
    "QR code generator",
    "password generator",
    "unit converter",
    "batch image compressor",
    "colour screen tester",
    "dead pixel tester",
    "simple online tools",
  ],
});

const TRUST_POINTS = [
  {
    title: "Browser-based where it matters",
    description:
      "Tools like the QR Code Generator, Password Generator, Unit Converter, Batch Image Compressor, and Colour Screen & Pixel Tester process your content locally in the browser whenever possible.",
  },
  {
    title: "Clear and useful",
    description:
      "Each tool is built to do one job well — without sign-up walls or cluttered editors.",
  },
  {
    title: "Friendly and trustworthy",
    description:
      "Plain language, careful privacy messaging, and a clean design you can rely on.",
  },
] as const;

/**
 * Googie Tools platform homepage.
 */
export default function HomePage() {
  const tools = getFeaturedTools(7);
  const availableTools = tools.filter((tool) => tool.status === "available");
  const comingSoonTools = tools.filter((tool) => tool.status === "coming-soon");

  return (
    <>
      <section className="pb-7 sm:pb-9" aria-labelledby="home-heading">
        <PageHeader
          headingId="home-heading"
          title="Simple tools that make life easier."
          description="Fast, friendly online tools designed to help you get things done without unnecessary complexity."
        />
      </section>

      <section
        className="scroll-mt-24 pb-12 pt-4 sm:pb-16 sm:pt-5 lg:pb-[4.5rem]"
        id="tools"
        aria-labelledby="tools-heading"
      >
        <Container>
          <div className="mb-9 max-w-2xl sm:mb-11">
            <div className="flex items-start gap-3">
              <SparkleMark size="md" className="mt-[0.45em] shrink-0" />
              <div className="min-w-0">
                <h2
                  id="tools-heading"
                  className="font-display text-[clamp(1.625rem,3vw,2.0625rem)] font-semibold leading-tight tracking-tight text-foreground"
                >
                  Tools
                </h2>
                <p className="mt-3.5 text-base leading-relaxed text-muted sm:text-lg">
                  Start with what’s ready today. More utilities are on the way.
                </p>
              </div>
            </div>
          </div>

          <ToolCardGrid tools={availableTools} />

          {comingSoonTools.length > 0 ? (
            <div className="mt-10 sm:mt-12">
              <div
                className="mb-6 flex items-center gap-4 sm:mb-7"
                role="separator"
                aria-label="Coming soon tools"
              >
                <div className="h-px flex-1 bg-border" />
                <p className="shrink-0 font-display text-sm font-semibold tracking-tight text-muted sm:text-base">
                  Coming soon
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>

              <ToolCardGrid
                tools={comingSoonTools}
                cardSize="compact"
                className="mx-auto max-w-3xl lg:grid-cols-2"
              />
            </div>
          ) : null}
        </Container>
      </section>

      <Section
        className="border-y border-border/80 bg-surface/60"
        aria-labelledby="trust-heading"
      >
        <Container>
          <div className="mb-9 max-w-2xl sm:mb-11">
            <SectionTitle id="trust-heading">Built to be helpful</SectionTitle>
            <p className="mt-3.5 text-base leading-relaxed text-muted sm:text-lg">
              Let’s make something useful — with tools that stay clear, fast, and
              easy to trust.
            </p>
          </div>

          <ul className="grid list-none gap-8 p-0 sm:grid-cols-3 sm:gap-10">
            {TRUST_POINTS.map((point) => (
              <li key={point.title}>
                <article>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-2.5 text-base leading-relaxed text-muted">
                    {point.description}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
