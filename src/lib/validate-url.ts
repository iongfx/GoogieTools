/**
 * URL helpers for the QR generator.
 * Keeps validation logic out of the UI component.
 */

export type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const MAX_URL_LENGTH = 2048;

function isValidIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

/**
 * Checks and normalizes a URL.
 * Adds https:// when the user leaves out the protocol.
 */
export function validateAndNormalizeUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: "Enter a URL to create your QR code." };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      error: "That URL is too long. Try a shorter link.",
    };
  }

  if (/\s/.test(trimmed)) {
    return {
      ok: false,
      error: "URLs cannot contain spaces. Remove spaces and try again.",
    };
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return {
      ok: false,
      error:
        "Oops! That doesn’t look like a valid URL. Try something like https://example.com.",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      error: "Only http:// and https:// links are supported.",
    };
  }

  const host = parsed.hostname;

  if (!host) {
    return {
      ok: false,
      error:
        "Oops! That doesn’t look like a valid URL. Try something like https://example.com.",
    };
  }

  const isLocalhost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "[::1]" ||
    host === "::1";
  const isIpv4 = isValidIpv4(host);
  const looksLikeDomain = host.includes(".");

  if (!isLocalhost && !isIpv4 && !looksLikeDomain) {
    return {
      ok: false,
      error:
        "Oops! That doesn’t look like a full website address. Try example.com.",
    };
  }

  return { ok: true, url: parsed.toString() };
}
