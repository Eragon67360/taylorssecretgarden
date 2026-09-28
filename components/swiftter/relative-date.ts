const UNITS: [unit: Intl.RelativeTimeFormatUnit, seconds: number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * How long ago a date was, the way you'd scribble it on a note: "just now",
 * "5 minutes ago", "yesterday", "3 weeks ago", "last year".
 */
export function relativeDate(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);

  // Under a minute, or "in the future" because the visitor's clock runs slow.
  if (seconds > -60) return "just now";

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit);
  }

  return "just now";
}
