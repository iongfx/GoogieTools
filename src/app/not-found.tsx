import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextLink } from "@/components/ui/TextLink";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * Shown when a user visits a page that does not exist.
 */
export default function NotFound() {
  return (
    <Container className="flex flex-col items-start py-16 sm:py-24">
      <Card className="max-w-lg" padding="lg">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          404
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          That link doesn’t exist. Head back home, or open a tool from the
          directory.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/">Back to home</Button>
          <Button href="/tools/qr-code-generator" variant="secondary">
            QR Code Generator
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted">
          Or <TextLink href="/contact">contact us</TextLink> if something looks
          broken.
        </p>
      </Card>
    </Container>
  );
}
