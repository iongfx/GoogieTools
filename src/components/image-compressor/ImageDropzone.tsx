"use client";

import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { IMAGE_BATCH_LIMITS } from "@/lib/image-compressor-config";
import { formatFileSize } from "@/lib/image-file-utils";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  disabled?: boolean;
  /** Compact layout for the left column after images are imported. */
  compact?: boolean;
  onFiles: (files: File[]) => void;
};

/**
 * Accessible drag-and-drop + file-picker upload area.
 */
export function ImageDropzone({
  disabled = false,
  compact = false,
  onFiles,
}: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function emitFiles(list: FileList | File[] | null) {
    if (!list || disabled) return;
    const files = Array.from(list);
    if (files.length) onFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;
    emitFiles(event.dataTransfer.files);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-controls={inputId}
        aria-label="Add your images. Drop JPG, PNG, or WebP files here, or press Enter to choose files."
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed text-center transition-[border-color,background-color,box-shadow] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          compact
            ? "px-4 py-5 sm:px-5 sm:py-6"
            : "px-5 py-8 sm:px-8 sm:py-10",
          dragOver
            ? "border-accent bg-accent-soft/60 shadow-soft-sm"
            : "border-border bg-background/70 hover:border-accent/50 hover:bg-accent-tint/40",
          disabled && "pointer-events-none opacity-55",
        )}
      >
        <p
          className={cn(
            "font-display font-semibold tracking-tight text-foreground",
            compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
          )}
        >
          Add your images
        </p>
        <p
          className={cn(
            "mx-auto leading-relaxed text-muted",
            compact
              ? "mt-2 max-w-none text-sm"
              : "mt-2.5 max-w-md text-[0.9375rem] sm:text-base",
          )}
        >
          {compact
            ? "Drop more files here, or choose files."
            : "Drop JPG, PNG, or WebP files here, or choose files from your device."}
        </p>
        {!compact ? (
          <p className="mt-4 text-sm text-muted">
            Up to {IMAGE_BATCH_LIMITS.maxFiles} files ·{" "}
            {formatFileSize(IMAGE_BATCH_LIMITS.maxFileBytes)} per file ·{" "}
            {formatFileSize(IMAGE_BATCH_LIMITS.maxTotalBytes)} total
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Up to {IMAGE_BATCH_LIMITS.maxFiles} files
          </p>
        )}
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-xl bg-accent font-semibold text-accent-foreground shadow-soft-sm",
            compact
              ? "mt-3 min-h-10 px-4 py-2 text-sm"
              : "mt-5 min-h-11 px-5 py-2.5 text-[0.9375rem] sm:text-base",
          )}
        >
          Choose files
        </span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          emitFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <label htmlFor={inputId} className="sr-only">
        Choose JPG, PNG, or WebP image files
      </label>
    </div>
  );
}
