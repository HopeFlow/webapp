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

export const elapsedTime2String = (startTime: Date, newText?: string) => {
  const startTimeValue = startTime.getTime();
  const seconds = Math.ceil(Date.now() - startTimeValue) / 1000;
  let timeStr = "";

  if (seconds > 60 * 60 * 24 * 365) {
    const years = Math.round(seconds / (60 * 60 * 24 * 365));
    timeStr = years === 1 ? "1 year" : `${years} years`;
  } else if (seconds > 60 * 60 * 24 * 30) {
    const months = Math.round(seconds / (60 * 60 * 24 * 30));
    timeStr = months === 1 ? "1 month" : `${months} months`;
  } else if (seconds > 60 * 60 * 24) {
    const days = Math.round(seconds / (60 * 60 * 24));
    timeStr = days === 1 ? "1 day" : `${days} days`;
  } else if (seconds > 60 * 60) {
    const hours = Math.round(seconds / (60 * 60));
    timeStr = hours === 1 ? "1 hour" : `${hours} hours`;
  } else if (seconds > 60) {
    const minutes = Math.round(seconds / 60);
    timeStr = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  } else {
    return newText || "New";
  }

  return `${timeStr} ago`;
};

export function formatDateWithSuffix(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "long" });
  const year = date.getFullYear();

  // Determine suffix
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix} ${month} ${year}`;
}
