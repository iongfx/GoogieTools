"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { GoogieEmptyStateIcon } from "@/components/brand/GoogieEmptyStateIcon";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { ToolResultPanel } from "@/components/tools/ToolResultPanel";
import { ToolWorkspaceShell } from "@/components/tools/ToolWorkspaceShell";
import { QR_TOOL } from "@/config/tools";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { Textarea } from "@/components/ui/Textarea";
import {
  copyPngDataUrlToClipboard,
  createQrPngDataUrl,
  createQrSvg,
  DOWNLOAD_SIZES,
  downloadDataUrl,
  downloadSvg,
  getDownloadWidth,
  isDownloadSizeId,
  qrFilenameStem,
  type DownloadSizeId,
} from "@/lib/qr";
import { decodeQrFromImageFile } from "@/lib/qr-decode";
import {
  buildTextPayload,
  buildWifiPayloadResult,
  isWifiEncryption,
  MAX_TEXT_LENGTH,
  type QrMode,
  type WifiForm,
} from "@/lib/qr-payload";
import {
  DEFAULT_COLOR_STYLE_ID,
  getColorStyle,
  QR_COLOR_STYLES,
  type QrColorStyleId,
} from "@/lib/qr-styles";
import { validateAndNormalizeUrl } from "@/lib/validate-url";
import { cn } from "@/lib/utils";

type QrState = {
  payload: string;
  label: string;
  previewDataUrl: string;
};

type PayloadOk = { ok: true; payload: string; label: string };
type PayloadErr = { ok: false; error: string };

type SparkleLayout = {
  /** Vertical position on the QR (0 = top, 100 = bottom). */
  rightOffsetPercent: number;
  leftOffsetPercent: number;
  /** When true, the right sparkle starts first. */
  rightFirst: boolean;
};

const SPARKLE_STAGGER_MS = 420;

/** Stable default — never randomize during the first server/client render. */
const DEFAULT_SPARKLE_LAYOUT: SparkleLayout = {
  rightOffsetPercent: 50,
  leftOffsetPercent: 50,
  rightFirst: true,
};

function createSparkleLayout(): SparkleLayout {
  return {
    rightOffsetPercent: Math.round(Math.random() * 100),
    leftOffsetPercent: Math.round(Math.random() * 100),
    rightFirst: Math.random() < 0.5,
  };
}

const CREATE_MODES: { id: Exclude<QrMode, "upload">; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "wifi", label: "Wi‑Fi" },
];

const DECODE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp";
const DECODE_FILE_TYPES_LABEL = "PNG, JPG, or WebP";

function resolvePayload(
  mode: QrMode,
  urlInput: string,
  textInput: string,
  wifi: WifiForm,
): PayloadOk | PayloadErr {
  if (mode === "url") {
    const urlResult = validateAndNormalizeUrl(urlInput);
    return urlResult.ok
      ? { ok: true, payload: urlResult.url, label: urlResult.url }
      : { ok: false, error: urlResult.error };
  }

  if (mode === "text") {
    return buildTextPayload(textInput);
  }

  if (mode === "upload") {
    return { ok: false, error: "Upload an image that contains a QR code." };
  }

  return buildWifiPayloadResult(wifi);
}

async function buildPreview(
  payload: string,
  label: string,
  colors: { dark: string; light: string },
): Promise<QrState> {
  const previewDataUrl = await createQrPngDataUrl(payload, {
    width: 280,
    dark: colors.dark,
    light: colors.light,
    errorCorrectionLevel: "M",
  });

  return { payload, label, previewDataUrl };
}

/**
 * Main QR Code Generator tool.
 * Preview updates live; PNG/SVG exports are generated on demand for speed.
 */
