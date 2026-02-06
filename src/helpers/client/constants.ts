export const USER_PROFILE_DEFAULTS = {
  emailEnabled: true,
  emailFrequency: "daily" as const,
  timezone: "Europe/Berlin",
} as const;

export const HOPEFLOW_EMAILS = { support: "support@mg.hopeflow.org" };
export const REALTIME_SERVER_URL =
  process.env.NODE_ENV === "development"
    ? "localhost:8787"
    : "realtime.vedadian.workers.dev";

export const AVATAR_SIZE = 40;
