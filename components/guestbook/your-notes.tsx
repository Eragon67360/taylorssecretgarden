import type { OwnNote } from "@/service/members";

import Link from "next/link";

import { memberPath } from "@/lib/swiftter";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const DATE = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type YourNotesProps = {
  memberId: string;
  /** Null when they could not be read. */
  notes: { notes: OwnNote[]; total: number } | null;
};

/**
 * On a Member's guestbook page: the notes and replies they published on
 * Swiftter, newest first, each a link to its thread (a reply opens its thread
 * on it), and the way to their Member page as others see it. Held notes are
 * not here (the feed's margin shows them), nor torn-up ones.
 */
export function YourNotes({ memberId, notes }: YourNotesProps) {
  return (
    <section aria-labelledby="your-notes" className="bg-card rounded-[4px] px-5 py-5 shadow-[0_1px_2px_rgba(60,40,20,.12)]">
      <h2 className="font-hand text-[30px] leading-none font-bold" id="your-notes">
        Your notes
      </h2>
      {!notes ? (
        <p className="text-pen mt-2 text-[15px] font-semibold" role="alert">
          Your notes can&apos;t be read just now. Try again in a moment.
        </p>
      ) : notes.total === 0 ? (
        <p className="text-soft mt-2 text-[16px] leading-relaxed">
          You haven&apos;t passed a note yet.{" "}
          <Link className="focus-ring text-ink rounded-sm font-bold underline underline-offset-2" href="/swiftter">
            Pass one on Swiftter
          </Link>
        </p>
      ) : (
        <>
          <p className="text-soft mt-2 text-[16px] leading-relaxed">
            {plural(notes.total, "note or reply", "notes and replies")} on Swiftter
            {notes.total > notes.notes.length && `, the latest ${notes.notes.length} below (your data has them all)`}.{" "}
            <Link className="focus-ring text-ink rounded-sm font-bold underline underline-offset-2" href={memberPath(memberId)}>
              Your Member page
            </Link>
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {notes.notes.map((note) => (
              <li key={note.id} className="border-line border-t pt-3">
                <Link
                  className="focus-ring text-ink block rounded-sm text-[16px] leading-snug break-words underline underline-offset-2"
                  href={`/swiftter/p/${note.id}`}
                >
                  {note.excerpt || "(a note without words)"}
                </Link>
                <p className="text-soft mt-1 text-[14px]">
                  {note.isReply ? "A reply" : "A note"}, <time dateTime={note.publishedAt}>{DATE.format(new Date(note.publishedAt))}</time> ·{" "}
                  {plural(note.replyCount, "reply", "replies")}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
