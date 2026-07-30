"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { GoogieEmptyStateIcon } from "@/components/brand/GoogieEmptyStateIcon";
import { ColourInspector } from "@/components/colour-screen/ColourInspector";
import { EyedropperIcon } from "@/components/colour-screen/EyedropperIcon";
import { Button } from "@/components/ui/Button";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  displayedImageSize,
  imageOriginInPreview,
  loupeSampleOrigin,
  mapPreviewPointToPixel,
  zoomToShowFullImage,
  type ImageViewTransform,
} from "@/lib/colour-image-coords";
import {
  validateColourPickerImageFile,
  validateImageUrl,
} from "@/lib/colour-image-url";
import { hexToRgb, rgbToCss, rgbToHex } from "@/lib/colour-conversions";
import {
  CAMERA_PERMISSION_BLOCKED,
  CAMERA_UNSUPPORTED,
  CLIPBOARD_NO_IMAGE,
  CLIPBOARD_PERMISSION_BLOCKED,
  CORS_SAMPLE_BLOCKED,
  EYEDROPPER_UNSUPPORTED,
  IMAGE_PICKER,
} from "@/lib/colour-screen-config";
import type { RgbColour } from "@/lib/colour-types";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }
}

export type SampledColour = {
  rgb: RgbColour;
  alpha: number;
  sourceLabel: string;
  coordinates: { x: number; y: number } | null;
};

type ImageColourPickerProps = {
  onSampled: (sample: SampledColour) => void;
  onUseAsMarker: (colour: RgbColour) => void;
  onAddToCycle: (colour: RgbColour) => void;
  className?: string;
};

type LoadedImage = {
  url: string;
  revokeOnClear: boolean;
  sourceLabel: string;
  naturalWidth: number;
  naturalHeight: number;
  /** Canvas used for sampling; null when tainted / unavailable. */
  sampleCanvas: HTMLCanvasElement | null;
  sampleBlockedMessage: string | null;
};

const DEFAULT_TRANSFORM: ImageViewTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

/**
 * Browser-only image colour picker with upload, paste, URL, zoom, pan, and loupe.
 */
