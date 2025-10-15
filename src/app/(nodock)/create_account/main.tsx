"use client";
import { useState } from "react";
import { Button } from "@/components/button";
import { MobileHeader } from "@/components/mobile_header";
import type { SafeUser } from "@/helpers/server/auth";
import { useProfileFields } from "@/components/profile/useProfileFields";
import { ImagePicker } from "@/components/profile/imagePicker";
import { BrowserNotificationsRow } from "@/components/profile/browserNotification";
import {
  EmailSettings,
  useEmailDefaults,
} from "@/components/profile/emailSettings";
import { useCreateAccount } from "@/server_actions/client/create_account/userProfileCrud";
import { useGoto, useGotoHome } from "@/helpers/client/routes";

export function CreateAccountMain({
  url,
  user,
}: {
  url?: string;
  user: SafeUser;
}) {
  const { name, setName, file, setFile, previewUrl, loadingImage } =
    useProfileFields(user);
  const { update } = useCreateAccount();
  const goTo = useGoto();
  const goToHome = useGotoHome();

  // email + tz defaults
  const defaults = useEmailDefaults();
  const [emailEnabled, setEmailEnabled] = useState<boolean>(
    defaults.emailEnabled,
  );
  const [emailFrequency, setEmailFrequency] = useState(defaults.emailFrequency);
  const [timezone, setTimezone] = useState(defaults.timezone);

  const isSubmitting = update.isPending;
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSave = () => {
    update
      .mutateAsync({
        name: name.trim(),
        photo: file,
        emailEnabled,
        emailFrequency,
        timezone,
      })
      .then(() => {
        if (url) goTo(url);
        else goToHome();
      });
  };

  return (
    <div className="flex w-full flex-1 flex-row items-stretch">
      <div className="relative flex-1">
        <div className="bg-base-200 absolute top-0 left-0 flex h-full w-full flex-col items-center">
          <MobileHeader inverseRole showUserAvatar={false} user={user} />
          <div className="relative w-full max-w-4xl flex-1 overflow-auto p-8">
            <div className="flex flex-col items-start justify-start gap-8 md:gap-12">
              <h1 className="text-3xl font-normal md:text-5xl">
                Complete your profile ...
              </h1>

              {/* Picture + Name row (same components as CreateAccount) */}
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
