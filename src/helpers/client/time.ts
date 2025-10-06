import moment from "moment-timezone";

export const getBrowserTimeZone = () => {
  try {
    // Prefer the browser-reported IANA zone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && moment.tz.names().includes(tz)) return tz;
  } catch {}
  // Fallback: let moment guess; final fallback: UTC
  const guessed = moment.tz.guess();
  return moment.tz.names().includes(guessed) ? guessed : "UTC";
};
