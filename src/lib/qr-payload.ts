/**
 * Builds the string that gets encoded into a QR code.
 * Different “modes” use different payload formats scanners understand.
 */

export type QrMode = "url" | "text" | "wifi";

export type WifiEncryption = "WPA" | "WEP" | "nopass";

export type WifiForm = {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
};

export const WIFI_ENCRYPTION_OPTIONS: WifiEncryption[] = [
  "WPA",
  "WEP",
  "nopass",
];

export function isWifiEncryption(value: string): value is WifiEncryption {
  return WIFI_ENCRYPTION_OPTIONS.includes(value as WifiEncryption);
}

/** Escape special characters for the WIFI: QR payload format */
function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifiPayload(form: WifiForm): string {
  const type = form.encryption === "nopass" ? "nopass" : form.encryption;
  const ssid = escapeWifiValue(form.ssid);
  const password =
    type === "nopass" ? "" : escapeWifiValue(form.password);
  const hidden = form.hidden ? "true" : "false";

  return `WIFI:T:${type};S:${ssid};P:${password};H:${hidden};;`;
}

export type PayloadResult =
  | { ok: true; payload: string; label: string }
  | { ok: false; error: string };

/** Max characters allowed in Text mode QR codes. */
export const MAX_TEXT_LENGTH = 1000;

export function buildTextPayload(text: string): PayloadResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter some text to encode." };
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Keep text under ${MAX_TEXT_LENGTH.toLocaleString()} characters so phones can scan it reliably.`,
    };
  }
  return { ok: true, payload: trimmed, label: trimmed.slice(0, 80) };
}

export function buildWifiPayloadResult(form: WifiForm): PayloadResult {
  const ssid = form.ssid.trim();
  const password = form.password.trim();

  if (!ssid) {
    return { ok: false, error: "Enter the Wi‑Fi network name (SSID)." };
  }
  if (ssid.length > 32) {
    return { ok: false, error: "Network name must be 32 characters or fewer." };
  }
  if (form.encryption !== "nopass" && !password) {
    return { ok: false, error: "Enter the Wi‑Fi password." };
  }
  if (password.length > 63) {
    return { ok: false, error: "Password must be 63 characters or fewer." };
  }

  const payload = buildWifiPayload({
    ...form,
    ssid,
    password,
  });

  return {
    ok: true,
    payload,
    label: `Wi‑Fi: ${ssid}`,
  };
}
