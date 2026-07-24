"use client";

import { useId } from "react";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  IMAGE_PRESETS,
  IMAGE_QUALITY,
  OUTPUT_FORMAT_OPTIONS,
  presetOptionLabel,
  qualityGuidanceLabel,
  type ImageCompressorSettings,
  type OutputFormat,
  type PresetId,
} from "@/lib/image-compressor-config";
import { buildOutputFilename } from "@/lib/image-file-utils";
import {
  formatUsesQuality,
  resolveOutputKind,
  type ImageKind,
} from "@/lib/image-formats";
import { cn } from "@/lib/utils";

type ImageSettingsProps = {
  settings: ImageCompressorSettings;
  widthError: string | null;
  heightError: string | null;
  webpSupported: boolean | null;
  disabled?: boolean;
  /** First batch image — used for the live filename example. */
  exampleSourceName?: string | null;
  exampleSourceKind?: ImageKind | null;
  exampleSourceWidth?: number | null;
  exampleSourceHeight?: number | null;
  onPresetChange: (presetId: PresetId) => void;
  onSettingsPatch: (patch: Partial<ImageCompressorSettings>) => void;
};

/**
 * Preset, dimension, format, and quality controls.
 * Framing is handled by the manual preview (zoom / pan) at the chosen size.
 */
