export const USER_PROFILE_DEFAULTS = {
  emailEnabled: true,
  emailFrequency: "daily" as const,
  timezone: "Europe/Berlin",
} as const;

export const HOPEFLOW_EMAILS = { support: "support@mg.hopeflow.org" };

const useLocalRealtimeServer = process.env.NODE_ENV === "development";
// const useLocalRealtimeServer = false;

const REALTIME_SERVER_BASE = useLocalRealtimeServer
  ? "localhost:8787"
  : "realtime.vedadian.workers.dev";

export const REALTIME_SERVER_CHANNEL_URL = `${useLocalRealtimeServer ? "ws" : "wss"}://${REALTIME_SERVER_BASE}`;
export const REALTIME_SERVER_PUBLISH_URL = `${useLocalRealtimeServer ? "http" : "https"}://${REALTIME_SERVER_BASE}/publish`;

export const AVATAR_SIZE = 40;
