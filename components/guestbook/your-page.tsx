"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Button, WashiTape } from "@/components/scrapbook";
import { setSessionMember } from "@/lib/auth/member-hint";

const CONNECTION = "That didn't go through. Check your connection and try again.";

/**
 * A Member's own page in the guestbook (app/(guestbook)/guestbook): download
 * what Swiftter keeps about them, or delete their account, after confirming
 * in a card taped over the page (a native modal dialog, like tearing up a
 * note). Deleting signs them out (lib/auth/member-hint.ts) and leaves for the home page.
 */
export function YourPage() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/swiftter/me", { method: "DELETE" });

      if (response.status === 204) {
        // The response expired the session cookies; the header hears it here and drops the member menu.
        setSessionMember(null);
        router.push("/");

        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      setError(data.error ?? "Deleting your account didn't work just now. Try again in a moment.");
    } catch {
      setError(CONNECTION);
    }
    setDeleting(false);
    dialog.current?.close();
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${titleId}-export`} className="bg-card rounded-[4px] px-5 py-5 shadow-[0_1px_2px_rgba(60,40,20,.12)]">
        <h2 className="font-hand text-[30px] leading-none font-bold" id={`${titleId}-export`}>
          Your data
        </h2>
        <p className="text-soft mt-2 text-[16px] leading-relaxed">
          Everything Swiftter keeps about you, in one file: your name and email, every note and reply you wrote (the ones on
          the feed, waiting or not passed, and what&apos;s left of those you tore up), your reshares and every moderation
          check of your notes.
        </p>
        <a
          download
          className="focus-ring text-ink bg-paper mt-4 inline-flex min-h-11 items-center rounded-[4px] px-4 font-bold underline underline-offset-2 shadow-[inset_0_0_0_1px_var(--line)]"
          href="/api/swiftter/me/export"
        >
          Download your data (JSON)
        </a>
      </section>

      <section aria-labelledby={`${titleId}-delete`} className="border-pen/50 rounded-[4px] border-2 border-dashed px-5 py-5">
        <h2 className="font-hand text-[30px] leading-none font-bold" id={`${titleId}-delete`}>
          Delete your account
        </h2>
        <p className="text-soft mt-2 text-[16px] leading-relaxed">
          Your notes are torn up and your name taken off them; replies others wrote stay, answering a torn-up note. Your
          reshares go, and so does your account. It can&apos;t be undone.
        </p>
        {error && (
          <p className="text-pen mt-3 text-[15px] font-semibold" role="alert">
            {error}
          </p>
        )}
        <Button className="mt-4" variant="danger" onClick={() => dialog.current?.showModal()}>
          Delete my account
        </Button>
      </section>

      <dialog
        ref={dialog}
        aria-describedby={textId}
        aria-labelledby={titleId}
        className="bg-card text-ink paper-grain m-auto w-[min(26rem,calc(100vw-2rem))] overflow-visible px-6 pt-9 pb-6 shadow-[0_1px_2px_rgba(0,0,0,.12),0_24px_40px_-16px_rgba(40,20,10,.6)] backdrop:bg-[rgba(43,29,20,.45)]"
      >
        <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={-3} width={96} />
        <h2 className="font-hand text-[30px] leading-none font-bold" id={titleId}>
          Delete your account?
        </h2>
        <p className="text-soft mt-3 text-[16px] leading-relaxed" id={textId}>
          Every note of yours is torn up, your reshares go and you&apos;re signed out. It can&apos;t be brought back.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {/* First, so Enter or a stray tap keeps the account. */}
          <Button
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the safe choice takes focus when the dialog opens
            autoFocus
            disabled={deleting}
            variant="text"
            onClick={() => dialog.current?.close()}
          >
            Keep it
          </Button>
          <Button aria-busy={deleting} disabled={deleting} variant="danger" onClick={deleteAccount}>
            {deleting ? "Deleting…" : "Delete it"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
