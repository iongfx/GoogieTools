import type { CropFocus } from "@/lib/image-compressor-config";
import type { ManualCropState } from "@/lib/image-crop-editor";
import type { ImageKind } from "@/lib/image-formats";

export type BatchItemStatus =
  | "queued"
  | "ready"
  | "processing"
  | "complete"
  | "failed"
  | "rejected";

export type BatchImageOutput = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  filename: string;
  outputKind: ImageKind;
};

/**
 * Lightweight batch item. Stores File references and object URLs —
 * not base64 or full decoded bitmaps in React state.
 */
export type BatchImageItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  kind: ImageKind;
  thumbnailUrl: string | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  status: BatchItemStatus;
  error: string | null;
  warning: string | null;
  /** Optional per-image crop focus override (legacy / secondary). */
  cropFocusOverride?: CropFocus;
  /** Independent manual Fill-and-crop state for this image. */
  cropState: ManualCropState | null;
  /** Latest estimated output bytes for the current settings fingerprint. */
  estimatedBytes: number | null;
  /** Settings/crop key used when estimatedBytes was produced; null means stale. */
  estimateKey: string | null;
  output: BatchImageOutput | null;
};
