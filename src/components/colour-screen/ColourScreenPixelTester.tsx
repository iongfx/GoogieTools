"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ColourFormatControls,
  ColourPickerAndHex,
  MarkerColourPicker,
} from "@/components/colour-screen/ColourFormatControls";
import { EyedropperIcon } from "@/components/colour-screen/EyedropperIcon";
import { CursorMarkerOverlay, CursorMarkerPreview } from "@/components/colour-screen/CursorMarkerOverlay";
import { FullscreenTestMode } from "@/components/colour-screen/FullscreenTestMode";
import {
  ImageColourPicker,
  type SampledColour,
} from "@/components/colour-screen/ImageColourPicker";
import {
  PREVIEW_OVERLAY_BUTTON_CLASS,
  PREVIEW_OVERLAY_LABEL_CLASS,
} from "@/components/colour-screen/previewOverlayChrome";
import { ToolWorkspaceShell } from "@/components/tools/ToolWorkspaceShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { COLOUR_TOOL } from "@/config/tools";
import { nextCycleIndex, previousCycleIndex } from "@/lib/colour-cycle";
import { downloadColourCyclePdf } from "@/lib/colour-cycle-pdf";
import { hexToRgb, coloursNearlyEqual, rgbToCss, rgbToHex } from "@/lib/colour-conversions";
import { formatHex, type ColourExportChoice } from "@/lib/colour-formatting";
import { getPresetById } from "@/lib/colour-presets";
import {
  CHROMA_KEY_NOTE,
  CYCLE_LIMITS,
  DEFAULT_BACKGROUND_COLOUR,
  DEFAULT_CYCLE_SETTINGS,
  DEFAULT_MARKER_SETTINGS,
  EYEDROPPER_UNSUPPORTED,
  MARKER_LIMITS,
  PHOTOSENSITIVITY_WARNING,
  PIXEL_WORKFLOWS,
  clampMarkerDiameter,
  clampMarkerOpacity,
  resolveCycleDelayMs,
  type CycleColourItem,
  type CycleDelayPreset,
  type CycleSettings,
  type MarkerSettings,
  type MarkerStyle,
} from "@/lib/colour-screen-config";
import {
  SHORTCUT_GUIDE,
  applyMarkerSize,
  resolveShortcutAction,
  toggleOutlineOrFilled,
} from "@/lib/colour-screen-shortcuts";
import type { RgbColour } from "@/lib/colour-types";
import { cn } from "@/lib/utils";

type InspectorState = SampledColour | null;

const COLOUR_EXPORT_OPTIONS: {
  id: ColourExportChoice;
  label: string;
}[] = [
  { id: "rgb", label: "RGB" },
  { id: "cmyk", label: "CMYK" },
  { id: "hex", label: "HEX" },
  { id: "hsl", label: "HSL" },
  { id: "hsv", label: "HSV/HSB" },
  { id: "all", label: "All" },
];

declare global {
  interface Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }
}

