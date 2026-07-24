import { cn } from "@/lib/utils";

const EYEDROPPER_SRC = "/brand/eyedropper.png";

/** Eyedropper graphic used for screen colour picking. */
export function EyedropperIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static brand asset
    <img
      src={EYEDROPPER_SRC}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("size-[1.35rem] shrink-0 object-contain", className)}
    />
  );
}
