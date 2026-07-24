import type { FaqItem } from "@/types";

/** Marketing / FAQ content for the Colour Screen & Pixel Tester page. */

export const COLOUR_TOOL_HOW_TO = [
  {
    title: "Choose a colour",
    description:
      "Pick a preset, enter HEX/RGB/HSL/HSV/CMYK values, or sample a colour from your screen, an image or camera (if your device supports it).",
  },
  {
    title: "Set up your test",
    description:
      "Optionally enable the cursor marker and adjust its colour, size, and shape. Build a colour cycle from presets or colours you add yourself. Save the colour values as a PDF for future reference.",
  },
  {
    title: "Start fullscreen",
    description:
      "Launch the colour test with the button, or double-click the preview window. When you are done, press Esc, use Exit test, or double-click the screen to leave fullscreen.",
  },
] as const;

export const COLOUR_TOOL_USE_CASES = [
  {
    title: "Find dead or stuck pixels",
    description:
      "Apply the RGB pixel-test workflow, cycle solid colours in fullscreen, and use the cursor marker to inspect suspicious spots.",
  },
  {
    title: "Check display uniformity",
    description:
      "Use the uniformity or backlight workflows, then cycle white and greys to look for brightness shifts, backlight bleed, or uneven panels.",
  },
  {
    title: "Create a quick chroma-key backdrop",
    description:
      "Fill the display with practical chroma green or blue for casual video and photo work.",
  },
  {
    title: "Build and compare colour palettes",
    description:
      "Graphic designers can collect presets or custom colours into a cycle, flip through them on screen, and judge how a palette looks together before committing to a design.",
  },
  {
    title: "Grab colour values for web and UI work",
    description:
      "Web designers can quickly copy HEX, RGB, HSL, HSV, and CMYK values to use in mockups, CSS, and design tools during the design process.",
  },
  {
    title: "Colour-match from reference photos",
    description:
      "Sample colours from an uploaded image, pasted screenshot, camera photo, or anywhere on your screen to match real-world or brand reference colours.",
  },
  {
    title: "Save palettes for later",
    description:
      "Export your colour list as a PDF with swatches and values so you can reuse the palette as a quick reference in future projects.",
  },
  {
    title: "Inspect subpixels up close",
    description:
      "Use a black background with a coloured cursor marker to examine individual red, green, and blue subpixels more carefully.",
  },
  {
    title: "Validate projectors and large screens",
    description:
      "Run fullscreen colour tests to verify projectors, TVs, and meeting-room displays.",
  },
  {
    title: "Reference lighting and UI contrast",
    description:
      "Use solid colour fields as photography lighting references or quick UI spacing and contrast checks.",
  },
] as const;

export const COLOUR_TOOL_FAQ: FaqItem[] = [
  {
    question: "Is the Colour Screen & Pixel Tester free?",
    answer:
      "Yes. You can run fullscreen colour tests, inspect pixels, cycle colours, and sample values without paying or creating an account.",
    showFreeBadge: true,
  },
  {
    question: "Are my images uploaded to a server?",
    answer:
      "No. Uploaded, pasted, and locally selected images stay in your browser for this tool. We do not upload them to our servers to sample colours. See our Privacy Policy for full details.",
  },
  {
    question: "Does this fix dead pixels?",
    answer:
      "No. This tool helps you inspect displays with solid colours and a cursor marker. It does not repair hardware. Some stuck pixels recover on their own; others need manufacturer support.",
  },
  {
    question: "Why are CMYK values approximate?",
    answer:
      "Screens use RGB light. CMYK is a print colour model. The values here are a mathematical approximation for convenience and may not match printed output or colour-managed workflows.",
  },
  {
    question: "What if my browser does not support screen colour picking?",
    answer:
      "The EyeDropper API is not available in every browser. You can still upload, paste, or load an image and sample a pixel from the preview.",
  },
  {
    question: "Why can’t I sample some image URLs?",
    answer:
      "Many websites block cross-origin pixel reads (CORS). If an image displays but cannot be sampled, download it and upload it here instead. Googie Tools cannot bypass that browser security rule.",
  },
  {
    question: "Is chroma green the same as ordinary green?",
    answer:
      "No. Ordinary RGB green is pure #00FF00. Chroma green is a practical digital key colour chosen for keying workflows. There is no single universal professional standard.",
  },
  {
    question: "How do I exit fullscreen test mode?",
    answer:
      "Press Esc, use the on-screen Exit test control, double-click the screen, or leave the browser’s fullscreen UI. You are never locked in without an exit path. Tip: double-click the preview window to start fullscreen as well.",
  },
  {
    question: "Can rapid colour cycling cause discomfort?",
    answer:
      "Yes. Rapid colour changes may be uncomfortable for some people. Prefer slower intervals, use Manual only when inspecting carefully, and respect your browser’s reduced-motion preference.",
  },
] as const;
