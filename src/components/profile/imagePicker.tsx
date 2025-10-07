"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/button";
import { AvatarPreview } from "./avatar";

/**
 * ImagePicker — hidden file input + buttons; supports click & drag/drop.
 */
const MAX_IMAGE_MB = 3;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

export function ImagePicker({
  onPick,
  disabled,
  previewUrl,
  loadingImage,
}: {
  onPick: (file: File) => void;
  disabled?: boolean;
  previewUrl?: string | null;
  loadingImage?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChosenFile = (f: File | undefined | null) => {
    if (!f) return;
    setError(null);

    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      setError(`Image is too large. Max size is ${MAX_IMAGE_MB}MB.`);
      return;
    }
    onPick(f);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <AvatarPreview
          src={previewUrl || undefined}
          name={undefined}
          loadingImage={loadingImage}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleChosenFile(e.target.files?.[0] ?? null)}
          // capture="user" // consider removing on desktop
        />
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          <Button
            buttonType="secondary"
            buttonSize="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            {previewUrl ? "Change" : "Upload"}
          </Button>
        </div>
      </div>

      {/* Updated helper text (no drag/drop mention) */}
      <p className="text-xs opacity-70">
        Upload an image (max {MAX_IMAGE_MB}MB)
      </p>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
