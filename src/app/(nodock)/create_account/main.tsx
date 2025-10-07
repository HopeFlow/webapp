"use client";
import { useState } from "react";
import { Button } from "@/components/button";
import { MobileHeader } from "@/components/mobile_header";
import { SafeUser } from "@/helpers/server/auth";
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
        url ? goTo(url) : goToHome();
      });
  };

  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-base-200 flex flex-col items-center">
          <MobileHeader inverseRole showUserAvatar={false} user={user} />
          <div className="relative max-w-4xl w-full flex-1 overflow-auto p-8">
            <div className="flex flex-col gap-8 md:gap-12 items-start justify-start">
              <h1 className="font-normal text-3xl md:text-5xl">
                Complete your profile ...
              </h1>

              {/* Picture + Name row (same components as CreateAccount) */}
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