function createCycleId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function findCycleIndexForColour(
  items: CycleColourItem[],
  colour: RgbColour,
): number {
  return items.findIndex((item) => coloursNearlyEqual(item.rgb, colour));
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="1rem"
      height="1rem"
      className={className}
      fill="currentColor"
    >
      <rect x="2" y="3.25" width="12" height="1.75" rx="0.5" />
      <rect x="2" y="7.125" width="12" height="1.75" rx="0.5" />
      <rect x="2" y="11" width="12" height="1.75" rx="0.5" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="1rem"
      height="1rem"
      className={className}
      fill="currentColor"
    >
      <path d="M6.25 2.5h3.5l.4 1H13.5a.75.75 0 0 1 0 1.5h-.55l-.7 8.05A1.75 1.75 0 0 1 10.51 14.5H5.49a1.75 1.75 0 0 1-1.74-1.45L3.05 5H2.5a.75.75 0 0 1 0-1.5h3.35l.4-1Zm1.1 1.5-.25.5h1.8l-.25-.5h-1.3ZM4.56 5l.68 7.85a.25.25 0 0 0 .25.2h5.02a.25.25 0 0 0 .25-.2L11.44 5H4.56Zm2.19 1.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/**
 * Free Colour Screen & Pixel Tester — setup controls + fullscreen test mode.
 */
export function ColourScreenPixelTester() {
  const headingNoteId = useId();
  const [background, setBackground] = useState<RgbColour>(
    DEFAULT_BACKGROUND_COLOUR,
  );
  const [marker, setMarker] = useState<MarkerSettings>(DEFAULT_MARKER_SETTINGS);
  const [cycle, setCycle] = useState<CycleSettings>(() => ({
    ...DEFAULT_CYCLE_SETTINGS,
    items: DEFAULT_CYCLE_SETTINGS.items.map((item) => ({ ...item })),
  }));
  const [cycleIndex, setCycleIndex] = useState(() => {
    const match = findCycleIndexForColour(
      DEFAULT_CYCLE_SETTINGS.items,
      DEFAULT_BACKGROUND_COLOUR,
    );
    return match >= 0 ? match : 0;
  });
  const dragFromIndexRef = useRef<number | null>(null);
  const [testActive, setTestActive] = useState(false);
  const [previewCycleActive, setPreviewCycleActive] = useState(false);
  const [colourValuesOpen, setColourValuesOpen] = useState(false);
  const [cursorMarkerOpen, setCursorMarkerOpen] = useState(false);
  const [colourCycleOpen, setColourCycleOpen] = useState(false);
  const [pixelWorkflowsOpen, setPixelWorkflowsOpen] = useState(false);
  const [saveColourMenuOpen, setSaveColourMenuOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<
    (typeof PIXEL_WORKFLOWS)[number]["id"] | null
  >("rgb-pixel");
  const [usingBrowserFullscreen, setUsingBrowserFullscreen] = useState(false);
  const [inspector, setInspector] = useState<InspectorState>(null);
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [setupPointer, setSetupPointer] = useState({
    x: 0,
    y: 0,
    visible: false,
  });
  const cycleTimerRef = useRef<number | null>(null);
  const previewCycleTimerRef = useRef<number | null>(null);
  const cycleIndexRef = useRef(cycleIndex);
  /** True when fullscreen started on the screen preview colour (not yet in the cycle). */
  const pendingCycleEntryRef = useRef(false);

  useEffect(() => {
    cycleIndexRef.current = cycleIndex;
  }, [cycleIndex]);

  useEffect(() => {
    setEyeDropperSupported(typeof window !== "undefined" && "EyeDropper" in window);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!saveColourMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-save-colour-menu]")) return;
      setSaveColourMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSaveColourMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [saveColourMenuOpen]);

  const enabledCount = useMemo(
    () => cycle.items.filter((item) => item.enabled).length,
    [cycle.items],
  );

  const delayMs = useMemo(() => resolveCycleDelayMs(cycle), [cycle]);

  const cycleDelayLabel = useMemo(() => {
    if (cycle.delayPreset === "manual") return "Manual";
    if (cycle.delayPreset === "custom") {
      const seconds = Number(cycle.customSeconds);
      const rounded =
        Number.isFinite(seconds) && seconds % 1 !== 0
          ? seconds.toFixed(1)
          : String(Number.isFinite(seconds) ? seconds : cycle.customSeconds);
      return `${rounded} sec.`;
    }
    return `${cycle.delayPreset} sec.`;
  }, [cycle.customSeconds, cycle.delayPreset]);

  const photosensitivityWarn =
    cycle.delayPreset === "custom" &&
    cycle.customSeconds < CYCLE_LIMITS.photosensitivityWarnBelowSeconds;

  // Keep focus on the current list item when possible; only jump when the
  // preview colour no longer matches the focused row (e.g. HEX changed).
  useEffect(() => {
    const focused = cycle.items[cycleIndex];
    if (focused && coloursNearlyEqual(focused.rgb, background)) {
      return;
    }
    const match = findCycleIndexForColour(cycle.items, background);
    if (match < 0) return;
    setCycleIndex(match);
  }, [background, cycle.items, cycleIndex]);

  const applyCycleIndex = useCallback(
    (index: number) => {
      const item = cycle.items[index];
      if (!item?.enabled) return;
      // Copy RGB so React always sees a new state value (presets share objects).
      setBackground({ r: item.rgb.r, g: item.rgb.g, b: item.rgb.b });
      setCycleIndex(index);
      cycleIndexRef.current = index;
    },
    [cycle.items],
  );

  const advanceColour = useCallback(
    (options?: { ignoreLoop?: boolean }) => {
      // First step after fullscreen: leave the preview colour and enter the cycle.
      if (pendingCycleEntryRef.current) {
        pendingCycleEntryRef.current = false;
        let index = cycleIndexRef.current;
        if (!cycle.items[index]?.enabled) {
          const firstEnabled = cycle.items.findIndex((item) => item.enabled);
          if (firstEnabled >= 0) index = firstEnabled;
        }
        applyCycleIndex(index);
        return;
      }

      const loop = options?.ignoreLoop ? true : cycle.loop;
      const next = nextCycleIndex(
        cycle.items,
        cycleIndexRef.current,
        cycle.order,
        loop,
      );
      applyCycleIndex(next);
    },
    [applyCycleIndex, cycle.items, cycle.loop, cycle.order],
  );

  const previousColour = useCallback(
    (options?: { ignoreLoop?: boolean }) => {
      // From the intro preview colour, step back into the end of the cycle.
      if (pendingCycleEntryRef.current) {
        pendingCycleEntryRef.current = false;
        const enabledIndexes = cycle.items
          .map((item, index) => (item.enabled ? index : -1))
          .filter((index) => index >= 0);
        if (enabledIndexes.length === 0) return;
        applyCycleIndex(enabledIndexes[enabledIndexes.length - 1]);
        return;
      }

      const loop = options?.ignoreLoop ? true : cycle.loop;
      const next = previousCycleIndex(
        cycle.items,
        cycleIndexRef.current,
        loop,
      );
      applyCycleIndex(next);
    },
    [applyCycleIndex, cycle.items, cycle.loop],
  );

  /** Setup arrows: walk enabled cycle colours; preview colour follows. */
  const stepColourCycle = useCallback(
    (direction: "next" | "previous") => {
      const enabledIndexes = cycle.items
        .map((item, index) => (item.enabled ? index : -1))
        .filter((index) => index >= 0);
      if (enabledIndexes.length === 0) return;

      if (previewCycleActive) {
        setPreviewCycleActive(false);
        setStatusMessage(null);
      }

      let position = enabledIndexes.indexOf(cycleIndexRef.current);
      if (position < 0) {
        const match = findCycleIndexForColour(cycle.items, background);
        position = match >= 0 ? enabledIndexes.indexOf(match) : 0;
        if (position < 0) position = 0;
      }

      const nextPosition =
        direction === "next"
          ? (position + 1) % enabledIndexes.length
          : (position - 1 + enabledIndexes.length) % enabledIndexes.length;

      applyCycleIndex(enabledIndexes[nextPosition]);
    },
    [applyCycleIndex, background, cycle.items, previewCycleActive],
  );

  const exitTestMode = useCallback(async () => {
    pendingCycleEntryRef.current = false;
    setTestActive(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore — fallback overlay still closes.
      }
    }
    setUsingBrowserFullscreen(false);
  }, []);

  const enterTestMode = useCallback(async () => {
    setErrorMessage(null);
    setTestActive(true);

    // Keep the current screen colour preview as the first fullscreen colour.
    // If it is not already the focused cycle colour, the next advance enters
    // the colour cycle. Looping then stays within cycle colours only.
    let focusIndex = cycleIndex;
    if (!cycle.items[focusIndex]?.enabled) {
      const firstEnabled = cycle.items.findIndex((item) => item.enabled);
      if (firstEnabled >= 0) {
        focusIndex = firstEnabled;
        setCycleIndex(firstEnabled);
      }
    }
    const focused = cycle.items[focusIndex];
    pendingCycleEntryRef.current = !(
      focused?.enabled && coloursNearlyEqual(focused.rgb, background)
    );

    const root = document.documentElement;
    if (root.requestFullscreen) {
      try {
        await root.requestFullscreen();
        setUsingBrowserFullscreen(true);
        return;
      } catch {
        // Fall through to full-browser overlay.
      }
    }
    setUsingBrowserFullscreen(false);
  }, [background, cycle.items, cycleIndex]);

  // Auto-cycle timer (never starts on page load — only while test is active).
  useEffect(() => {
    if (cycleTimerRef.current) {
      window.clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (!testActive || cycle.paused || delayMs === null) return;
    if (reducedMotion && delayMs < 2000) {
      // Prefer slower cycling when reduced motion is requested.
      return;
    }
    cycleTimerRef.current = window.setInterval(() => {
      advanceColour();
    }, Math.max(delayMs, CYCLE_LIMITS.minDelaySeconds * 1000));

    return () => {
      if (cycleTimerRef.current) {
        window.clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };
  }, [advanceColour, cycle.paused, delayMs, reducedMotion, testActive]);

  // Preview-window colour cycle (Test button) — not fullscreen.
  // Manual only (delayMs === null) never auto-advances; use the arrows instead.
  useEffect(() => {
    if (previewCycleTimerRef.current) {
      window.clearInterval(previewCycleTimerRef.current);
      previewCycleTimerRef.current = null;
    }
    if (!previewCycleActive || testActive) {
      if (testActive && previewCycleActive) {
        setPreviewCycleActive(false);
      }
      return;
    }
    if (delayMs === null) {
      setPreviewCycleActive(false);
      setStatusMessage(null);
      return;
    }

    let intervalMs = delayMs;
    if (reducedMotion) {
      intervalMs = Math.max(intervalMs, 2000);
    }
    intervalMs = Math.max(intervalMs, CYCLE_LIMITS.minDelaySeconds * 1000);

    previewCycleTimerRef.current = window.setInterval(() => {
      const current = cycleIndexRef.current;
      const next = nextCycleIndex(
        cycle.items,
        current,
        cycle.order,
        cycle.loop,
      );
      const item = cycle.items[next];
      if (item?.enabled) {
        setBackground(item.rgb);
        setCycleIndex(next);
        cycleIndexRef.current = next;
      }
      if (!cycle.loop && next === current) {
        setPreviewCycleActive(false);
      }
    }, intervalMs);

    return () => {
      if (previewCycleTimerRef.current) {
        window.clearInterval(previewCycleTimerRef.current);
        previewCycleTimerRef.current = null;
      }
    };
  }, [
    cycle.items,
    cycle.loop,
    cycle.order,
    delayMs,
    previewCycleActive,
    reducedMotion,
    testActive,
  ]);

  function scrollPreviewIntoView() {
    window.requestAnimationFrame(() => {
      const preview = document.getElementById("screen-colour-preview");
      if (!preview) return;

      const rect = preview.getBoundingClientRect();
      const marginTop =
        Number.parseFloat(getComputedStyle(preview).scrollMarginTop) || 0;
      const bottomGap = 16;
      const visibleTop = marginTop;
      const visibleBottom = window.innerHeight - bottomGap;
      const availableHeight = visibleBottom - visibleTop;

      // Scroll far enough that the whole preview fits when it can; otherwise
      // pin its top under the header so the colour window is on screen.
      let delta = 0;
      if (rect.height <= availableHeight) {
        if (rect.top < visibleTop) {
          delta = rect.top - visibleTop;
        } else if (rect.bottom > visibleBottom) {
          delta = rect.bottom - visibleBottom;
        }
      } else if (rect.top !== visibleTop) {
        delta = rect.top - visibleTop;
      }

      if (Math.abs(delta) < 1) return;
      window.scrollBy({ top: delta, behavior: "smooth" });
    });
  }

  function togglePreviewCycle() {
    if (previewCycleActive) {
      setPreviewCycleActive(false);
      setStatusMessage(null);
      return;
    }
    if (enabledCount === 0) {
      setErrorMessage("Enable at least one colour in the cycle to run a test.");
      return;
    }
    setErrorMessage(null);
    // Start the sequence from the focused list row.
    const focused = cycle.items[cycleIndex];
    if (focused) {
      setBackground(focused.rgb);
    } else {
      const firstEnabled = cycle.items.findIndex((item) => item.enabled);
      if (firstEnabled >= 0) {
        setCycleIndex(firstEnabled);
        setBackground(cycle.items[firstEnabled].rgb);
      }
    }

    scrollPreviewIntoView();

    // Manual only: show the current colour; arrows step the colour cycle list.
    if (delayMs === null) {
      setStatusMessage(
        "Manual mode — use the arrows to step through the colour cycle.",
      );
      return;
    }

    setPreviewCycleActive(true);
    setStatusMessage("Preview cycle running in the screen colour preview.");
  }

  // Exit when leaving browser fullscreen via Esc / browser UI.
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement && usingBrowserFullscreen) {
        pendingCycleEntryRef.current = false;
        setTestActive(false);
        setUsingBrowserFullscreen(false);
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [usingBrowserFullscreen]);

  // Centralised keyboard shortcuts.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = resolveShortcutAction(event, {
        allowEnterFullscreen: true,
        inTestMode: testActive,
      });
      if (!action) return;

      if (action.type === "enter-fullscreen") {
        event.preventDefault();
        void enterTestMode();
        return;
      }
      if (action.type === "exit-fullscreen") {
        event.preventDefault();
        void exitTestMode();
        return;
      }
      if (!testActive) return;

      event.preventDefault();
      switch (action.type) {
        case "set-marker-colour":
          setMarker((prev) => ({
            ...prev,
            enabled: true,
            colour: action.colour,
          }));
          break;
        case "marker-size":
          setMarker((prev) => applyMarkerSize(prev, action.delta));
          break;
        case "toggle-marker-style":
          setMarker((prev) => ({
            ...prev,
            style: toggleOutlineOrFilled(prev.style),
          }));
          break;
        case "toggle-system-cursor":
          setMarker((prev) => ({
            ...prev,
            hideSystemCursor: !prev.hideSystemCursor,
          }));
          break;
        case "advance-colour":
          advanceColour({ ignoreLoop: true });
          break;
        case "previous-colour":
          previousColour({ ignoreLoop: true });
          break;
        case "toggle-pause":
          setCycle((prev) => ({ ...prev, paused: !prev.paused }));
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    advanceColour,
    enterTestMode,
    exitTestMode,
    previousColour,
    testActive,
  ]);

  // Lock page scroll and hide scrollbars while in fullscreen colour test.
  useEffect(() => {
    if (!testActive) return;

    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    html.style.height = "100%";
    body.style.height = "100%";
    html.classList.add("colour-test-scroll-lock");
    body.classList.add("colour-test-scroll-lock");

    function preventScroll(event: Event) {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[role="document"]')
      ) {
        // Allow scrolling inside the shortcut help panel only.
        return;
      }
      event.preventDefault();
    }

    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.height = previous.htmlHeight;
      body.style.height = previous.bodyHeight;
      html.classList.remove("colour-test-scroll-lock");
      body.classList.remove("colour-test-scroll-lock");
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
    };
  }, [testActive]);

  function saveColourValues(choice: ColourExportChoice) {
    if (cycle.items.length === 0) {
      setErrorMessage("Add at least one colour to the cycle before saving.");
      setSaveColourMenuOpen(false);
      return;
    }
    setSaveColourMenuOpen(false);
    void downloadColourCyclePdf(
      cycle.items.map((item) => ({
        label: item.label,
        rgb: item.rgb,
      })),
      choice,
    )
      .then(() => {
        setStatusMessage(
          `Saved a PDF with ${choice === "all" ? "all colour values" : choice.toUpperCase()} and swatches for ${cycle.items.length} cycle colour${cycle.items.length === 1 ? "" : "s"}.`,
        );
      })
      .catch(() => {
        setErrorMessage(
          "The colour cycle PDF could not be created. Please try again.",
        );
      });
  }

  function addColourToCycle(rgb: RgbColour, label?: string) {
    const item: CycleColourItem = {
      id: createCycleId(),
      label: label ?? formatHex(rgb),
      rgb,
      enabled: true,
    };
    setCycle((prev) => {
      const items = [...prev.items, item];
      setCycleIndex(items.length - 1);
      return { ...prev, items };
    });
    setBackground(rgb);
    setStatusMessage(`Added ${item.label} to the colour cycle.`);
  }

  function reorderCycleItem(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= cycle.items.length ||
      toIndex >= cycle.items.length
    ) {
      return;
    }
    setCycle((prev) => {
      const items = [...prev.items];
      const [removed] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, removed);
      return { ...prev, items };
    });
    setCycleIndex((current) => {
      if (current === fromIndex) return toIndex;
      if (fromIndex < current && toIndex >= current) return current - 1;
      if (fromIndex > current && toIndex <= current) return current + 1;
      return current;
    });
  }

  function applyWorkflow(workflowId: (typeof PIXEL_WORKFLOWS)[number]["id"]) {
    const workflow = PIXEL_WORKFLOWS.find((item) => item.id === workflowId);
    if (!workflow) return;

    const items: CycleColourItem[] = workflow.backgroundSequence.map((id) => {
      const preset = getPresetById(id);
      return {
        id: preset.id,
        label: preset.label,
        rgb: preset.rgb,
        enabled: true,
      };
    });

    setCycle((prev) => ({
      ...prev,
      items,
      delayPreset: workflow.id === "chroma-key" ? "manual" : prev.delayPreset,
      paused: false,
    }));
    setCycleIndex(0);
    setBackground(items[0].rgb);

    setMarker((prev) => ({
      ...prev,
      enabled: workflow.markerEnabled ?? false,
      hideSystemCursor: workflow.hideSystemCursor ?? prev.hideSystemCursor,
      colour:
        workflow.markerQuickColours && workflow.markerQuickColours.length > 0
          ? getPresetById(workflow.markerQuickColours[0]).rgb
          : prev.colour,
    }));

    setSelectedWorkflowId(workflow.id);
    setStatusMessage(`Applied “${workflow.label}” workflow.`);
  }

  async function handleEyeDropper() {
    setErrorMessage(null);
    if (!window.EyeDropper) {
      setErrorMessage(EYEDROPPER_UNSUPPORTED);
      return;
    }
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const rgb = hexToRgb(result.sRGBHex);
      if (!rgb) return;
      const sample: SampledColour = {
        rgb,
        alpha: 1,
        sourceLabel: "Screen eyedropper",
        coordinates: null,
      };
      setInspector(sample);
      setBackground(rgb);
      setStatusMessage(`Picked ${rgbToHex(rgb)} from the screen.`);
    } catch {
      // User cancelled — no error.
    }
  }

  const cycleLabel =
    cycle.items[cycleIndex]?.enabled
      ? cycle.items[cycleIndex].label
      : null;

  return (
    <ToolWorkspaceShell>
      <FullscreenTestMode
        active={testActive}
        background={background}
        marker={marker}
        cycleLabel={cycleLabel}
        paused={cycle.paused}
        autoCycleEnabled={delayMs !== null}
        onExit={() => void exitTestMode()}
        onAdvance={() => advanceColour({ ignoreLoop: true })}
        onPrevious={() => previousColour({ ignoreLoop: true })}
        onTogglePause={() =>
          setCycle((prev) => ({ ...prev, paused: !prev.paused }))
        }
        reducedMotion={reducedMotion}
      />

      {marker.enabled && marker.previewInSetup && !testActive ? (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          onPointerMoveCapture={undefined}
        >
          <CursorMarkerOverlay
            settings={marker}
            x={setupPointer.x}
            y={setupPointer.y}
            visible={setupPointer.visible}
          />
        </div>
      ) : null}

      <div
        className="space-y-6"
        onPointerMove={
          marker.previewInSetup
            ? (event) =>
                setSetupPointer({
                  x: event.clientX,
                  y: event.clientY,
                  visible: true,
                })
            : undefined
        }
      >
        <Card padding="lg" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Background colour
              </h2>
              <p className="mt-2 text-base text-muted" id={headingNoteId}>
                Choose a solid colour for your display test. All formats stay in
                sync.
                <br />
                Optionally add a cursor marker that follows your pointer.
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0 self-start sm:self-center"
              onClick={() => void enterTestMode()}
            >
              Start fullscreen colour test
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
            <div
              id="colour-cycle-panel"
              className="order-2 min-w-0 space-y-4 rounded-2xl border border-border bg-background/60 p-4 lg:order-1"
            >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                    Colour cycle
                  </p>
                  <button
                    type="button"
                    aria-expanded={colourCycleOpen}
                    aria-controls="colour-cycle-panel"
                    onClick={() => setColourCycleOpen((open) => !open)}
                    className={cn(
                      "inline-flex min-h-8 shrink-0 items-center rounded-md border border-border bg-surface px-2.5 text-sm font-medium text-muted shadow-soft-sm",
                      "transition-[transform,border-color,color,background-color] duration-200",
                      "hover:-translate-y-px hover:border-accent/40 hover:text-accent",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {colourCycleOpen ? "Hide" : "Show"}
                  </button>
                </div>

                {colourCycleOpen ? (
                  <>
                <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                  Build a sequence, advance manually, or auto-cycle during the
                  fullscreen test. Auto-cycle does not start when the page
                  loads.
                </p>

                <p className="text-[0.9375rem] font-medium leading-relaxed text-accent sm:text-base">
                  {PHOTOSENSITIVITY_WARNING}
                </p>
                {reducedMotion ? (
                  <p className="text-[0.9375rem] font-medium leading-relaxed text-accent sm:text-base">
                    Reduced motion is preferred on this device — auto-cycle stays
                    conservative.
                  </p>
                ) : null}
                {photosensitivityWarn ? (
                  <FriendlyError message="Custom delays under 1 second can feel harsh. Consider a slower interval." />
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-x-6">
                  <div className="mx-auto flex w-[13.25rem] max-w-full flex-col items-center gap-3 lg:mx-0 lg:items-stretch">
                  <ul className="w-full list-none space-y-1.5 p-0">
                    {cycle.items.map((item, index) => {
                      const isCurrent = index === cycleIndex;
                      return (
                        <li
                          key={item.id}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const from = dragFromIndexRef.current;
                            dragFromIndexRef.current = null;
                            if (from === null) return;
                            reorderCycleItem(from, index);
                          }}
                          className={cn(
                            "flex h-11 items-center gap-1.5 rounded-md border px-2",
                            isCurrent
                              ? "border-accent bg-accent-soft/50 ring-2 ring-accent/30"
                              : "border-border/80 bg-surface",
                          )}
                        >
                          <button
                            type="button"
                            draggable
                            aria-label={`Drag to reorder ${item.label}`}
                            title="Drag to reorder"
                            className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted hover:bg-accent-soft/70 hover:text-accent active:cursor-grabbing"
                            onDragStart={(event) => {
                              dragFromIndexRef.current = index;
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", item.id);
                            }}
                            onDragEnd={() => {
                              dragFromIndexRef.current = null;
                            }}
                          >
                            <DragHandleIcon />
                          </button>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(event) =>
                                setCycle((prev) => ({
                                  ...prev,
                                  items: prev.items.map((entry) =>
                                    entry.id === item.id
                                      ? {
                                          ...entry,
                                          enabled: event.target.checked,
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                              className="h-4 w-4 shrink-0 rounded border-border"
                              aria-label={`Include ${item.label} in cycle`}
                            />
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              aria-label={`Show ${item.label} in preview`}
                              aria-pressed={isCurrent}
                              onClick={() => {
                                setCycleIndex(index);
                                setBackground(item.rgb);
                              }}
                            >
                              <span
                                className="h-4 w-4 shrink-0 rounded-full border border-border"
                                style={{ backgroundColor: rgbToCss(item.rgb) }}
                                aria-hidden="true"
                              />
                              <span
                                className={cn(
                                  "min-w-[7.5ch] truncate font-mono text-[0.9375rem] font-medium sm:text-base",
                                  isCurrent ? "text-accent" : "text-foreground",
                                )}
                              >
                                {item.label}
                              </span>
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${item.label}`}
                            title={`Remove ${item.label}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-accent-soft/70 hover:text-error"
                            onClick={() => {
                              setCycle((prev) => ({
                                ...prev,
                                items: prev.items.filter(
                                  (entry) => entry.id !== item.id,
                                ),
                              }));
                              setCycleIndex((current) => {
                                if (index < current) return current - 1;
                                if (index === current) {
                                  return Math.max(0, current - 1);
                                }
                                return current;
                              });
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                        <div
                          className="relative flex w-full flex-col items-center"
                          data-save-colour-menu
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-expanded={saveColourMenuOpen}
                            aria-haspopup="menu"
                            onClick={() =>
                              setSaveColourMenuOpen((open) => !open)
                            }
                          >
                            Save list to PDF
                          </Button>
                          {saveColourMenuOpen ? (
                            <div
                              role="menu"
                              aria-label="Choose colour values to save"
                              className="absolute top-full z-20 mt-2 w-full max-w-[14rem] rounded-xl border border-border bg-surface p-2 shadow-soft-md"
                            >
                              <p className="px-2 pb-2 text-center text-sm text-muted">
                                Which values do you want to save?
                              </p>
                              <div className="flex flex-col gap-1">
                                {COLOUR_EXPORT_OPTIONS.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    role="menuitem"
                                    className="rounded-md px-3 py-2 text-left text-[0.9375rem] font-medium text-foreground hover:bg-accent-soft/70 hover:text-accent sm:text-base"
                                    onClick={() => saveColourValues(option.id)}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                  </div>

                  <div className="flex min-w-0 w-full flex-col items-center gap-6">
                    <div className="flex w-auto max-w-full items-center justify-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Previous colour in cycle"
                        title="Previous colour in cycle"
                        disabled={enabledCount === 0}
                        onClick={() => stepColourCycle("previous")}
                        className={cn(
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground shadow-soft-sm",
                          "transition-[transform,border-color,color,opacity] duration-200",
                          "hover:-translate-y-px hover:border-accent/40 hover:text-accent",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "disabled:pointer-events-none disabled:opacity-55",
                        )}
                      >
                        <ChevronLeftIcon />
                      </button>
                      <Button
                        type="button"
                        variant={previewCycleActive ? "secondary" : "primary"}
                        size="sm"
                        disabled={enabledCount === 0 && !previewCycleActive}
                        onClick={togglePreviewCycle}
                        className="!h-9 !w-auto !min-w-[3.75rem] shrink-0 !px-3 text-sm"
                      >
                        {previewCycleActive ? "Stop" : "Test"}
                      </Button>
                      <button
                        type="button"
                        aria-label="Next colour in cycle"
                        title="Next colour in cycle"
                        disabled={enabledCount === 0}
                        onClick={() => stepColourCycle("next")}
                        className={cn(
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground shadow-soft-sm",
                          "transition-[transform,border-color,color,opacity] duration-200",
                          "hover:-translate-y-px hover:border-accent/40 hover:text-accent",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "disabled:pointer-events-none disabled:opacity-55",
                        )}
                      >
                        <ChevronRightIcon />
                      </button>
                    </div>

                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-3">
                        <Label
                          htmlFor="cycle-delay"
                          className="mb-0 shrink-0 whitespace-nowrap"
                        >
                          Delay
                        </Label>
                        <Select
                          id="cycle-delay"
                          value={cycle.delayPreset}
                          onChange={(event) =>
                            setCycle((prev) => ({
                              ...prev,
                              delayPreset: event.target
                                .value as CycleDelayPreset,
                            }))
                          }
                          className="!w-auto min-w-0 flex-1"
                        >
                          <option value="manual">Manual</option>
                          <option value="1">1 sec.</option>
                          <option value="2">2 sec.</option>
                          <option value="3">3 sec.</option>
                          <option value="5">5 sec.</option>
                          <option value="10">10 sec.</option>
                          <option value="custom">Custom</option>
                        </Select>
                      </div>
                      {cycle.delayPreset === "custom" ? (
                        <div className="flex items-center gap-3">
                          <Label
                            htmlFor="cycle-custom"
                            className="mb-0 shrink-0 whitespace-nowrap"
                          >
                            Custom sec.
                          </Label>
                          <Input
                            id="cycle-custom"
                            type="number"
                            min={CYCLE_LIMITS.minDelaySeconds}
                            step={0.1}
                            value={cycle.customSeconds}
                            onChange={(event) =>
                              setCycle((prev) => ({
                                ...prev,
                                customSeconds: Math.max(
                                  CYCLE_LIMITS.minDelaySeconds,
                                  Number(event.target.value) ||
                                    CYCLE_LIMITS.minDelaySeconds,
                                ),
                              }))
                            }
                            className="!w-auto min-w-0 flex-1"
                          />
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <Label
                          htmlFor="cycle-order"
                          className="mb-0 shrink-0 whitespace-nowrap"
                        >
                          Order
                        </Label>
                        <Select
                          id="cycle-order"
                          value={cycle.order}
                          onChange={(event) =>
                            setCycle((prev) => ({
                              ...prev,
                              order: event.target
                                .value as CycleSettings["order"],
                            }))
                          }
                          className="!w-auto min-w-0 flex-1"
                        >
                          <option value="sequential">Sequential</option>
                          <option value="random">Random</option>
                        </Select>
                      </div>
                    </div>

                    <label className="flex min-h-11 items-center justify-center gap-2">
                      <input
                        type="checkbox"
                        checked={cycle.loop}
                        onChange={(event) =>
                          setCycle((prev) => ({
                            ...prev,
                            loop: event.target.checked,
                          }))
                        }
                      />
                      <span className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                        Loop continuously
                      </span>
                    </label>
                  </div>
                </div>
                  </>
                ) : null}
            </div>

            <div className="order-1 space-y-4 lg:sticky lg:top-24 lg:order-2">
              <div className="space-y-3">
                <div
                  id="screen-colour-preview"
                  className="scroll-mt-[calc(var(--site-header-height)+0.75rem)] sm:scroll-mt-[calc(var(--site-header-height-sm)+0.75rem)]"
                >
                  <CursorMarkerPreview
                    background={background}
                    marker={marker}
                    title="Screen colour preview"
                    helperText={`Move over the preview to try the cursor marker on ${formatHex(background)}.`}
                    boxClassName="min-h-[22rem] sm:min-h-[28rem]"
                    onDoubleClick={() => void enterTestMode()}
                    onPrevious={() => stepColourCycle("previous")}
                    onNext={() => stepColourCycle("next")}
                    stepDisabled={enabledCount === 0}
                    topBanner={
                      <p className={PREVIEW_OVERLAY_LABEL_CLASS}>
                        Colour cycle delay: {cycleDelayLabel}
                      </p>
                    }
                    action={
                      <button
                        type="button"
                        onClick={() =>
                          addColourToCycle(background, formatHex(background))
                        }
                        className={PREVIEW_OVERLAY_BUTTON_CLASS}
                      >
                        Add to cycle
                      </button>
                    }
                  />
                </div>
                <ColourPickerAndHex
                  colour={background}
                  onPickerOpen={() => {
                    if (!previewCycleActive) return;
                    setPreviewCycleActive(false);
                    setStatusMessage(null);
                  }}
                  onChange={(colour) => {
                    if (previewCycleActive) {
                      setPreviewCycleActive(false);
                      setStatusMessage(null);
                    }
                    setBackground(colour);
                  }}
                />
                <div
                  id="colour-values-panel"
                  data-colour-values-panel
                  className="space-y-3 rounded-2xl border border-border bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                      Colour values
                    </p>
                    <button
                      type="button"
                      aria-expanded={colourValuesOpen}
                      aria-controls="colour-values-panel"
                      onClick={() => setColourValuesOpen((open) => !open)}
                      className={cn(
                        "inline-flex min-h-8 shrink-0 items-center rounded-md border border-border bg-surface px-2.5 text-sm font-medium text-muted shadow-soft-sm",
                        "transition-[transform,border-color,color,background-color] duration-200",
                        "hover:-translate-y-px hover:border-accent/40 hover:text-accent",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      {colourValuesOpen ? "Hide" : "Show"}
                    </button>
                  </div>
                  {colourValuesOpen ? (
                    <ColourFormatControls
                      colour={background}
                      onChange={setBackground}
                    />
                  ) : null}
                </div>
                <div
                  id="cursor-marker-panel"
                  className="space-y-4 rounded-2xl border border-border bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                      Cursor Marker
                    </p>
                    <button
                      type="button"
                      aria-expanded={cursorMarkerOpen}
                      aria-controls="cursor-marker-panel"
                      onClick={() => setCursorMarkerOpen((open) => !open)}
                      className={cn(
                        "inline-flex min-h-8 shrink-0 items-center rounded-md border border-border bg-surface px-2.5 text-sm font-medium text-muted shadow-soft-sm",
                        "transition-[transform,border-color,color,background-color] duration-200",
                        "hover:-translate-y-px hover:border-accent/40 hover:text-accent",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      {cursorMarkerOpen ? "Hide" : "Show"}
                    </button>
                  </div>

                  {cursorMarkerOpen ? (
                    <>
                      <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                        Move a contrasting ring over suspicious pixels to test
                        individual colour channels.
                      </p>

                      <MarkerColourPicker
                        colour={marker.colour}
                        onChange={(colour) =>
                          setMarker((prev) => ({ ...prev, colour }))
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="marker-diameter">
                            Diameter ({marker.diameter}px)
                          </Label>
                          <input
                            id="marker-diameter"
                            type="range"
                            min={MARKER_LIMITS.diameterMin}
                            max={MARKER_LIMITS.diameterMax}
                            value={marker.diameter}
                            onChange={(event) =>
                              setMarker((prev) => ({
                                ...prev,
                                enabled: true,
                                diameter: clampMarkerDiameter(
                                  Number(event.target.value),
                                ),
                              }))
                            }
                            className="mt-2 w-full"
                          />
                        </div>
                        <div>
                          <Label htmlFor="marker-opacity">
                            Opacity ({Math.round(marker.opacity * 100)}%)
                          </Label>
                          <input
                            id="marker-opacity"
                            type="range"
                            min={MARKER_LIMITS.opacityMin}
                            max={MARKER_LIMITS.opacityMax}
                            step={0.05}
                            value={marker.opacity}
                            onChange={(event) =>
                              setMarker((prev) => ({
                                ...prev,
                                enabled: true,
                                opacity: clampMarkerOpacity(
                                  Number(event.target.value),
                                ),
                              }))
                            }
                            className="mt-2 w-full"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                        <div className="space-y-2">
                          <label className="flex min-h-11 items-center gap-3">
                            <input
                              type="checkbox"
                              checked={marker.enabled}
                              onChange={(event) =>
                                setMarker((prev) => ({
                                  ...prev,
                                  enabled: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 shrink-0 rounded border-border"
                            />
                            <span className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                              Enable marker
                            </span>
                          </label>
                          <label className="flex min-h-11 items-center gap-3">
                            <input
                              type="checkbox"
                              checked={marker.hideSystemCursor}
                              onChange={(event) =>
                                setMarker((prev) => ({
                                  ...prev,
                                  hideSystemCursor: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 shrink-0 rounded border-border"
                            />
                            <span className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                              Hide system cursor
                            </span>
                          </label>
                        </div>

                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                          <Label
                            htmlFor="marker-style"
                            className="mb-0 shrink-0 whitespace-nowrap"
                          >
                            Marker style
                          </Label>
                          <Select
                            id="marker-style"
                            value={marker.style}
                            onChange={(event) =>
                              setMarker((prev) => ({
                                ...prev,
                                style: event.target.value as MarkerStyle,
                              }))
                            }
                            className="!w-[12.75rem] max-w-full shrink"
                          >
                            <option value="filled-circle">Filled circle</option>
                            <option value="outline-ring">Outline ring</option>
                            <option value="ring-dot">Ring with centre dot</option>
                            <option value="crosshair">Crosshair</option>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setMarker(DEFAULT_MARKER_SETTINGS)}
                      >
                        Reset marker settings
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
            <div
              id="pixel-workflows-panel"
              className="space-y-4 rounded-2xl border border-border bg-background/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                  Pixel test workflows
                </p>
                <button
                  type="button"
                  aria-expanded={pixelWorkflowsOpen}
                  aria-controls="pixel-workflows-panel"
                  onClick={() => setPixelWorkflowsOpen((open) => !open)}
                  className={cn(
                    "inline-flex min-h-8 shrink-0 items-center rounded-md border border-border bg-surface px-2.5 text-sm font-medium text-muted shadow-soft-sm",
                    "transition-[transform,border-color,color,background-color] duration-200",
                    "hover:-translate-y-px hover:border-accent/40 hover:text-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {pixelWorkflowsOpen ? "Hide" : "Show"}
                </button>
              </div>
              {pixelWorkflowsOpen ? (
                <>
              <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                One-click setups for common display checks. You can still edit
                the sequence afterward.
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {PIXEL_WORKFLOWS.map((workflow) => {
                  const isSelected = selectedWorkflowId === workflow.id;
                  const previewColourIds = [
                    ...workflow.backgroundSequence,
                    ...(workflow.markerQuickColours ?? []),
                  ];
                  const previewColours = previewColourIds.map((id) =>
                    getPresetById(id),
                  );
                  return (
                    <button
                      key={workflow.id}
                      type="button"
                      aria-pressed={isSelected}
                      className={cn(
                        "min-w-0 rounded-2xl border p-3 text-left transition-colors sm:p-4",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-accent bg-accent-soft/50 ring-2 ring-accent/30"
                          : "border-border/80 bg-surface hover:border-accent/40",
                      )}
                      onClick={() => applyWorkflow(workflow.id)}
                    >
                      <div
                        className="mb-2 flex flex-wrap items-center gap-1.5"
                        aria-hidden="true"
                      >
                        {previewColours.map((preset) => (
                          <span
                            key={`${workflow.id}-${preset.id}`}
                            title={preset.label}
                            className="h-3.5 w-3.5 rounded-full border border-border/80 shadow-soft-sm"
                            style={{ backgroundColor: rgbToCss(preset.rgb) }}
                          />
                        ))}
                      </div>
                      <p
                        className={cn(
                          "font-display text-sm font-semibold sm:text-base",
                          isSelected ? "text-accent" : "text-foreground",
                        )}
                      >
                        {workflow.label}
                      </p>
                      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted sm:text-base">
                        {workflow.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                {CHROMA_KEY_NOTE}
              </p>
                </>
              ) : null}
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
              <div>
                <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
                  Pick a colour from your screen
                </p>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                  Sample a colour from anywhere on your display when your
                  browser supports it.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-[0.9375rem] font-medium text-foreground sm:text-base">
                  Click the dropper to pick a colour on the screen
                </p>
                {eyeDropperSupported ? (
                  <button
                    type="button"
                    onClick={() => void handleEyeDropper()}
                    className={cn(
                      "flex min-h-[7rem] w-full max-w-sm items-center justify-center rounded-2xl border shadow-soft-sm sm:min-h-[8rem]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      inspector &&
                        inspector.sourceLabel === "Screen eyedropper"
                        ? "border-border"
                        : "border-dashed border-border bg-surface px-4 text-center text-[0.9375rem] text-muted sm:text-base",
                    )}
                    style={
                      inspector &&
                      inspector.sourceLabel === "Screen eyedropper"
                        ? { backgroundColor: rgbToCss(inspector.rgb) }
                        : undefined
                    }
                    aria-label={
                      inspector &&
                      inspector.sourceLabel === "Screen eyedropper"
                        ? `Picked colour ${formatHex(inspector.rgb)}. Click to pick another colour on the screen.`
                        : "Pick a colour on the screen"
                    }
                  >
                    {inspector &&
                    inspector.sourceLabel === "Screen eyedropper" ? null : (
                      <EyedropperIcon className="size-16 text-muted sm:size-20" />
                    )}
                  </button>
                ) : (
                  <div className="flex min-h-[3rem] w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-4 text-center text-[0.9375rem] text-muted sm:min-h-[4rem] sm:text-base">
                    {EYEDROPPER_UNSUPPORTED}
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    !inspector ||
                    inspector.sourceLabel !== "Screen eyedropper"
                  }
                  onClick={() => {
                    if (
                      !inspector ||
                      inspector.sourceLabel !== "Screen eyedropper"
                    ) {
                      return;
                    }
                    addColourToCycle(
                      inspector.rgb,
                      formatHex(inspector.rgb),
                    );
                  }}
                >
                  Add to colour cycle
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Image colour picker
            </h2>
            <p className="mt-2 text-base text-muted">
              Upload, paste, or load an image by URL, then click a pixel to
              sample HEX, RGB, HSL, HSV, and approximate CMYK.
            </p>
          </div>
          <ImageColourPicker
            onSampled={(sample) => {
              setInspector(sample);
              setBackground(sample.rgb);
            }}
            onUseAsMarker={(colour) =>
              setMarker((prev) => ({ ...prev, enabled: true, colour }))
            }
            onAddToCycle={(colour) => addColourToCycle(colour)}
          />
        </Card>

        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Shortcut guide
            </h2>
            <p className="mt-2 text-base text-muted">
              Shortcuts work in fullscreen test mode. They stay off while you
              type in a field. Press{" "}
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-sm">
                F
              </kbd>{" "}
              here to start the test, or{" "}
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-sm">
                ?
              </kbd>{" "}
              during a test for help.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
            <ul className="grid list-none gap-2 p-0">
              {SHORTCUT_GUIDE.map((item) => (
                <li
                  key={item.keys}
                  className="flex gap-3 rounded-xl border border-border/80 px-3 py-2 text-[0.9375rem] sm:text-base"
                >
                  <span className="w-24 shrink-0 font-mono font-semibold text-accent">
                    {item.keys}
                  </span>
                  <span className="text-muted">{item.description}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/60 p-5 lg:sticky lg:top-24">
              <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                Ready to inspect your display? Launch the fullscreen colour
                test when your settings look right.
              </p>
              <Button type="button" onClick={() => void enterTestMode()}>
                Start fullscreen colour test
              </Button>
            </div>
          </div>
        </Card>

        {statusMessage ? (
          <p className="text-[0.9375rem] text-muted sm:text-base" role="status">
            {statusMessage}
          </p>
        ) : null}
        {errorMessage ? <FriendlyError message={errorMessage} /> : null}

        <p className="sr-only">{COLOUR_TOOL.name} workspace</p>
      </div>
    </ToolWorkspaceShell>
  );
}