export function ImageColourPicker({
  onSampled,
  onUseAsMarker,
  onAddToCycle,
  className,
}: ImageColourPickerProps) {
  const baseId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraSessionRef = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);

  const [image, setImage] = useState<LoadedImage | null>(null);
  const [transform, setTransform] = useState<ImageViewTransform>(DEFAULT_TRANSFORM);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [sample, setSample] = useState<SampledColour | null>(null);
  const [panning, setPanning] = useState(false);
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    /** True once movement crosses the drag threshold. */
    didPan: boolean;
  } | null>(null);
  const scrollReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [previewSize, setPreviewSize] = useState({ width: 640, height: 448 });

  const PAN_DRAG_THRESHOLD_PX = 4;

  function minZoomForCurrentImage(): number {
    if (!image) return IMAGE_PICKER.zoomMin;
    return Math.max(
      IMAGE_PICKER.zoomMin,
      zoomToShowFullImage({
        width: previewSize.width,
        height: previewSize.height,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight,
      }),
    );
  }

  function clearScrollReleaseTimeout() {
    if (scrollReleaseTimeoutRef.current !== null) {
      clearTimeout(scrollReleaseTimeoutRef.current);
      scrollReleaseTimeoutRef.current = null;
    }
  }

  /** After sampling, briefly keep wheel-zoom, then blur so the page can scroll again. */
  function schedulePageScrollRelease() {
    clearScrollReleaseTimeout();
    scrollReleaseTimeoutRef.current = setTimeout(() => {
      scrollReleaseTimeoutRef.current = null;
      if (document.activeElement === previewRef.current) {
        previewRef.current?.blur();
      }
    }, 1000);
  }

  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const syncSize = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;
      setPreviewSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };

    // Measure before paint so a newly loaded image fits the real preview box
    // (not the placeholder 640×448 default).
    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [image]);

  // Enable Take photo when this browser can talk to a camera API.
  useEffect(() => {
    const canUseCameraApi =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      !!navigator.mediaDevices?.getUserMedia;
    setCameraSupported(canUseCameraApi);
    setEyeDropperSupported(
      typeof window !== "undefined" && "EyeDropper" in window,
    );
  }, []);

  const stopCameraStream = useCallback(() => {
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    stopCameraStream();
    setCameraOpen(false);
    setCameraStarting(false);
  }, [stopCameraStream]);

  useEffect(() => {
    if (!cameraOpen || cameraStarting) return;
    const stream = cameraStreamRef.current;
    const video = cameraVideoRef.current;
    if (!stream || !video) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    void video.play().catch(() => {
      /* muted + playsInline usually allows autoplay after permission */
    });
  }, [cameraOpen, cameraStarting]);

  useEffect(() => {
    if (!cameraOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCamera();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cameraOpen, closeCamera]);

  // Wheel zoom only after the preview is focused (click/tap first), same as crop editor.
  useEffect(() => {
    const node = previewRef.current;
    if (!node || !image) return;

    const onWheel = (event: WheelEvent) => {
      if (document.activeElement !== node) return;
      // Don't zoom while the cursor is over the preview action buttons.
      if (
        event.target instanceof Element &&
        event.target.closest("[data-preview-action]")
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const direction = event.deltaY > 0 ? -1 : 1;
      const minZoom = minZoomForCurrentImage();
      setTransform((prev) => {
        const nextZoom =
          direction > 0
            ? Math.min(
                IMAGE_PICKER.zoomMax,
                prev.zoom * IMAGE_PICKER.wheelZoomFactor,
              )
            : Math.max(minZoom, prev.zoom / IMAGE_PICKER.wheelZoomFactor);
        if (nextZoom === prev.zoom) return prev;
        return { ...prev, zoom: nextZoom };
      });
    };

    // Mobile: dragging to pan/sample must not scroll the page underneath.
    const onTouchMove = (event: TouchEvent) => {
      if (!gestureRef.current) return;
      event.preventDefault();
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    // Prefer document so the page can't scroll even if the gesture leaves the box.
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [image, previewSize.height, previewSize.width]);

  const clearImage = useCallback(() => {
    clearScrollReleaseTimeout();
    stopCameraStream();
    setCameraOpen(false);
    setCameraStarting(false);
    setImage((prev) => {
      if (prev?.revokeOnClear) URL.revokeObjectURL(prev.url);
      return null;
    });
    setTransform(DEFAULT_TRANSFORM);
    setHoverPixel(null);
    setSample(null);
  }, [stopCameraStream]);

  useEffect(() => {
    return () => {
      clearScrollReleaseTimeout();
      clearImage();
    };
  }, [clearImage]);

  async function buildSampleCanvas(
    img: HTMLImageElement,
  ): Promise<{ canvas: HTMLCanvasElement | null; blocked: string | null }> {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return { canvas: null, blocked: "This browser could not read image pixels." };
    }
    try {
      ctx.drawImage(img, 0, 0);
      ctx.getImageData(0, 0, 1, 1);
      return { canvas, blocked: null };
    } catch {
      return { canvas: null, blocked: CORS_SAMPLE_BLOCKED };
    }
  }

  async function loadFromObjectUrl(
    objectUrl: string,
    sourceLabel: string,
    revokeOnClear: boolean,
  ) {
    setLoading(true);
    setError(null);
    try {
      const img = await loadHtmlImage(objectUrl, false);
      const { canvas, blocked } = await buildSampleCanvas(img);
      setImage((prev) => {
        if (prev?.revokeOnClear) URL.revokeObjectURL(prev.url);
        return {
          url: objectUrl,
          revokeOnClear,
          sourceLabel,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          sampleCanvas: canvas,
          sampleBlockedMessage: blocked,
        };
      });
      setTransform(DEFAULT_TRANSFORM);
      setSample(null);
    } catch {
      if (revokeOnClear) URL.revokeObjectURL(objectUrl);
      setError("That image could not be loaded. Try a different JPG, PNG, or WebP file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFiles(
    files: FileList | File[] | null,
    sourceLabelPrefix = "Uploaded image",
  ) {
    const file = files?.[0];
    if (!file) return;
    const check = validateColourPickerImageFile(file);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    await loadFromObjectUrl(
      objectUrl,
      `${sourceLabelPrefix} (${file.name})`,
      true,
    );
  }

  function handleTakePhoto() {
    if (
      typeof window === "undefined" ||
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraSupported(false);
      setError(CAMERA_UNSUPPORTED);
      return;
    }

    // Open the webcam panel first — never open a file picker for Take photo.
    setError(null);
    setCameraOpen(true);
    setCameraStarting(true);
    const session = ++cameraSessionRef.current;

    void (async () => {
      try {
        // Prefer a plain camera request so desktop webcams work reliably.
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (firstError) {
          // On phones, try the rear camera if the first request failed.
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" } },
              audio: false,
            });
          } catch {
            throw firstError;
          }
        }

        if (session !== cameraSessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        setCameraSupported(true);
        setCameraStarting(false);
      } catch (err) {
        if (session !== cameraSessionRef.current) return;
        closeCamera();
        const name = err instanceof DOMException ? err.name : "";
        if (
          name === "NotFoundError" ||
          name === "DevicesNotFoundError" ||
          name === "OverconstrainedError"
        ) {
          setCameraSupported(false);
          setError(CAMERA_UNSUPPORTED);
          return;
        }
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError(CAMERA_PERMISSION_BLOCKED);
          return;
        }
        setError(
          "The camera could not be started. Check that it is connected and not used by another app, then try again.",
        );
      }
    })();
  }

  function handleCapturePhoto() {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("The camera is still starting. Wait a moment, then try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("This browser could not capture a photo from the camera.");
      return;
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("This browser could not capture a photo from the camera.");
        return;
      }
      const file = new File([blob], `camera-photo-${Date.now()}.png`, {
        type: "image/png",
      });
      closeCamera();
      void handleFiles([file], "Camera photo");
    }, "image/png");
  }

  async function handlePasteImage() {
    setError(null);
    // So Ctrl/Cmd+V can land on this section if the async clipboard read is blocked.
    rootRef.current?.focus({ preventScroll: true });

    if (typeof navigator !== "undefined" && navigator.clipboard?.read) {
      try {
        const items = await navigator.clipboard.read();
        const file = await clipboardItemsToImageFile(items);
        if (file) {
          await handleFiles([file], "Pasted image");
          return;
        }
      } catch (err) {
        if (isClipboardPermissionError(err)) {
          setError(CLIPBOARD_PERMISSION_BLOCKED);
          return;
        }
      }
    }

    setError(CLIPBOARD_NO_IMAGE);
  }

  async function handleLoadUrl() {
    const validated = validateImageUrl(urlDraft);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const img = await loadHtmlImage(validated.url, true);
      const { canvas, blocked } = await buildSampleCanvas(img);
      setImage((prev) => {
        if (prev?.revokeOnClear) URL.revokeObjectURL(prev.url);
        return {
          url: validated.url,
          revokeOnClear: false,
          sourceLabel: "Image URL",
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          sampleCanvas: canvas,
          sampleBlockedMessage: blocked,
        };
      });
      setTransform(DEFAULT_TRANSFORM);
      setSample(null);
    } catch {
      setError(
        "The image could not be loaded. Check the URL, or download the file and upload it here (CORS may block some sites).",
      );
    } finally {
      setLoading(false);
    }
  }

  function readPixel(x: number, y: number): SampledColour | null {
    if (!image?.sampleCanvas) return null;
    const ctx = image.sampleCanvas.getContext("2d");
    if (!ctx) return null;
    const data = ctx.getImageData(x, y, 1, 1).data;
    return {
      rgb: { r: data[0], g: data[1], b: data[2] },
      alpha: data[3] / 255,
      sourceLabel: image.sourceLabel,
      coordinates: { x, y },
    };
  }

  function updateLoupe(pixelX: number, pixelY: number) {
    const canvas = loupeRef.current;
    if (!canvas || !image?.sampleCanvas) return;
    const grid = IMAGE_PICKER.loupeGridSize;
    const cell = IMAGE_PICKER.loupeCellPx;
    canvas.width = grid * cell;
    canvas.height = grid * cell;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const { startX, startY } = loupeSampleOrigin(
      pixelX,
      pixelY,
      grid,
      image.naturalWidth,
      image.naturalHeight,
    );
    const src = image.sampleCanvas.getContext("2d");
    if (!src) return;
    for (let row = 0; row < grid; row += 1) {
      for (let col = 0; col < grid; col += 1) {
        const sx = startX + col;
        const sy = startY + row;
        if (
          sx < 0 ||
          sy < 0 ||
          sx >= image.naturalWidth ||
          sy >= image.naturalHeight
        ) {
          ctx.fillStyle = "#111827";
          ctx.fillRect(col * cell, row * cell, cell, cell);
          continue;
        }
        const pixel = src.getImageData(sx, sy, 1, 1).data;
        ctx.fillStyle = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3] / 255})`;
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
    const mid = Math.floor(grid / 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(mid * cell + 0.5, mid * cell + 0.5, cell - 1, cell - 1);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1;
    ctx.strokeRect(mid * cell + 1.5, mid * cell + 1.5, cell - 3, cell - 3);
  }

  function sampleAtClientPoint(clientX: number, clientY: number) {
    if (!image || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const layout = {
      width: rect.width,
      height: rect.height,
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
    };
    const mapped = mapPreviewPointToPixel(
      clientX,
      clientY,
      rect,
      layout,
      transform,
    );
    if (!mapped.inside) return;
    if (image.sampleBlockedMessage) {
      setError(image.sampleBlockedMessage);
      return;
    }
    const next = readPixel(mapped.x, mapped.y);
    if (!next) {
      setError(image.sampleBlockedMessage ?? "Could not sample that pixel.");
      return;
    }
    setSample(next);
    onSampled(next);
    schedulePageScrollRelease();
  }

  function handlePreviewPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!image || !previewRef.current) return;

    // Ignore loupe / hover sampling while over the preview action buttons.
    if (
      event.target instanceof Element &&
      event.target.closest("[data-preview-action]")
    ) {
      setHoverPixel(null);
      return;
    }

    const gesture = gestureRef.current;
    if (gesture && event.pointerId === gesture.pointerId) {
      event.preventDefault();
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;

      if (
        !gesture.didPan &&
        Math.hypot(dx, dy) >= PAN_DRAG_THRESHOLD_PX
      ) {
        gesture.didPan = true;
        setPanning(true);
      }

      if (gesture.didPan) {
        // Capture pan origin locally — the ref can be cleared before setState runs.
        const basePanX = gesture.panX;
        const basePanY = gesture.panY;
        setTransform((prev) => ({
          ...prev,
          panX: basePanX + dx,
          panY: basePanY + dy,
        }));
        return;
      }
    }

    const rect = previewRef.current.getBoundingClientRect();
    const layout = {
      width: rect.width,
      height: rect.height,
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
    };
    const mapped = mapPreviewPointToPixel(
      event.clientX,
      event.clientY,
      rect,
      layout,
      transform,
    );
    if (!mapped.inside) {
      setHoverPixel(null);
      return;
    }
    setHoverPixel({
      x: mapped.x,
      y: mapped.y,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    updateLoupe(mapped.x, mapped.y);
  }

  function handlePreviewPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!image || !previewRef.current) return;
    if (event.button !== 0 && event.button !== 1) return;
    // Don't start pan/sample gestures from the preview action buttons.
    if (
      event.target instanceof Element &&
      event.target.closest("[data-preview-action]")
    ) {
      return;
    }

    // Focus so later wheel zoom works; preventScroll keeps the page from jumping.
    previewRef.current.focus({ preventScroll: true });
    event.preventDefault();

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: transform.panX,
      panY: transform.panY,
      // Middle-click, Shift, or Alt start panning immediately.
      didPan: event.button === 1 || event.shiftKey || event.altKey,
    };
    if (gestureRef.current.didPan) setPanning(true);
    previewRef.current.setPointerCapture(event.pointerId);
  }

  function handlePreviewPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const didPan = gesture.didPan;
    const startX = gesture.startX;
    const startY = gesture.startY;
    gestureRef.current = null;
    setPanning(false);
    previewRef.current?.releasePointerCapture(event.pointerId);

    // Click without dragging samples the colour under the pointer.
    if (!didPan) {
      sampleAtClientPoint(startX, startY);
    }
  }

  function handlePreviewPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (!gestureRef.current || event.pointerId !== gestureRef.current.pointerId) {
      return;
    }
    gestureRef.current = null;
    setPanning(false);
    previewRef.current?.releasePointerCapture(event.pointerId);
  }

  async function handleEyeDropper() {
    setError(null);
    if (!window.EyeDropper) {
      setError(EYEDROPPER_UNSUPPORTED);
      return;
    }
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const rgb = hexToRgb(result.sRGBHex);
      if (!rgb) return;

      // Leave image mode so the preview shows the solid picked colour.
      clearScrollReleaseTimeout();
      stopCameraStream();
      setCameraOpen(false);
      setCameraStarting(false);
      setImage((prev) => {
        if (prev?.revokeOnClear) URL.revokeObjectURL(prev.url);
        return null;
      });
      setTransform(DEFAULT_TRANSFORM);
      setHoverPixel(null);

      const next: SampledColour = {
        rgb,
        alpha: 1,
        sourceLabel: "Screen eyedropper",
        coordinates: null,
      };
      setSample(next);
      onSampled(next);
    } catch {
      // User cancelled the eyedropper — no error.
    }
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={cn("space-y-4 outline-none", className)}
      onPaste={(event) => {
        const data = event.clipboardData;
        if (!data) return;

        // Windows screenshots often arrive as files on the paste event.
        if (data.files?.length) {
          for (const file of Array.from(data.files)) {
            if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name)) {
              event.preventDefault();
              setError(null);
              void handleFiles([file], "Pasted image");
              return;
            }
          }
        }

        const items = data.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              setError(null);
              void handleFiles([file], "Pasted image");
            }
            return;
          }
        }
      }}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-6">
          <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadImageIcon />
              Upload image
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              onClick={() => void handlePasteImage()}
            >
              <PasteImageIcon />
              Paste image
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              disabled={!cameraSupported || cameraOpen}
              title={
                cameraSupported
                  ? "Open your webcam to take a photo"
                  : CAMERA_UNSUPPORTED
              }
              aria-label={
                cameraSupported
                  ? "Take photo with webcam"
                  : "Take photo (not available on this device)"
              }
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleTakePhoto();
              }}
            >
              <TakePhotoIcon />
              Take photo
            </Button>
            <input
              ref={fileInputRef}
              id={`${baseId}-file`}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
            <Label
              htmlFor={`${baseId}-url`}
              className="mb-0 shrink-0 whitespace-nowrap"
            >
              Image URL
            </Label>
            <div className="flex min-w-0 items-center gap-2 lg:flex-1">
              <Input
                id={`${baseId}-url`}
                value={urlDraft}
                placeholder="https://example.com/image.png"
                className="min-w-0 flex-1"
                onChange={(event) => setUrlDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLoadUrl();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 px-3"
                onClick={() => void handleLoadUrl()}
                disabled={loading}
              >
                Load image
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!eyeDropperSupported}
            title={
              eyeDropperSupported
                ? "Sample a colour from anywhere on your display"
                : EYEDROPPER_UNSUPPORTED
            }
            aria-label={
              eyeDropperSupported
                ? "Pick a colour from your screen"
                : "Pick a colour from your screen (not supported in this browser)"
            }
            onClick={() => void handleEyeDropper()}
            className="inline-flex items-center gap-2"
          >
            <EyedropperIcon />
            Pick a colour from your screen
          </Button>

          {cameraOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`${baseId}-camera-title`}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) closeCamera();
                  }}
                >
                  <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-soft-md sm:p-5">
                    <div>
                      <h3
                        id={`${baseId}-camera-title`}
                        className="font-display text-lg font-semibold text-foreground sm:text-xl"
                      >
                        Take a photo
                      </h3>
                      <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                        {cameraStarting
                          ? "Starting your webcam… If your browser asks for permission, choose Allow."
                          : "Line up your shot, then click Capture photo. Click Cancel to close the camera."}
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-border bg-background">
                      <video
                        ref={cameraVideoRef}
                        className="aspect-video w-full bg-background object-cover"
                        autoPlay
                        playsInline
                        muted
                      />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={cameraStarting}
                        onClick={handleCapturePhoto}
                      >
                        Capture photo
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={closeCamera}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

          {error ? <FriendlyError message={error} /> : null}
          {loading ? (
            <p className="text-[0.9375rem] text-muted sm:text-base" role="status">
              Loading image…
            </p>
          ) : null}
          </div>

          <div className="min-w-0">
            {sample ? (
              <ColourInspector
                colour={sample.rgb}
                alpha={sample.alpha}
                sourceLabel={sample.sourceLabel}
                coordinates={sample.coordinates}
                onAddToCycle={() => onAddToCycle(sample.rgb)}
                onUseAsMarker={() => onUseAsMarker(sample.rgb)}
              />
            ) : (
              <div className="flex h-full min-h-[7.5rem] flex-col justify-center rounded-2xl border border-dashed border-border bg-background/60 p-4 sm:p-5">
                <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Selected colour
                </p>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                  Sample a pixel from the preview, or pick a colour from your
                  screen, to see it here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
            {!image && sample?.sourceLabel === "Screen eyedropper"
              ? "Colour preview"
              : "Image preview"}
          </p>
          {image ? (
            <>
              <div
                ref={previewRef}
                tabIndex={0}
                className={cn(
                  "relative h-[28rem] min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] sm:h-[36rem] sm:min-h-[36rem]",
                  "cursor-crosshair touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  panning && "cursor-grabbing",
                )}
                onPointerMove={handlePreviewPointerMove}
                onPointerDown={handlePreviewPointerDown}
                onPointerUp={handlePreviewPointerUp}
                onPointerCancel={handlePreviewPointerCancel}
                onPointerLeave={() => {
                  if (!gestureRef.current) setHoverPixel(null);
                }}
                role="img"
                aria-label="Image preview. Click to sample a pixel. Drag to pan. After clicking, scroll to zoom."
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={getImageStyle(image, transform, previewSize)}
                />
                {hoverPixel && image.sampleCanvas ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-lg border border-white shadow-soft-md"
                    style={getLoupePosition(
                      hoverPixel.clientX,
                      hoverPixel.clientY,
                      previewRef.current?.getBoundingClientRect() ?? null,
                      previewSize,
                    )}
                  >
                    <canvas
                      ref={loupeRef}
                      className="block rounded-lg"
                      width={
                        IMAGE_PICKER.loupeGridSize * IMAGE_PICKER.loupeCellPx
                      }
                      height={
                        IMAGE_PICKER.loupeGridSize * IMAGE_PICKER.loupeCellPx
                      }
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setTransform((prev) => ({
                      ...prev,
                      zoom: Math.min(
                        IMAGE_PICKER.zoomMax,
                        prev.zoom * IMAGE_PICKER.zoomStep,
                      ),
                    }))
                  }
                >
                  Zoom in
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setTransform((prev) => ({
                      ...prev,
                      zoom: Math.max(
                        minZoomForCurrentImage(),
                        prev.zoom / IMAGE_PICKER.zoomStep,
                      ),
                    }))
                  }
                >
                  Zoom out
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setTransform(DEFAULT_TRANSFORM)}
                >
                  Reset view
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={clearImage}
                >
                  Clear image
                </Button>
              </div>
              <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                {hoverPixel
                  ? `Cursor pixel: ${hoverPixel.x}, ${hoverPixel.y}`
                  : "Move over the image to inspect pixels. Click to sample a colour, drag to pan, and scroll to zoom."}
                {image.sampleBlockedMessage
                  ? ` ${image.sampleBlockedMessage}`
                  : ""}
              </p>
              <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                Local uploads and pasted images stay in your browser. Image URLs
                are loaded directly by your browser and may be blocked by CORS.
              </p>
            </>
          ) : sample?.sourceLabel === "Screen eyedropper" ? (
            <>
              <div
                className="h-[28rem] min-h-[28rem] overflow-hidden rounded-2xl border border-border sm:h-[36rem] sm:min-h-[36rem]"
                style={{ backgroundColor: rgbToCss(sample.rgb) }}
                role="img"
                aria-label={`Picked colour ${rgbToHex(sample.rgb)}`}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSample(null);
                    setError(null);
                  }}
                >
                  Clear colour
                </Button>
              </div>
              <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                Colour picked from your screen. Use the eyedropper button again
                to pick a different colour.
              </p>
            </>
          ) : (
            <div
              className="flex h-[28rem] min-h-[28rem] items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 sm:h-[36rem] sm:min-h-[36rem]"
              role="img"
              aria-label="Image preview placeholder"
            >
              <div className="relative h-44 w-44 text-muted/45 sm:h-56 sm:w-56">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-full w-full"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <div className="absolute left-1/2 top-[28%] w-[32%] -translate-x-[calc(50%+22px)] -translate-y-[calc(50%-12px)]">
                  <GoogieEmptyStateIcon className="!mx-0 !h-auto !w-full" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadImageIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.1rem"
      height="1.1rem"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function PasteImageIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.1rem"
      height="1.1rem"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <rect x="7" y="4" width="12" height="16" rx="2" />
      <path d="M9 4.5h6" />
      <path d="M10 2h4a1 1 0 0 1 1 1v1.5H9V3a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function TakePhotoIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.1rem"
      height="1.1rem"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <path d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="14" r="3.25" />
    </svg>
  );
}

function isClipboardPermissionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  const message = "message" in err ? String(err.message).toLowerCase() : "";
  return (
    name === "NotAllowedError" ||
    name === "SecurityError" ||
    message.includes("denied") ||
    message.includes("permission") ||
    message.includes("not allowed")
  );
}

async function clipboardItemsToImageFile(
  items: ClipboardItems,
): Promise<File | null> {
  const preferred = ["image/png", "image/jpeg", "image/webp", "image/bmp"];

  for (const item of items) {
    const types = Array.from(item.types);

    for (const mime of preferred) {
      if (!types.includes(mime)) continue;
      try {
        const blob = await item.getType(mime);
        const file = await blobToSupportedImageFile(blob, mime);
        if (file) return file;
      } catch {
        // Try the next type.
      }
    }

    for (const type of types) {
      if (!type.startsWith("image/") || type === "image/svg+xml") continue;
      if (preferred.includes(type)) continue;
      try {
        const blob = await item.getType(type);
        const file = await blobToSupportedImageFile(blob, type);
        if (file) return file;
      } catch {
        // Try the next type.
      }
    }

    // Some browsers list delayed types; try PNG even if it was not advertised.
    try {
      const blob = await item.getType("image/png");
      const file = await blobToSupportedImageFile(blob, "image/png");
      if (file) return file;
    } catch {
      // No PNG on this item.
    }
  }

  return null;
}

/** Turn a clipboard blob into a JPG/PNG/WebP File (converts BMP etc. to PNG). */
async function blobToSupportedImageFile(
  blob: Blob,
  mimeHint: string,
): Promise<File | null> {
  if (!blob || blob.size <= 0) return null;

  const mime = (blob.type || mimeHint || "").toLowerCase();
  if (
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/webp"
  ) {
    const ext = mime === "image/jpeg" ? "jpg" : mime.slice("image/".length);
    return new File([blob], `clipboard-image.${ext}`, { type: mime });
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!pngBlob || pngBlob.size <= 0) return null;
    return new File([pngBlob], "clipboard-image.png", { type: "image/png" });
  } catch {
    return null;
  }
}

function loadHtmlImage(url: string, useCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load failed"));
    img.src = url;
  });
}

function getLoupePosition(
  clientX: number,
  clientY: number,
  previewRect: DOMRect | null,
  previewSize: { width: number; height: number },
): React.CSSProperties {
  const loupeSize =
    IMAGE_PICKER.loupeGridSize * IMAGE_PICKER.loupeCellPx;
  const gap = 16;
  const margin = 8;
  const cursorX = clientX - (previewRect?.left ?? 0);
  const cursorY = clientY - (previewRect?.top ?? 0);

  // Prefer below-right of the cursor; flip left/above near edges so the loupe
  // does not cover the pixel under the pointer.
  let left = cursorX + gap;
  if (left + loupeSize > previewSize.width - margin) {
    left = cursorX - gap - loupeSize;
  }
  left = Math.max(
    margin,
    Math.min(left, previewSize.width - loupeSize - margin),
  );

  let top = cursorY + gap;
  if (top + loupeSize > previewSize.height - margin) {
    top = cursorY - gap - loupeSize;
  }
  top = Math.max(
    margin,
    Math.min(top, previewSize.height - loupeSize - margin),
  );

  return { left, top };
}

function getImageStyle(
  image: LoadedImage,
  transform: ImageViewTransform,
  previewSize: { width: number; height: number },
): React.CSSProperties {
  const layout = {
    width: previewSize.width,
    height: previewSize.height,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
  };
  const size = displayedImageSize(layout, transform);
  const origin = imageOriginInPreview(layout, transform);
  return {
    width: size.width,
    height: size.height,
    left: origin.x,
    top: origin.y,
    imageRendering: transform.zoom > 2 ? "pixelated" : "auto",
  };
}
