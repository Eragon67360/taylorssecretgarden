"use client";

import { useId, useRef, useState } from "react";

import { WashiTape } from "@/components/scrapbook";

type DeletePostProps = {
  /** Deletes the Post; resolves once the request is settled. */
  onDelete: () => Promise<void>;
};

/**
 * "tear up", on a Member's own Posts: asks first, in a card taped over the
 * page (a native modal dialog, so it traps focus and closes with Escape), then
 * deletes the Post.
 */
export function DeletePost({ onDelete }: DeletePostProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      dialog.current?.close();
    }
  };

  return (
    <>
      <button
        className="font-hand focus-ring text-pen shrink-0 rounded-sm px-1 text-[20px] leading-none font-bold underline decoration-[1.5px] underline-offset-[4px]"
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        tear up<span className="sr-only"> this Post</span>
      </button>

      <dialog
        ref={dialog}
        aria-describedby={textId}
        aria-labelledby={titleId}
        className="bg-card text-ink paper-grain m-auto w-[min(26rem,calc(100vw-2rem))] overflow-visible px-6 pt-9 pb-6 shadow-[0_1px_2px_rgba(0,0,0,.12),0_24px_40px_-16px_rgba(40,20,10,.6)] backdrop:bg-[rgba(43,29,20,.45)]"
      >
        <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={-3} width={96} />
        <h2 className="font-hand text-[30px] leading-none font-bold" id={titleId}>
          Tear up this note?
        </h2>
        <p className="text-soft mt-3 text-[16px] leading-relaxed" id={textId}>
          It leaves Swiftter for good: no one will see it again, and it can&apos;t be brought back.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {/* First, so Enter or a stray tap keeps the note. */}
          <button
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the safe choice takes focus when the dialog opens
            autoFocus
            className="focus-ring text-ink min-h-11 rounded-[4px] px-3 text-[15px] font-bold underline underline-offset-2"
            disabled={deleting}
            type="button"
            onClick={() => dialog.current?.close()}
          >
            Keep it
          </button>
          <button
            className="bg-pen focus-ring inline-flex min-h-11 items-center rounded-[4px] px-5 text-[15px] font-bold tracking-wide text-white disabled:opacity-60"
            disabled={deleting}
            type="button"
            onClick={confirm}
          >
            Tear it up
          </button>
        </div>
      </dialog>
    </>
  );
}
