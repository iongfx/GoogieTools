import type { FaqItem } from "@/types";

/** Marketing / FAQ content for the Batch Image Compressor page. */

export const IMAGE_TOOL_HOW_TO = [
  {
    title: "Add your images",
    description:
      "Upload one photo or a full batch of JPG, PNG, or WebP files.",
  },
  {
    title: "Frame, rename, and set options",
    description:
      "Pick a preset (or keep original dimensions), then zoom and drag in the large preview to frame each photo. Double-click a filename to rename it, add an optional prefix, choose whether names include the size (like -600x600), and set quality. Thumbnails match your preset shape and show the crop you’ve chosen. Go from preview image to thumbnails and back quickly by clicking the blue down arrows by the preview image. To go back up, click on a thumbnail image.",
  },
  {
    title: "Process and download",
    description:
      "Once all images are laid out the way you want, process the batch. Check the size savings, then download images one by one or as a ZIP — all on your device, with no upload to our servers.",
  },
] as const;

export const IMAGE_TOOL_USE_CASES = [
  {
    title: "Website galleries and thumbnails",
    description:
      "Create consistent image dimensions for faster, cleaner gallery layouts.",
  },
  {
    title: "Email-friendly smartphone photos",
    description:
      "Reduce large phone photos before attaching them to emails or messages.",
  },
  {
    title: "Product, staff, and social images",
    description:
      "Prepare matching photos for shops, headshots, event pages, and social posts.",
  },
] as const;

export const IMAGE_TOOL_FAQ: FaqItem[] = [
  {
    question: "Is the Batch Image Compressor free?",
    answer:
      "Yes. You can resize, crop, convert, and compress images without paying or creating an account.",
    showFreeBadge: true,
  },
  {
    question: "Are my images uploaded or stored?",
    answer:
      "No. Images are processed on your device in your browser. We do not upload your files, filenames, previews, or processing options to our servers. See our Privacy Policy for full details.",
  },
  {
    question: "Which image formats are supported?",
    answer:
      "You can upload JPG/JPEG, PNG, and WebP (where your browser can decode it). Output options include Keep original format, JPG, PNG, and WebP (when your browser can encode it). SVG, GIF, and animated WebP are not accepted in this first release.",
  },
  {
    question: "Can I process several images at once?",
    answer:
      "Yes. Upload a batch (up to 50 images, 25 MB per file, 250 MB total) at a time. Choose settings once, then process the whole batch. Images are handled one at a time so your browser stays responsive.",
  },
  {
    question: "How do I control what part of each photo is kept?",
    answer:
      "Choose a preset or enter a width and height, then use the preview to zoom and drag each image into place. That framing is used when you process the batch, so mixed landscape and portrait photos can share the same output size.",
  },
  {
    question: "Can the tool make every image exactly 450 × 300 pixels?",
    answer:
      "Yes. Choose the Gallery landscape preset (or enter 450 × 300 yourself), adjust framing in the preview if needed, then process the batch. Every successful image is exported at that exact size.",
  },
  {
    question: "Will enlarging a small image improve its quality?",
    answer:
      "No. Enlargement can make an image fill a larger frame, but it does not add real detail. Soft or blurry results are common when a small photo is scaled up significantly.",
  },
  {
    question: "Does processing remove photo metadata?",
    answer:
      "Processed images are re-created in your browser, which normally removes embedded metadata such as camera and location details. This tool does not intentionally preserve GPS metadata.",
  },
  {
    question: "Should I use JPG, PNG, or WebP?",
    answer:
      "JPG is a solid default for photos and usually produces smaller files with a quality slider. WebP can be even smaller for web use when your browser supports encoding it. PNG is lossless and better when you need sharp graphics or transparency, but files may be larger. JPG cannot keep transparency.",
  },
  {
    question: "Why did a processed image become larger?",
    answer:
      "Sometimes re-encoding at a high quality, converting to a lossless format like PNG, or enlarging an image can increase file size. Check the format and quality settings, or try a lower quality for photos.",
  },
  {
    question: "Can I download all images in one ZIP?",
    answer:
      "Yes. After processing, use Download all images as ZIP. Only successfully processed images are included. The ZIP is created in your browser when you request it.",
  },
  {
    question: "Can I use this tool on a phone?",
    answer:
      "Yes. The Batch Image Compressor works on modern mobile browsers. Very large batches may be slower on phones because of memory limits — try smaller batches if the device struggles.",
  },
];