export function QrGenerator() {
  const inputId = useId();
  const errorId = useId();
  const sizeId = useId();
  const modeGroupId = useId();
  const uploadInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const generationId = useRef(0);
  const actionTimeoutRef = useRef<number | null>(null);

  const [mode, setMode] = useState<QrMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [wifi, setWifi] = useState<WifiForm>({
    ssid: "",
    password: "",
    encryption: "WPA",
    hidden: false,
  });
  const [decodedPayload, setDecodedPayload] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [styleId, setStyleId] = useState<QrColorStyleId>(DEFAULT_COLOR_STYLE_ID);
  const [downloadSize, setDownloadSize] = useState<DownloadSizeId>("large");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [qr, setQr] = useState<QrState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Enter content to begin.");
  const [sparkleBurstKey, setSparkleBurstKey] = useState(0);
  const [sparkleLayout, setSparkleLayout] = useState<SparkleLayout>(
    DEFAULT_SPARKLE_LAYOUT,
  );
  const hadQrRef = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        window.clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl);
    };
  }, [uploadedImageUrl]);

  function playSparkles() {
    setSparkleLayout(createSparkleLayout());
    setSparkleBurstKey((key) => key + 1);
  }

  function showActionStatus(message: string, clearAfterMs = 2000) {
    setActionStatus(message);
    if (actionTimeoutRef.current) window.clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = window.setTimeout(
      () => setActionStatus(null),
      clearAfterMs,
    );
  }

  function clearUploadState() {
    setDecodedPayload(null);
    setUploadFileName(null);
    setIsDecoding(false);
    setUploadedImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  }

  useEffect(() => {
    const hasResult = Boolean(qr) || Boolean(decodedPayload);
    if (hasResult && !hadQrRef.current) {
      setSparkleLayout(createSparkleLayout());
      setSparkleBurstKey((key) => key + 1);
      // On phone/tablet, bring the new preview into view.
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1023px)").matches
      ) {
        window.requestAnimationFrame(() => {
          previewRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
    }
    hadQrRef.current = hasResult;
  }, [qr, decodedPayload]);

  useEffect(() => {
    let cancelled = false;

    // Decode mode shows the uploaded image + text result in the preview panel.
    if (mode === "upload") {
      setQr(null);
      if (!decodedPayload) {
        setStatusMessage("Upload a QR code image to decode it.");
      }
      return () => {
        cancelled = true;
      };
    }

    const result = resolvePayload(mode, urlInput, textInput, wifi);

    if (!result.ok) {
      setQr(null);
      setError(touched ? result.error : null);
      setStatusMessage("Add valid content to see a live preview.");
      return () => {
        cancelled = true;
      };
    }

    setError(null);
    const colors = getColorStyle(styleId);
    setStatusMessage("Updating preview…");
    const requestId = ++generationId.current;

    const timer = window.setTimeout(() => {
      startTransition(() => {
        void buildPreview(result.payload, result.label, colors)
          .then((next) => {
            if (cancelled || requestId !== generationId.current) return;
            setQr(next);
            setStatusMessage("Preview ready.");
          })
          .catch(() => {
            if (cancelled || requestId !== generationId.current) return;
            setError(
              "Something went wrong while creating the QR code. Please try again.",
            );
            setStatusMessage("Generation failed.");
          });
      });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, urlInput, textInput, wifi, styleId, touched, decodedPayload]);

  function handleCreateWifiQr() {
    setTouched(true);

    const result = resolvePayload("wifi", urlInput, textInput, wifi);
    if (!result.ok) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }

    const colors = getColorStyle(styleId);
    setError(null);
    setStatusMessage("Generating…");
    const requestId = ++generationId.current;

    startTransition(() => {
      void buildPreview(result.payload, result.label, colors)
        .then((next) => {
          if (requestId !== generationId.current) return;
          setQr(next);
          setStatusMessage("Preview ready.");
        })
        .catch(() => {
          if (requestId !== generationId.current) return;
          setError(
            "Something went wrong while creating the QR code. Please try again.",
          );
          setStatusMessage("Generation failed.");
        });
    });
  }

  async function handleUploadFile(file: File | undefined) {
    if (!file) return;

    setMode("upload");
    setTouched(true);
    setIsDecoding(true);
    setError(null);
    setDecodedPayload(null);
    setQr(null);
    setUploadFileName(file.name);
    setStatusMessage("Decoding QR code…");

    setUploadedImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });

    try {
      const result = await decodeQrFromImageFile(file);
      if (!result.ok) {
        setError(result.error);
        setStatusMessage("Could not decode that image.");
        return;
      }

      setDecodedPayload(result.data);
      setStatusMessage("Decoded QR ready.");
      showActionStatus("QR code decoded");
      playSparkles();
    } catch {
      setError(
        "Couldn’t decode that image. Try another file or a clearer screenshot.",
      );
      setStatusMessage("Could not decode that image.");
    } finally {
      setIsDecoding(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  function handleClear() {
    generationId.current += 1;
    setUrlInput("");
    setTextInput("");
    setWifi({ ssid: "", password: "", encryption: "WPA", hidden: false });
    clearUploadState();
    setError(null);
    setTouched(false);
    setActionStatus(null);
    setQr(null);
    setStatusMessage(
      mode === "upload"
        ? "Upload a QR code image to decode it."
        : "Enter content to begin.",
    );
    if (mode !== "upload") {
      inputRef.current?.focus();
    }
  }

  function handleModeChange(next: Exclude<QrMode, "upload">) {
    setMode(next);
    setError(null);
    setTouched(false);
    setActionStatus(null);
    clearUploadState();
  }

  function handleDecodeClick() {
    setError(null);
    setActionStatus(null);
    // Open the system file picker right away from this click.
    uploadInputRef.current?.click();
  }

  async function handleDownloadPng() {
    if (!qr) return;
    setIsExporting(true);
    try {
      const width = getDownloadWidth(downloadSize);
      const colors = getColorStyle(styleId);
      const dataUrl = await createQrPngDataUrl(qr.payload, {
        width,
        dark: colors.dark,
        light: colors.light,
      });
      downloadDataUrl(`${qrFilenameStem(qr.label)}.png`, dataUrl);
      setStatusMessage("PNG download started.");
      showActionStatus("Download started");
      playSparkles();
    } catch {
      setError("Could not download PNG. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadSvg() {
    if (!qr) return;
    setIsExporting(true);
    try {
      const colors = getColorStyle(styleId);
      const svgMarkup = await createQrSvg(qr.payload, {
        width: 512,
        dark: colors.dark,
        light: colors.light,
      });
      downloadSvg(`${qrFilenameStem(qr.label)}.svg`, svgMarkup);
      setStatusMessage("SVG download started.");
      showActionStatus("Download started");
      playSparkles();
    } catch {
      setError("Could not download SVG. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleCopy() {
    if (!qr) return;
    setIsExporting(true);
    try {
      const colors = getColorStyle(styleId);
      const dataUrl = await createQrPngDataUrl(qr.payload, {
        width: 1024,
        dark: colors.dark,
        light: colors.light,
      });
      await copyPngDataUrlToClipboard(dataUrl);
      setStatusMessage("Copied to clipboard.");
      showActionStatus("Copied to clipboard");
      playSparkles();
    } catch {
      showActionStatus(
        "Copy isn’t supported here — download PNG instead",
        3000,
      );
    } finally {
      setIsExporting(false);
    }
  }

  const hasQr = Boolean(qr);
  const hasDecodeResult = Boolean(uploadedImageUrl);
  const showError = Boolean(error);
  const activeStyle = getColorStyle(styleId);
  const hasAnyInput = Boolean(
    urlInput ||
      textInput ||
      wifi.ssid ||
      decodedPayload ||
      uploadFileName ||
      uploadedImageUrl ||
      hasQr,
  );
  const busy = isPending || isExporting || isDecoding;
  const previewBusy = hasQr || (mode === "upload" && hasDecodeResult);

  return (
    <ToolWorkspaceShell icon={QR_TOOL.icon}>
    <Card
      padding="lg"
      className="border-border shadow-soft-md"
    >
      <div className="flex flex-col gap-8">
        {/* 1) Mode controls + form inputs */}
        <div className="min-w-0">
          <input
            ref={uploadInputRef}
            id={uploadInputId}
            type="file"
            accept={DECODE_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              void handleUploadFile(event.target.files?.[0]);
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div
              className="flex w-full flex-wrap gap-2.5 sm:w-auto"
              role="radiogroup"
              aria-labelledby={modeGroupId}
            >
              <span id={modeGroupId} className="sr-only">
                QR content type
              </span>
              {CREATE_MODES.map((item) => {
                const selected = mode === item.id;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    variant={selected ? "primary" : "secondary"}
                    onClick={() => handleModeChange(item.id)}
                    className="flex-1 sm:flex-none"
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={mode === "upload" ? "primary" : "secondary"}
                disabled={busy}
                onClick={handleDecodeClick}
                className="w-full sm:w-auto"
              >
                {isDecoding ? "Decoding…" : "Decode QR Code"}
              </Button>
              <p className="text-[0.9375rem] text-muted sm:text-base">
                {DECODE_FILE_TYPES_LABEL}
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClear}
                disabled={!hasAnyInput || busy}
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {mode === "url" ? (
              <div>
                <Label htmlFor={inputId}>Website URL</Label>
                <Input
                  ref={inputRef}
                  id={inputId}
                  name="url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com"
                  value={urlInput}
                  aria-invalid={showError}
                  aria-describedby={showError ? errorId : undefined}
                  onBlur={() => setTouched(true)}
                  onChange={(event) => {
                    setUrlInput(event.target.value);
                    setTouched(true);
                  }}
                  onKeyDown={(event) => {
                    // Stop mobile “Go” / Enter from trying to submit a page form.
                    if (event.key === "Enter") event.preventDefault();
                  }}
                />
              </div>
            ) : null}

            {mode === "text" ? (
              <div>
                <Label htmlFor={`${inputId}-text`}>Text</Label>
                <div className="relative">
                  <Textarea
                    id={`${inputId}-text`}
                    name="text"
                    rows={4}
                    maxLength={MAX_TEXT_LENGTH}
                    placeholder="Type a message, note, or plain text…"
                    value={textInput}
                    aria-invalid={showError}
                    aria-describedby={
                      showError
                        ? `${errorId} ${inputId}-text-count`
                        : `${inputId}-text-count`
                    }
                    onBlur={() => setTouched(true)}
                    onChange={(event) => {
                      setTextInput(event.target.value);
                      setTouched(true);
                    }}
                    className="pb-8"
                  />
                  <p
                    id={`${inputId}-text-count`}
                    className="pointer-events-none absolute bottom-2.5 right-3 text-[0.8125rem] text-muted"
                    aria-live="polite"
                  >
                    {textInput.length}/{MAX_TEXT_LENGTH} characters
                  </p>
                </div>
              </div>
            ) : null}

            {mode === "wifi" ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`${inputId}-ssid`}>Network name (SSID)</Label>
                  <Input
                    ref={inputRef}
                    id={`${inputId}-ssid`}
                    name="ssid"
                    autoComplete="off"
                    placeholder="Home Wi‑Fi"
                    value={wifi.ssid}
                    aria-invalid={showError}
                    aria-describedby={showError ? errorId : undefined}
                    onBlur={() => setTouched(true)}
                    onChange={(event) => {
                      setWifi((prev) => ({ ...prev, ssid: event.target.value }));
                      setTouched(true);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`${inputId}-password`}>Password</Label>
                  <Input
                    id={`${inputId}-password`}
                    name="password"
                    type="password"
                    autoComplete="off"
                    placeholder={
                      wifi.encryption === "nopass"
                        ? "Not needed for open networks"
                        : "Network password"
                    }
                    value={wifi.password}
                    disabled={wifi.encryption === "nopass"}
                    onChange={(event) => {
                      setWifi((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }));
                      setTouched(true);
                    }}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`${inputId}-encryption`}>Security</Label>
                    <Select
                      id={`${inputId}-encryption`}
                      value={wifi.encryption}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!isWifiEncryption(value)) return;
                        setWifi((prev) => ({ ...prev, encryption: value }));
                        setTouched(true);
                      }}
                    >
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (open)</option>
                    </Select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="inline-flex min-h-11 items-center gap-2.5 text-[0.9375rem] text-foreground sm:text-base">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-border text-accent focus:ring-ring"
                        checked={wifi.hidden}
                        onChange={(event) => {
                          setWifi((prev) => ({
                            ...prev,
                            hidden: event.target.checked,
                          }));
                          setTouched(true);
                        }}
                      />
                      Hidden network
                    </label>
                  </div>
                </div>
                <p className="text-[0.9375rem] leading-relaxed text-muted">
                  Anyone who can see or scan this code may be able to join the
                  network.
                </p>
              </div>
            ) : null}

            {showError && error && mode !== "upload" ? (
              <FriendlyError id={errorId} message={error} />
            ) : mode === "wifi" || mode === "upload" ? null : (
              <p className="text-[0.9375rem] leading-relaxed text-muted">
                {mode === "url"
                  ? "Tip: you can paste with or without https://"
                  : "Short, clear text scans more reliably."}
              </p>
            )}

            {mode !== "upload" ? (
            <fieldset>
              <legend className="mb-2.5 text-[0.9375rem] font-medium text-foreground sm:text-base">
                Style
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {QR_COLOR_STYLES.map((style) => {
                  const selected = style.id === styleId;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setStyleId(style.id)}
                      aria-pressed={selected}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-[transform,box-shadow,border-color] duration-200",
                        selected
                          ? "border-accent bg-accent-soft text-accent shadow-soft-sm"
                          : "border-border bg-surface text-muted hover:-translate-y-px hover:border-accent/40 hover:text-foreground",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{
                          background: `linear-gradient(135deg, ${style.dark} 50%, ${style.light} 50%)`,
                        }}
                      />
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            ) : null}

            {mode === "wifi" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={handleCreateWifiQr}
                  className="w-full sm:w-auto"
                >
                  {isPending ? "Creating…" : "Create QR code"}
                </Button>
              </div>
            ) : null}
          </div>

          <p className="sr-only" aria-live="polite">
            {statusMessage}
          </p>
        </div>

        {/* 2) Live preview — full width under the mode controls */}
        <div
          ref={previewRef}
          className="w-full scroll-mt-28"
        >
          <ToolResultPanel
            label="Live preview"
            animate={previewBusy}
            className="[&>p:first-child]:pr-16"
            style={
              mode === "upload"
                ? undefined
                : { backgroundColor: activeStyle.light }
            }
          >
            {mode === "upload" && hasDecodeResult ? (
              <div className="flex w-full flex-col items-center gap-5">
                {decodedPayload ? (
                  <SuccessMessage
                    title="QR code decoded"
                    description="Text only — no links were opened."
                    className="mb-1"
                  />
                ) : null}

                <div className="relative w-full overflow-visible px-5 sm:px-8">
                  {decodedPayload ? (
                    <>
                      <span
                        className="pointer-events-none absolute left-0 z-10 -translate-x-1/2 -translate-y-1/2"
                        style={{ top: `${sparkleLayout.leftOffsetPercent}%` }}
                      >
                        <SparkleBurst
                          playKey={sparkleBurstKey}
                          delayMs={
                            sparkleLayout.rightFirst ? SPARKLE_STAGGER_MS : 0
                          }
                          size="sm"
                        />
                      </span>
                      <span
                        className="pointer-events-none absolute right-0 z-10 translate-x-1/2 -translate-y-1/2"
                        style={{ top: `${sparkleLayout.rightOffsetPercent}%` }}
                      >
                        <SparkleBurst
                          playKey={sparkleBurstKey}
                          delayMs={
                            sparkleLayout.rightFirst ? 0 : SPARKLE_STAGGER_MS
                          }
                        />
                      </span>
                    </>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                    <div className="min-w-0 space-y-2">
                      <p className="text-center text-[0.9375rem] font-medium text-foreground sm:text-base">
                        Uploaded QR code
                      </p>
                      <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-border bg-background p-3 sm:min-h-[14rem]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                        <img
                          src={uploadedImageUrl!}
                          alt={
                            uploadFileName
                              ? `Uploaded QR code image: ${uploadFileName}`
                              : "Uploaded QR code image"
                          }
                          className="max-h-56 w-auto max-w-full object-contain"
                        />
                      </div>
                      {uploadFileName ? (
                        <p className="truncate text-center text-sm text-muted">
                          {uploadFileName}
                        </p>
                      ) : null}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <p className="text-center text-[0.9375rem] font-medium text-foreground sm:text-base">
                        Decoded result
                      </p>
                      <div className="flex min-h-[12rem] flex-col rounded-xl border border-border bg-background p-3 sm:min-h-[14rem]">
                        {isDecoding ? (
                          <p className="m-auto text-center text-[0.9375rem] text-muted sm:text-base">
                            Decoding…
                          </p>
                        ) : decodedPayload ? (
                          <p className="m-0 whitespace-pre-wrap break-all font-mono text-sm leading-relaxed text-foreground sm:text-[0.9375rem]">
                            {decodedPayload}
                          </p>
                        ) : showError && error ? (
                          <FriendlyError
                            id={errorId}
                            message={error}
                            className="m-auto text-center"
                          />
                        ) : (
                          <p className="m-auto text-center text-[0.9375rem] text-muted sm:text-base">
                            No text found yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  role="note"
                  className="w-full rounded-xl border border-accent/30 bg-accent-soft/40 px-3.5 py-3 sm:px-4"
                >
                  <p className="text-[0.9375rem] font-semibold text-accent sm:text-base">
                    Safety note
                  </p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                    We only show the text inside the QR code — we never open
                    links or download files. Unknown codes can hide harmful or
                    fake websites, look‑alike addresses, or Wi‑Fi passwords. Only
                    trust codes from people or places you know. Decoding stays on
                    your device. Press Decode QR Code again to try another image.
                  </p>
                </div>
              </div>
            ) : hasQr && qr ? (
              <div className="relative flex w-full flex-col items-center">
                <SuccessMessage
                  title="Your QR code is ready"
                  description="Preview it below, then copy or download it."
                  className="mb-4 sm:mb-5"
                />
                <div className="relative w-full max-w-[240px] sm:max-w-[280px]">
                  {/* Wrappers hold edge position; animation transforms stay on SparkleBurst */}
                  <span
                    className="pointer-events-none absolute left-0 z-10 -translate-x-1/2 -translate-y-1/2"
                    style={{ top: `${sparkleLayout.leftOffsetPercent}%` }}
                  >
                    <SparkleBurst
                      playKey={sparkleBurstKey}
                      delayMs={
                        sparkleLayout.rightFirst ? SPARKLE_STAGGER_MS : 0
                      }
                      size="sm"
                    />
                  </span>
                  <span
                    className="pointer-events-none absolute right-0 z-10 translate-x-1/2 -translate-y-1/2"
                    style={{ top: `${sparkleLayout.rightOffsetPercent}%` }}
                  >
                    <SparkleBurst
                      playKey={sparkleBurstKey}
                      delayMs={
                        sparkleLayout.rightFirst ? 0 : SPARKLE_STAGGER_MS
                      }
                    />
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL preview */}
                  <img
                    src={qr.previewDataUrl}
                    alt={`QR code for ${qr.label}`}
                    width={280}
                    height={280}
                    className="h-auto w-full rounded-xl shadow-soft-sm"
                  />
                </div>
                {mode === "url" || mode === "wifi" ? (
                  <p className="mt-3 max-w-[18rem] break-all text-center text-[0.8125rem] text-muted sm:max-w-[20rem] sm:text-sm">
                    {mode === "url" ? (
                      <>
                        Using{" "}
                        <span className="text-foreground/75">{qr.label}</span>
                      </>
                    ) : (
                      <>
                        Network{" "}
                        <span className="text-foreground/75">
                          {wifi.ssid.trim() || qr.label.replace(/^Wi‑Fi:\s*/, "")}
                        </span>
                      </>
                    )}
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="Ready when you are"
                description={
                  mode === "wifi"
                    ? "Enter your Wi‑Fi details, then create your QR code."
                    : mode === "upload"
                      ? "Pick a QR image to decode. Results appear here as text only."
                      : "Type or paste your content — the preview updates as you go."
                }
              >
                <GoogieEmptyStateIcon size="md" />
              </EmptyState>
            )}
          </ToolResultPanel>
        </div>

        {/* 3) PNG size — under live preview */}
        {mode !== "upload" ? (
          <div className="min-w-0">
            <div className="max-w-xs">
              <Label htmlFor={sizeId}>PNG download size</Label>
              <Select
                id={sizeId}
                value={downloadSize}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isDownloadSizeId(value)) setDownloadSize(value);
                }}
              >
                {DOWNLOAD_SIZES.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label} ({size.width}px)
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      {/*
        Shared action row — full-width rule across the tool box, buttons underneath
        (same pattern as Free Password Generator). Hidden while decoding because
        there is no generated QR image to export.
      */}
      {mode !== "upload" ? (
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <Button
            type="button"
            onClick={() => void handleDownloadPng()}
            disabled={!hasQr || busy}
            className="w-full sm:w-auto"
          >
            Download PNG
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleDownloadSvg()}
            disabled={!hasQr || busy}
            className="w-full sm:w-auto"
          >
            Download SVG
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleCopy()}
            disabled={!hasQr || busy}
            className="w-full sm:w-auto"
          >
            Copy image
          </Button>
        </div>
        {actionStatus ? (
          <p
            className="mt-3 text-center text-[0.9375rem] font-medium text-success"
            role="status"
            aria-live="polite"
          >
            {actionStatus}
          </p>
        ) : null}
      </div>
      ) : actionStatus ? (
        <p
          className="mt-6 text-center text-[0.9375rem] font-medium text-success"
          role="status"
          aria-live="polite"
        >
          {actionStatus}
        </p>
      ) : null}
    </Card>
    </ToolWorkspaceShell>
  );
}
