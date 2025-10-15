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
import { useEffect, useState } from "react";

export function ProfileMain({ user }: { user: SafeUser }) {
  const { name, setName, file, setFile, previewUrl, loadingImage } =
    useProfileFields(user);
  const { data, update } = useProfile();
  const defaults = useEmailDefaults();
  const [emailEnabled, setEmailEnabled] = useState<boolean>(
    defaults.emailEnabled,
  );
  const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>(
    defaults.emailFrequency,
  );
  const [timezone, setTimezone] = useState(defaults.timezone);
  const isSubmitting = update.isPending;
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  useEffect(() => {
    if (data?.exists) {
      setEmailEnabled(data.emailEnabled);
      setEmailFrequency(data.emailFrequency as EmailFrequency);
      setTimezone(data.timezone);
    }
  }, [data]);

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
    <div className="flex-1 flex flex-col">
      <div className="relative max-w-4xl w-full flex-1 overflow-auto p-8">
        <div className="flex flex-col gap-4 md:gap-12 items-start justify-start">
          <h1 className="font-normal text-2xl md:text-5xl">Profile</h1>
          {/* Picture + Name row */}
          <div className="w-full flex flex-col gap-4 md:flex-row md:gap-12">
            <div className="flex flex-col md:items-center gap-4">
              <ImagePicker
                previewUrl={previewUrl}
                disabled={isSubmitting || loadingImage}
                loadingImage={loadingImage}
                onPick={(f) => setFile(f)}
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
      <div className="p-4 flex flex-row justify-end">
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
