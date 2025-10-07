"use client";
import moment from "moment-timezone";
import { useMemo } from "react";
import { cn } from "@/helpers/client/tailwind_helpers";
import { USER_PROFILE_DEFAULTS } from "@/helpers/client/constants";
import { emailFrequencyDef } from "@/db/constants";
import { getBrowserTimeZone } from "@/helpers/client/time";

export function useTimezoneOptions() {
  return useMemo(() => {
    const names: string[] = moment.tz.names();
    const browserTz = getBrowserTimeZone();
    if (browserTz && names.includes(browserTz)) {
      return [browserTz, ...names.filter((tz) => tz !== browserTz)];
    }
    return names;
  }, []);
}

export type EmailFrequency = (typeof emailFrequencyDef)[number];
export function EmailSettings({
  emailEnabled,
  setEmailEnabled,
  emailFrequency,
  setEmailFrequency,
  timezone,
  setTimezone,
}: {
  emailEnabled: boolean;
  setEmailEnabled: (v: boolean) => void;
  emailFrequency: EmailFrequency;
  setEmailFrequency: (f: EmailFrequency) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}) {
  const timezoneOptions = useTimezoneOptions();

  return (
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
            onChange={(e) =>
              setEmailFrequency(e.target.value as EmailFrequency)
            }
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
  );
}

export function useEmailDefaults() {
  return {
    emailEnabled: USER_PROFILE_DEFAULTS.emailEnabled,
    emailFrequency: USER_PROFILE_DEFAULTS.emailFrequency as EmailFrequency,
    timezone: getBrowserTimeZone(),
  };
}
