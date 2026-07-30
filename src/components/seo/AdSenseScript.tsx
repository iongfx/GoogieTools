import { ADSENSE_CLIENT_ID } from "@/lib/adsense";

/**
 * Google AdSense loader for site ownership verification and Auto ads.
 * Rendered in <head> as a plain script so Google can see it in page HTML.
 */
export function AdSenseScript() {
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}
