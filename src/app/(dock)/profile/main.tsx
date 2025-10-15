"use client";

import { Button } from "@/components/button";
import { BrowserNotificationsRow } from "@/components/profile/browserNotification";
import {
  EmailFrequency,
  EmailSettings,
  useEmailDefaults,
} from "@/components/profile/emailSettings";
import { ImagePicker } from "@/components/profile/imagePicker";
import { useProfileFields } from "@/components/profile/useProfileFields";
import type { SafeUser } from "@/helpers/server/auth";
import { useProfile } from "@/server_actions/client/profile/userProfileCrud";
import { useState } from "react";

export function ProfileMain({ user }: { user: SafeUser }) {
  const { name, setName, file, setFile, previewUrl, loadingImage } =
    useProfileFields(user);
  const { data, update } = useProfile();
  const defaults = useEmailDefaults();
  const {
    emailEnabled: emailEnabledFromData,
    emailFrequency: emailFrequencyFromData,
    timezone: timezoneFromData,
  } = data?.exists ? data : {};
  const [emailEnabled, setEmailEnabled] = useState<boolean>(
    emailEnabledFromData ?? defaults.emailEnabled,
  );
  const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>(
    (emailFrequencyFromData as EmailFrequency) ?? defaults.emailFrequency,
  );
  const [timezone, setTimezone] = useState(
    defaults.timezone ?? timezoneFromData,
  );
  const isSubmitting = update.isPending;
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSave = async () => {
    await update.mutateAsync({
      name: name.trim(),
      photo: file,
      emailEnabled,
      emailFrequency,
      timezone,
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative w-full max-w-4xl flex-1 overflow-auto p-8">
        <div className="flex flex-col items-start justify-start gap-4 md:gap-12">
          <h1 className="text-2xl font-normal md:text-5xl">Profile</h1>
          {/* Picture + Name row */}
          <div className="flex w-full flex-col gap-4 md:flex-row md:gap-12">
            <div className="flex flex-col gap-4 md:items-center">
              <ImagePicker
                previewUrl={previewUrl}
                disabled={isSubmitting || loadingImage}
                loadingImage={loadingImage}
                onPick={(f) => setFile(f)}
              />
            </div>
            <div className="flex flex-1 flex-col items-start gap-2">
              <label className="font-light">Full Name</label>
              <input
                type="input"
                placeholder="e.g. Jane Doe"
                className="input input-bordered mb-4 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <BrowserNotificationsRow />

          <EmailSettings
            emailEnabled={emailEnabled}
            setEmailEnabled={setEmailEnabled}
            emailFrequency={emailFrequency}
            setEmailFrequency={setEmailFrequency}
            timezone={timezone}
            setTimezone={setTimezone}
          />
        </div>
      </div>
      <div className="flex flex-row justify-end p-4">
        <Button
          buttonType="primary"
          buttonSize="lg"
          disabled={!canSubmit}
          withSpinner={isSubmitting}
          onClick={() => handleSave()}
        >
          {isSubmitting ? "Updating..." : "Update"}
        </Button>
      </div>
    </div>
  );
}
