/**
 * Google AdSense publisher settings.
 * Keep the client ID in sync with public/ads.txt (pub-… line, without “ca-”).
 */
export const ADSENSE_CLIENT_ID = "ca-pub-8656362001270357";

/** ads.txt publisher id (no “ca-” prefix). */
export const ADSENSE_PUBLISHER_ID = ADSENSE_CLIENT_ID.replace(/^ca-/, "");
