"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment-timezone";
import { Button } from "@/components/button";
import { LoadingElement } from "@/components/loading";
import { MobileHeader } from "@/components/mobile_header";
import { SafeUser } from "@/helpers/server/auth";
import { useManageUserProfile } from "@/server_actions/client/profile/profile";
import { useProfileFields } from "./useProfileFields";
import { USER_PROFILE_DEFAULTS } from "@/helpers/client/constants";
import { cn } from "@/helpers/client/tailwind_helpers";

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

export function CreateAccountMain({
  url,
  user,
  onDone,
}: {
  url?: string;
  user: SafeUser;
  onDone?: () => void;
}) {
  const { name, setName, file, setFile, previewUrl, loadingImage } =
    useProfileFields(user);
  const { update } = useManageUserProfile();

  // ----- Email + Notifications State -----
  const [emailEnabled, setEmailEnabled] = useState<boolean>(
    USER_PROFILE_DEFAULTS.emailEnabled,
  );
  const [emailFrequency, setEmailFrequency] = useState<
    "immediate" | "daily" | "weekly"
  >(USER_PROFILE_DEFAULTS.emailFrequency);
  const [timezone, setTimezone] = useState<string>(
    USER_PROFILE_DEFAULTS.timezone,
  );

  const [browserPermission, setBrowserPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = () => {
    if (typeof Notification !== "undefined") {
      Notification.requestPermission().then((permission) => {
        setBrowserPermission(permission);
      });
    }
  };

  const timezoneOptions = useMemo(() => {
    const names: string[] = moment.tz.names();
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz && names.includes(browserTz)) {
      return [browserTz, ...names.filter((tz) => tz !== browserTz)];
    }
    return names;
  }, []);

  // ----- Submission -----
  const isSubmitting = update.isPending;
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSave = () => {
    update.mutate({
      name: name.trim(),
      photo: file,
      emailEnabled,
      emailFrequency,
      timezone,
    });
    onDone?.();
  };

  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-base-200 flex flex-col items-center">
          <MobileHeader inverseRole showUserAvatar={false} />
          <div className="relative max-w-4xl w-full flex-1 overflow-auto p-8">
            <div className="flex flex-col gap-8 md:gap-12 items-start justify-start">
              <h1 className="font-normal text-3xl md:text-5xl">
                Complete your profile ...
              </h1>
              {/* Picture + Name row */}
              <div className="w-full flex flex-col gap-4 md:flex-row md:gap-12">
                <div className="flex flex-col md:items-center gap-4">
                  {/* <div className="w-36 h-36 bg-neutral rounded-box" /> */}
                  <ImagePicker
                    previewUrl={previewUrl}
                    disabled={isSubmitting || loadingImage}
                    loadingImage={loadingImage}
                    onPick={(f) => setFile(f)}
                    onClear={() => setFile(null)}
                  />
                </div>
                <div className="flex-1 flex flex-col items-start gap-2">
                  <label className="font-light">Full Name</label>
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
              {/* Browser Notifications */}
              <div className="flex gap-2">
                <label className="font-light">Browser Notifications</label>
                {browserPermission === "granted" && (
                  <p className="text-success">Notifications enabled ✅</p>
                )}
                {browserPermission === "default" && (
                  <div className="flex gap-2 content-between">
                    <Button
                      buttonType="neutral"
                      buttonSize="sm"
                      onClick={requestBrowserPermission}
                    >
                      Enable Browser Notifications
                    </Button>
                  </div>
                )}
                {browserPermission === "denied" && (
                  <p className="text-error text-sm">
                    Notifications blocked in your browser settings.
                  </p>
                )}
              </div>

              {/* Email Settings */}
              <div className="flex justify-between flex-wrap w-full gap-y-4">
                <label className="flex items-center gap-2">
                  Email Notifications
                  <input
                    type="checkbox"
                    className="toggle"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                  />
                </label>
                <div
                  className={cn(
                    "flex flex-wrap gap-y-4 items-center gap-4 min-w-0",
                    !emailEnabled && "opacity-50 pointer-events-none",
                  )}
                >
                  <label className="flex gap-2 items-center">
                    Frequency
                    <select
                      className="select select-bordered"
                      value={emailFrequency}
                      onChange={(e) => setEmailFrequency(e.target.value as any)}
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </label>

                  <label className="flex gap-2 items-center">
                    Timezone
                    <select
                      className="select select-bordered"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {timezoneOptions.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </label>
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
              onClick={handleSave}
            >
              {isSubmitting ? "Saving..." : "Save and continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
