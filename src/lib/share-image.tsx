import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";
import { SITE_NAME } from "@/lib/constants";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const SHARE_IMAGE_ALT = `${SITE_NAME} — ${BRAND.primaryTagline}`;

/**
 * Shared Open Graph / Twitter share image markup.
 */
export function createShareImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "#F8FAFC",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                background: "#FACC15",
                clipPath:
                  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
              }}
            />
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                border: "4px solid #2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563EB",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              :)
            </div>
            <div
              style={{
                width: 18,
                height: 18,
                background: "#FACC15",
                clipPath:
                  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 34, fontWeight: 700 }}>
            <span style={{ color: "#1F2937" }}>Googie</span>
            <span style={{ color: "#2563EB" }}>Tools</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 750,
              lineHeight: 1.1,
              color: "#1F2937",
              maxWidth: 920,
            }}
          >
            {BRAND.primaryTagline}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#64748B",
              maxWidth: 860,
              lineHeight: 1.35,
            }}
          >
            Fast, friendly online tools — starting with a free QR code
            generator.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#2563EB",
            fontWeight: 600,
          }}
        >
          {BRAND.secondaryTagline}
        </div>
      </div>
    ),
    { ...SHARE_IMAGE_SIZE },
  );
}
