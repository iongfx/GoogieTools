"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { renameBasename, stripExtension } from "@/lib/image-file-utils";
import { cn } from "@/lib/utils";

function extensionLabel(filename: string): string {
  const leaf = filename.split(/[/\\]/).pop() ?? filename;
  const dot = leaf.lastIndexOf(".");
  return dot > 0 ? leaf.slice(dot) : "";
}

type EditableImageFilenameProps = {
  filename: string;
  /** Shown when not editing (e.g. shortened thumbnail label). Defaults to full filename. */
  displayName?: string;
  disabled?: boolean;
  className?: string;
  align?: "left" | "center" | "right";
  onRename: (nextFilename: string) => void;
  /** Optional click when not editing (e.g. select the image). */
  onClickWhenIdle?: () => void;
};

/**
 * Double-click the name to rename the basename only; the extension stays fixed.
 */
export function EditableImageFilename({
  filename,
  displayName,
  disabled = false,
  className,
  align = "left",
  onRename,
  onClickWhenIdle,
}: EditableImageFilenameProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => stripExtension(filename));

  const extension = extensionLabel(filename);
  const label = displayName ?? filename;

  useEffect(() => {
    if (!editing) {
      setDraft(stripExtension(filename));
    }
  }, [filename, editing]);

  useEffect(() => {
    if (!editing) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [editing]);

  function beginEdit(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDraft(stripExtension(filename));
    setEditing(true);
  }

  function commit() {
    const next = renameBasename(filename, draft);
    setEditing(false);
    if (next !== filename) {
      onRename(next);
    }
  }

  function cancel() {
    setDraft(stripExtension(filename));
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  if (editing) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full min-w-0 items-baseline gap-0.5",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <label htmlFor={inputId} className="sr-only">
          Rename image file
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={draft}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          aria-label="Image filename without extension"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-w-0 flex-1 rounded border border-accent bg-background px-1.5 py-0.5 text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
        {extension ? (
          <span className="shrink-0 text-muted" aria-hidden="true">
            {extension}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      title={`${filename} — double-click to rename`}
      aria-label={`Filename ${filename}. Double-click to rename.`}
      onClick={(event) => {
        event.stopPropagation();
        onClickWhenIdle?.();
      }}
      onDoubleClick={beginEdit}
      className={cn(
        "max-w-full min-w-0 truncate rounded-sm text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-default disabled:opacity-60",
        align === "center" && "mx-auto text-center",
        align === "right" && "ml-auto text-right",
        className,
      )}
    >
      {label}
    </button>
  );
}
