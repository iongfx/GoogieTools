/**
 * Batch download helpers for the image compressor.
 * Prefer saving into a user-picked folder when the browser supports it;
 * otherwise fall back to one download per file.
 */

import { triggerBlobDownload } from "@/lib/image-processing";

export type BatchDownloadFile = {
  filename: string;
  blob: Blob;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
};

/** True when this browser can ask the user to pick a folder and write files. */
export function canSaveImagesToFolder(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

/**
 * Ask the user for a folder, then write every blob there uncompressed.
 * Returns "cancelled" if they close the picker; "unsupported" if the API is missing.
 */
export async function saveImagesToFolder(
  files: readonly BatchDownloadFile[],
): Promise<"saved" | "cancelled" | "unsupported"> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) return "unsupported";
  if (!files.length) return "cancelled";

  try {
    const directory = await picker.call(window, {
      id: "googie-tools-image-exports",
      mode: "readwrite",
    });

    for (const file of files) {
      const handle = await directory.getFileHandle(file.filename, {
        create: true,
      });
      const writable = await handle.createWritable();
      try {
        await writable.write(file.blob);
      } finally {
        await writable.close();
      }
    }

    return "saved";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    throw error;
  }
}

/**
 * Trigger one browser download per file (default Downloads folder).
 * Small delays reduce browser “multiple download” blocking.
 */
export async function downloadImagesIndividually(
  files: readonly BatchDownloadFile[],
  delayMs = 200,
): Promise<void> {
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    triggerBlobDownload(file.blob, file.filename);
    if (index < files.length - 1) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
    }
  }
}
