"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button, ButtonLink, WashiTape } from "@/components/scrapbook";
import { MAX_REPORT_REASON_CHARACTERS } from "@/lib/swiftter";
import { cn } from "@/lib/utils";

import { NOTE_ACTION } from "./note-actions";
import { useReport } from "./use-swiftter";
import { noteExcerpt } from "./words";

type ReportNoteProps = {
  postId: string;
  authorName: string;
  /** The note's sanitised HTML: its first words name the dialog, so each note's are told apart. */
  content: string;
  /** Signed in: the report form. A visitor is asked to sign in first (`signInHref`). */
  signedIn: boolean;
  signInHref: string;
};

/**
 * "Report", under someone else's public note: a card taped over the page (a
 * native modal dialog, like tearing up) asking what is wrong, in the
 * Member's own words if they like, then sends it for a human to read. Once
 * sent, the control says so. A visitor is told to sign in first.
 */
export function ReportNote({ postId, authorName, content, signedIn, signInHref }: ReportNoteProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const quoteId = useId();
  const textId = useId();
  const reasonId = useId();
  const countId = useId();
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  // The dialog is only on the page while open: a closed one would repeat every note's first words in the page's text.
  const [open, setOpen] = useState(false);
  const { sending, sent, send } = useReport(postId);
  const words = `“${noteExcerpt(content)}”`;
  const close = () => dialog.current?.close();

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // Pressed again while it is on its way: nothing to do, the dialog stays.
    if (sending) return;
    const message = await send(reason);

    setProblem(message);
    if (!message) close();
  };

  return (
    <>
      <button
        // Stays focusable once sent: the keyboard is not thrown off it, and a press then does nothing.
        aria-disabled={sent}
        className={cn(NOTE_ACTION, "ml-auto underline decoration-[1.5px] underline-offset-[4px] aria-disabled:no-underline aria-disabled:opacity-70")}
        type="button"
        onClick={() => {
          if (sent) return;
          setProblem(null);
          setOpen(true);
        }}
      >
        {sent ? (
          <>
            <span aria-hidden="true">✓ </span>Reported
          </>
        ) : (
          "Report"
        )}
        <span className="sr-only"> {authorName}&apos;s note</span>
      </button>

      {open && (
        <dialog
          ref={dialog}
          aria-describedby={textId}
          aria-labelledby={`${titleId} ${quoteId}`}
          className="bg-card text-ink paper-grain m-auto w-[min(28rem,calc(100vw-2rem))] overflow-visible px-6 pt-9 pb-6 shadow-[0_1px_2px_rgba(0,0,0,.12),0_24px_40px_-16px_rgba(40,20,10,.6)] backdrop:bg-[rgba(43,29,20,.45)]"
          onClose={() => setOpen(false)}
        >
          <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={2} width={96} />
          <h2 className="font-hand text-[30px] leading-none font-bold" id={titleId}>
            Report this note?
          </h2>
          <p className="font-hand mt-2 text-[21px] leading-snug font-bold break-words" id={quoteId}>
            {words}
          </p>
          {signedIn ? (
            <form onSubmit={submit}>
              <p className="text-soft mt-3 text-[16px] leading-relaxed" id={textId}>
                A human will read it and decide whether it stays. {authorName} isn&apos;t told who reported it.
              </p>
              <label className="mt-4 block text-[15px] font-bold" htmlFor={reasonId}>
                What&apos;s wrong with it? <span className="text-soft font-normal">(optional)</span>
              </label>
              {/* The first control: the keyboard lands here when the dialog opens, and Enter only starts a new line. */}
              <textarea
                aria-describedby={countId}
                className="border-ink/30 bg-paper focus-ring mt-1 block min-h-24 w-full rounded-[3px] border-2 px-3 py-2 text-[15.5px]"
                id={reasonId}
                maxLength={MAX_REPORT_REASON_CHARACTERS}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="text-soft mt-1 text-right text-[13px]" id={countId}>
                {reason.length} / {MAX_REPORT_REASON_CHARACTERS}
              </p>
              {problem && (
                <p className="text-pen mt-2 text-[15px] font-semibold" role="alert">
                  {problem}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <Button variant="text" onClick={close}>
                  Cancel
                </Button>
                <Button aria-disabled={sending} type="submit">
                  {sending ? "Sending…" : "Send report"}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-soft mt-3 text-[16px] leading-relaxed" id={textId}>
                Only Members can report a note: sign the guestbook first, then report it from here.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <Button
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- the safe choice takes focus when the dialog opens
                  autoFocus
                  variant="text"
                  onClick={close}
                >
                  Close
                </Button>
                <ButtonLink arrow intent href={signInHref}>
                  Sign in to report
                </ButtonLink>
              </div>
            </>
          )}
        </dialog>
      )}
    </>
  );
}
