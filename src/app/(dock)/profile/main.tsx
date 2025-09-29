"use client";

import { Button } from "@/components/button";
import { LoadingElement } from "@/components/loading";
import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import { useGotoHome } from "@/helpers/client/routes";
import { SafeUser } from "@/helpers/server/auth";
import { useManageUserProfile } from "@/server_actions/client/profile/profile";
import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Hook: useProfileFields — manages name + image file + preview URL.
 * - Initializes from user (first/last + imageUrl)
 * - Fetches existing image as a File (so backend receives a file even for remote URL)
 */
function useProfileFields(user?: SafeUser | null) {
  const [name, setName] = useState<string>(
    user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const loadingImage = !!user?.imageUrl && !file && !previewUrl;

  // load existing user image (turn URL into a File so server receives multipart file)
  useEffect(() => {
    let revoked: string | null = null;
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      revoked = url;
    }
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user?.imageUrl || file) return; // already have file, skip
      try {
        const res = await fetch(user.imageUrl);
        const blob = await res.blob();
        if (cancelled) return;
        setFile(
          new File([blob], "user_photo", { type: blob.type || "image/jpeg" }),
        );
      } catch (err) {
        console.warn("Failed to fetch existing image", err);
        // optional: set an error flag so you don't keep showing spinner
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.imageUrl, file]);

  return {
    name,
    setName,
    file,
    setFile,
    previewUrl,
    setPreviewUrl,
    loadingImage,
  };
}

function AvatarContainer({
  children,
  size,
  className,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-full bg-neutral text-neutral-content grid place-items-center font-medium shadow ${className}`}
      style={{ width: size, height: size }}
      aria-label="No profile picture"
    >
      {children}
    </div>
  );
}

/**
 * AvatarPreview — shows a circular preview of the current image (if any) or initials fallback.
 */
function AvatarPreview({
  src,
  name,
  size = 144, // 36 * 4
  className = "",
  loadingImage,
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  loadingImage?: boolean;
}) {
  const initials = useMemo(() => {
    const n = (name || "?").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  }, [name]);
  if (loadingImage) {
    return (
      <AvatarContainer size={size} className={className}>
        <LoadingElement />
      </AvatarContainer>
    );
  }
  if (src) {
    return (
      <img
        src={src}
        alt="Profile picture"
        width={size}
        height={size}
        className={`rounded-full object-cover shadow ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <AvatarContainer size={size} className={className}>
      {initials}
    </AvatarContainer>
  );
}

/**
 * ImagePicker — hidden file input + buttons; supports click & drag/drop.
 */
function ImagePicker({
  onPick,
  onClear,
  disabled,
  previewUrl,
  loadingImage,
}: {
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  previewUrl?: string | null;
  loadingImage?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith("image/")) onPick(f);
    };
    el.addEventListener("dragover", prevent);
    el.addEventListener("dragenter", prevent);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("dragenter", prevent);
      el.removeEventListener("drop", onDrop);
    };
  }, [onPick]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={dropRef} className="relative">
        <AvatarPreview
          src={previewUrl || undefined}
          name={undefined}
          loadingImage={loadingImage}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
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
          {previewUrl && (
            <Button buttonType="neutral" buttonSize="sm" onClick={onClear}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs opacity-70">Drag & drop or upload an image</p>
    </div>
  );
}

export function ProfileMain({
  user,
  onDone,
}: {
  user: SafeUser;
  onDone?: () => void;
}) {
  const { name, setName, file, setFile, previewUrl, loadingImage } =
    useProfileFields(user);
  const { data, update } = useManageUserProfile();
  const isSubmitting = update.isPending;
  const canSubmit = name.trim().length > 0 && !isSubmitting;
  return (
    <div className="flex-1 flex flex-col">
      <div className="relative max-w-3xl w-full flex-1 overflow-auto p-8">
        <div className="flex flex-col gap-4 md:gap-12 items-start justify-start">
          <h1 className="font-normal text-2xl md:text-5xl">Profile</h1>
          {/* Picture + Name row */}
          <div className="w-full flex flex-col gap-4 md:flex-row md:gap-12">
            <div className="flex flex-col md:items-center gap-4">
              <h2 className="font-normal">Profile picture</h2>
              {/* <div className="w-36 h-36 bg-neutral rounded-box" /> */}
              <ImagePicker
                previewUrl={previewUrl}
                disabled={isSubmitting || loadingImage}
                loadingImage={loadingImage}
                onPick={(f) => setFile(f)}
                onClear={() => setFile(null)}
              />
            </div>
            <div className="flex-1 flex flex-col items-start gap-4">
              <h2 className="font-normal">Name</h2>
              <input
                type="input"
                placeholder="e.g. Jane Doe"
                className="input input-bordered w-full mb-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="w-full flex flex-col md:flex-row md:gap-12 justify-between">
            <label className="flex flex-row gap-2 items-center justify-between">
              Show Notifications{" "}
              <input
                type="checkbox"
                defaultChecked={false}
                className="toggle"
              />
            </label>
            <i className="hidden md:inline">
              {" "}
              (You will have to confirm receiving notifications)
            </i>
          </div>
          <div className="w-full flex flex-col gap-4 md:flex-row md:gap-12 justify-between">
            <label className="flex flex-row gap-2 items-center justify-between">
              Send Emails{" "}
              <input
                type="checkbox"
                defaultChecked={false}
                className="toggle"
              />
            </label>
            <label className="flex flex-row gap-2 items-center">
              Frequency{" "}
              <select defaultValue="Weekly" className="select">
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Never</option>
              </select>
            </label>
            <div className="flex flex-row gap-2 items-center">
              Timezone{" "}
              <select defaultValue="Europe/Berlin" className="select">
                <option>Europe/Berlin</option>
                <option>Pacific Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-row justify-end">
        <Button
          buttonType="primary"
          buttonSize="lg"
          disabled={!canSubmit}
          withSpinner={isSubmitting}
          onClick={async () => {
            try {
              await update.mutateAsync({ name: name.trim(), photo: file });
              onDone?.();
              // router navigation here if needed
            } catch (e) {
              console.error(e);
              alert(
                e instanceof Error
                  ? e.message
                  : "Failed to update profile. Please try again.",
              );
            }
          }}
        >
          {isSubmitting ? "Updating..." : "Update"}
        </Button>
      </div>
    </div>
  );
}
