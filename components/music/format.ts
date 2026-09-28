/** "3:54" */
export function formatTrackTime(ms: number) {
  const seconds = Math.floor(ms / 1000);

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** "54 min", "1 h 04 min" */
export function formatRunningTime(ms: number) {
  const minutes = Math.round(ms / 60000);

  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min` : `${minutes} min`;
}

/** "2017-11-17" → "November 17, 2017" (the date as released, whatever the visitor's time zone). */
export function formatReleaseDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** The Album title a fan writes: "Fearless (Taylor's Version)" → "Fearless". */
export function shortTitle(name: string) {
  return name.replace(/\s*\((Taylor['’]s Version|Deluxe Edition|Deluxe)\)/i, "");
}