export function ImageSettings({
  settings,
  widthError,
  heightError,
  webpSupported,
  disabled = false,
  exampleSourceName = null,
  exampleSourceKind = null,
  exampleSourceWidth = null,
  exampleSourceHeight = null,
  onPresetChange,
  onSettingsPatch,
}: ImageSettingsProps) {
  const presetId = useId();
  const widthId = useId();
  const heightId = useId();
  const formatId = useId();
  const qualityId = useId();
  const enlargeId = useId();
  const prefixId = useId();
  const resolutionId = useId();

  const keepOriginal = settings.presetId === "keep-original";
  const showQuality = formatUsesQuality(settings.outputFormat);

  const exampleFilename = exampleSourceName
    ? buildOutputFilename({
        sourceName: exampleSourceName,
        outputKind: resolveOutputKind(
          settings.outputFormat,
          exampleSourceKind && exampleSourceKind !== "unknown"
            ? exampleSourceKind
            : "jpeg",
        ),
        width: keepOriginal
          ? (exampleSourceWidth ?? 600)
          : (settings.width ?? 600),
        height: keepOriginal
          ? (exampleSourceHeight ?? 600)
          : (settings.height ?? 600),
        keepOriginal,
        filenamePrefix: settings.filenamePrefix ?? "",
        includeResolutionInFilename:
          settings.includeResolutionInFilename ?? true,
      })
    : null;

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor={presetId}>Preset</Label>
        <Select
          id={presetId}
          value={settings.presetId}
          disabled={disabled}
          onChange={(event) => onPresetChange(event.target.value as PresetId)}
        >
          {IMAGE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {presetOptionLabel(preset)}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {IMAGE_PRESETS.find((preset) => preset.id === settings.presetId)
            ?.description}
        </p>
      </div>

      {!keepOriginal ? (
        <div className="grid gap-4 tool:grid-cols-2">
          <div>
            <Label htmlFor={widthId}>Width (px)</Label>
            <Input
              id={widthId}
              inputMode="numeric"
              pattern="[0-9]*"
              value={settings.width ?? ""}
              disabled={disabled}
              aria-invalid={widthError ? true : undefined}
              aria-describedby={widthError ? `${widthId}-error` : undefined}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (!raw) {
                  onSettingsPatch({ width: null });
                  return;
                }
                const next = Number.parseInt(raw, 10);
                onSettingsPatch({
                  width: Number.isFinite(next) ? next : Number.NaN,
                });
              }}
            />
            {widthError ? (
              <FriendlyError id={`${widthId}-error`} message={widthError} />
            ) : null}
          </div>
          <div>
            <Label htmlFor={heightId}>Height (px)</Label>
            <Input
              id={heightId}
              inputMode="numeric"
              pattern="[0-9]*"
              value={settings.height ?? ""}
              disabled={disabled}
              aria-invalid={heightError ? true : undefined}
              aria-describedby={heightError ? `${heightId}-error` : undefined}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (!raw) {
                  onSettingsPatch({ height: null });
                  return;
                }
                const next = Number.parseInt(raw, 10);
                onSettingsPatch({
                  height: Number.isFinite(next) ? next : Number.NaN,
                });
              }}
            />
            {heightError ? (
              <FriendlyError id={`${heightId}-error`} message={heightError} />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-muted">
          Width and height controls are hidden because this preset keeps each
          image’s original dimensions.
        </p>
      )}

      {!keepOriginal ? (
        <div className="flex items-start gap-3">
          <input
            id={enlargeId}
            type="checkbox"
            checked={settings.allowEnlarge}
            disabled={disabled}
            onChange={(event) =>
              onSettingsPatch({ allowEnlarge: event.target.checked })
            }
            className="mt-1 size-4 rounded border-border text-accent focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div>
            <Label htmlFor={enlargeId} className="mb-0">
              Allow smaller images to be enlarged
            </Label>
            <p className="mt-1 text-sm text-muted">
              Enlargement fills the frame but does not add real detail.
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor={formatId}>Output format</Label>
        <Select
          id={formatId}
          value={settings.outputFormat}
          disabled={disabled}
          onChange={(event) =>
            onSettingsPatch({
              outputFormat: event.target.value as OutputFormat,
            })
          }
        >
          {OUTPUT_FORMAT_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.value === "webp" && webpSupported === false}
            >
              {option.label}
              {option.value === "webp" && webpSupported === false
                ? " (not supported here)"
                : ""}
            </option>
          ))}
        </Select>
        {settings.outputFormat === "keep" ? (
          <p className="mt-2 text-sm text-muted">
            JPG stays JPG, PNG stays PNG, and WebP stays WebP. PNG output remains
            lossless even when a quality slider is shown for mixed batches.
          </p>
        ) : null}
        {settings.outputFormat === "webp" && webpSupported === false ? (
          <FriendlyError message="This browser cannot encode WebP. Choose JPG, PNG, or Keep original format." />
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-background/70 px-4 py-4">
        <div>
          <p className="font-display text-base font-semibold tracking-tight text-foreground">
            File renaming
          </p>
          <p className="mt-1 text-sm text-muted">
            Optional prefix for download and ZIP filenames.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor={prefixId} className="mb-0 shrink-0">
            Prefix
          </Label>
          <Input
            id={prefixId}
            value={settings.filenamePrefix ?? ""}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1"
            onChange={(event) =>
              onSettingsPatch({ filenamePrefix: event.target.value })
            }
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id={resolutionId}
            type="checkbox"
            checked={settings.includeResolutionInFilename ?? true}
            disabled={disabled}
            onChange={(event) =>
              onSettingsPatch({
                includeResolutionInFilename: event.target.checked,
              })
            }
            className="mt-1 size-4 rounded border-border text-accent focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="min-w-0">
            <Label htmlFor={resolutionId} className="mb-0">
              Include resolution in filename
            </Label>
            <p className="mt-1 text-sm text-muted">
              {exampleFilename ? (
                <>
                  Example:{" "}
                  <span className="break-all font-medium text-foreground">
                    {exampleFilename}
                  </span>
                </>
              ) : (
                "Upload an image to see an example filename."
              )}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted">
          Tip: double-click a filename above the preview or on a thumbnail card
          to rename that image.
        </p>
      </div>

      {showQuality ? (
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <Label htmlFor={qualityId} className="mb-0">
              Quality
            </Label>
            <p className="text-sm tabular-nums text-muted">
              {settings.quality} · {qualityGuidanceLabel(settings.quality)}
            </p>
          </div>
          <input
            id={qualityId}
            type="range"
            min={IMAGE_QUALITY.min}
            max={IMAGE_QUALITY.max}
            step={1}
            value={settings.quality}
            disabled={disabled}
            aria-valuemin={IMAGE_QUALITY.min}
            aria-valuemax={IMAGE_QUALITY.max}
            aria-valuenow={settings.quality}
            aria-valuetext={`${settings.quality}, ${qualityGuidanceLabel(settings.quality)}`}
            onChange={(event) =>
              onSettingsPatch({ quality: Number(event.target.value) })
            }
            className={cn(
              "image-quality-slider w-full cursor-pointer appearance-none rounded-full bg-transparent",
              disabled && "opacity-55",
            )}
          />
          <div className="mt-1.5 flex justify-between text-xs text-muted">
            <span>Smaller file</span>
            <span>Higher quality</span>
          </div>
          {settings.outputFormat === "keep" ? (
            <p className="mt-2 text-sm text-muted">
              Quality applies to JPG and WebP items. PNG stays lossless.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
