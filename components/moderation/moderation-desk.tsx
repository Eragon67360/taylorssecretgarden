"use client";

import type { ModerationAction, ModerationItem } from "@/lib/swiftter";

import Link from "next/link";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button, WashiTape } from "@/components/scrapbook";
import { decideOnNote, fetchModerationQueue } from "@/components/swiftter/api";
import { PostContent } from "@/components/swiftter/post-content";
import { relativeDate } from "@/components/swiftter/relative-date";
import { useFocusAfterRender } from "@/components/swiftter/use-swiftter";
import { noteExcerpt } from "@/components/swiftter/words";
import { MAX_REPORT_REASON_CHARACTERS, memberPath } from "@/lib/swiftter";
import { cn } from "@/lib/utils";

type Queue = { items: ModerationItem[]; total: number };

/** Where a note stands, in words: never colour alone. */
function standing(item: ModerationItem): string {
  if (item.status === "approved") return "Public";
  if (item.status === "pending") return "Waiting for a check";

  return "Refused";
}

/** The model's categories, as the moderator reads them. */
const CATEGORY: Record<string, string> = { insult: "unkind", restricted: "not safe to share", off_topic: "off-topic" };

/** What each action's dialog asks and says, for this note. */
function dialogWords(action: ModerationAction, item: ModerationItem) {
  if (action === "tear-up") {
    return {
      title: "Tear up this note?",
      text: "It leaves Swiftter for good, for everyone, its author included, as if they had torn it up. Its reports are settled.",
      confirm: "Tear it up",
    };
  }
  if (action === "publish") {
    return {
      title: "Publish this note after all?",
      text: "It goes on the feed now, at the top, under its author's name. The appeal is settled.",
      confirm: "Publish it",
    };
  }

  return item.status === "approved"
    ? { title: "Keep this note?", text: "It stays on Swiftter as it is. Its reports are settled.", confirm: "Keep it" }
    : { title: "Keep this note refused?", text: "It stays refused, seen by its author only. The appeal is settled.", confirm: "Keep it refused" };
}

/** What the page says once a decision is recorded. */
const DONE: Record<ModerationAction, string> = {
  "tear-up": "Torn up: it has left Swiftter.",
  keep: "Kept, and its reports settled.",
  publish: "Published: it is on the feed now.",
};

/** A report's reason in quotes, or that there was none; an appeal's words are always the same. */
function reportWords(report: ModerationItem["reports"][number]): string {
  if (report.kind === "appeal") return "Its author asked a human to look again.";

  return report.reason ? `“${report.reason}”` : "No reason given.";
}

/** The model's last decision on the note, in words, with its reason while it is kept (30 days, for a note it passed). */
function aiWords(decision: ModerationItem["aiDecision"]): string {
  if (!decision) return "None recorded.";
  let verdict = "No verdict";

  if (decision.outcome === "approved") verdict = "Passed";
  if (decision.outcome === "blocked") verdict = `Refused: ${CATEGORY[decision.category ?? ""] ?? "no category"}`;

  return decision.reason ? `${verdict}. “${decision.reason}”` : `${verdict}.`;
}

const itemElementId = (id: string) => `moderation-${id}`;

const LIST_HEADING_ID = "moderation-list";

/**
 * The moderation page's list and its decisions. Each note shows what a
 * moderator needs (its text, author, standing, the open reports with their
 * reasons, the model's last decision, its thread) and its decisions; each
 * decision is two taps: the action, then its confirmation in a card taped
 * over the page (a native modal dialog: focus trapped, Escape closes), where
 * a note for the record can be added. The decided note then leaves the list
 * and the keyboard moves to the next one.
 */
export function ModerationDesk({ initial }: { initial: Queue }) {
  const [queue, setQueue] = useState(initial);
  const [pending, setPending] = useState<{ item: ModerationItem; action: ModerationAction } | null>(null);
  const [status, setStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const focusSoon = useFocusAfterRender();

  /** Takes a decided note off the list, and moves the keyboard to the one after it (or before it, or the list's heading). */
  const settle = (id: string, message: string) => {
    const index = queue.items.findIndex((item) => item.id === id);
    const rest = queue.items.filter((item) => item.id !== id);
    const next = rest[index] ?? rest[index - 1];

    setQueue({ items: rest, total: Math.max(0, queue.total - 1) });
    setStatus(message);
    focusSoon(next ? itemElementId(next.id) : LIST_HEADING_ID);
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const fresh = await fetchModerationQueue();

    setRefreshing(false);
    if (!fresh) {
      setStatus("The list couldn't be read just now. Try again in a moment.");

      return;
    }
    setQueue(fresh);
    setStatus(fresh.total ? `${countOf(fresh.total)} waiting.` : "Nothing is waiting.");
  };

  return (
    <section aria-labelledby={LIST_HEADING_ID}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-hand focus-ring text-ink rounded-sm text-[30px] leading-none font-bold" id={LIST_HEADING_ID} tabIndex={-1}>
          {queue.total ? `${countOf(queue.total)} waiting` : "Nothing waiting"}
        </h2>
        <Button aria-disabled={refreshing} variant="text" onClick={() => void refresh()}>
          {refreshing ? "Looking…" : "Look for new ones"}
        </Button>
      </div>
      <p aria-live="polite" className="text-ink mt-2 min-h-6 text-[15px] font-semibold" role="status">
        {status}
      </p>
      {queue.items.length === 0 ? (
        <p className="text-soft mt-2 text-[16px] leading-relaxed">No reports or appeals are open. New ones also reach the owner in the hourly alert.</p>
      ) : (
        <>
          {queue.total > queue.items.length && (
            <p className="text-soft mt-2 text-[14.5px]">
              The {queue.items.length} most recently asked about are below; the rest follow once these are handled.
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-5">
            {queue.items.map((item) => (
              <li key={item.id}>
                <ModerationCard item={item} onAction={(action) => setPending({ item, action })} />
              </li>
            ))}
          </ul>
        </>
      )}
      {pending && (
        <DecisionDialog
          action={pending.action}
          item={pending.item}
          onClose={() => setPending(null)}
          onDone={(message) => {
            setPending(null);
            settle(pending.item.id, message);
          }}
        />
      )}
    </section>
  );
}

const countOf = (count: number) => `${count} ${count === 1 ? "note" : "notes"}`;

/** A small action under a note, in the journal's hand: the first of a decision's two taps. */
const ACTION = "font-hand focus-ring min-h-11 rounded-sm px-1.5 text-[21px] font-bold underline decoration-[1.5px] underline-offset-[4px]";

function ModerationCard({ item, onAction }: { item: ModerationItem; onAction: (action: ModerationAction) => void }) {
  const titleId = useId();
  const reports = item.reports.filter((report) => report.kind === "report");
  const appealed = item.reports.some((report) => report.kind === "appeal");
  const who = item.author?.displayName ?? "a deleted account";
  const about = <span className="sr-only"> {`${who}'s ${item.isReply ? "reply" : "note"} “${noteExcerpt(item.content)}”`}</span>;

  return (
    <article
      aria-labelledby={titleId}
      className="bg-card focus-ring rounded-[4px] px-4 py-4 shadow-[0_1px_2px_rgba(60,40,20,.12)] sm:px-5"
      id={itemElementId(item.id)}
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p
          className={cn(
            "rounded-[3px] border-2 px-1.5 text-[12px] leading-[18px] font-extrabold tracking-[.1em] uppercase",
            item.status === "approved" ? "border-ink text-ink" : "border-pen text-pen",
          )}
        >
          {standing(item)}
        </p>
        <h3 className="text-ink text-[15px] font-bold" id={titleId}>
          {reports.length > 0 && `${reports.length} ${reports.length === 1 ? "report" : "reports"}`}
          {reports.length > 0 && appealed && " and "}
          {appealed && "an appeal"} on {item.isReply ? "a reply" : "a note"} by{" "}
          {item.author ? (
            <Link className="focus-ring rounded-sm underline underline-offset-2" href={memberPath(item.author.id)}>
              {item.author.displayName}
            </Link>
          ) : (
            who
          )}
        </h3>
      </div>
      <p className="text-soft mt-1 text-[13.5px]">
        Written {relativeDate(new Date(item.createdAt))}
        {item.threadPath && (
          <>
            {" · "}
            <Link className="focus-ring rounded-sm underline underline-offset-2" href={item.threadPath}>
              {item.status === "approved" ? "its thread" : "the thread it answers"}
            </Link>
          </>
        )}
      </p>
      <PostContent className="bg-paper text-ink mt-3 rounded-[3px] px-3 py-2 text-[15.5px] break-words" content={item.content} />
      <dl className="mt-3 flex flex-col gap-2 text-[14.5px]">
        {item.reports.map((report, index) => (
          <div key={index}>
            <dt className="text-soft">
              {report.kind === "report" ? "Reported" : "Appealed"} {relativeDate(new Date(report.createdAt))}
            </dt>
            <dd className="text-ink break-words whitespace-pre-line">{reportWords(report)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-soft">The model&apos;s last decision</dt>
          <dd className="text-ink break-words">{aiWords(item.aiDecision)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {item.status === "blocked" && (
          <button className={ACTION} type="button" onClick={() => onAction("publish")}>
            Publish after all{about}
          </button>
        )}
        <button className={ACTION} type="button" onClick={() => onAction("keep")}>
          {item.status === "approved" ? "Keep" : "Keep refused"}
          {about}
        </button>
        <button className={cn(ACTION, "text-pen")} type="button" onClick={() => onAction("tear-up")}>
          Tear up{about}
        </button>
      </div>
    </article>
  );
}

type DecisionDialogProps = {
  item: ModerationItem;
  action: ModerationAction;
  onClose: () => void;
  /** The decision is recorded (or someone else's was): the message to show. */
  onDone: (message: string) => void;
};

/**
 * The second tap: what the decision does, a note for the record if the
 * moderator likes, and the confirmation. The safe way out has the focus, so
 * Enter or a stray tap decides nothing.
 */
function DecisionDialog({ item, action, onClose, onDone }: DecisionDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const quoteId = useId();
  const textId = useId();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const words = dialogWords(action, item);

  useEffect(() => {
    dialog.current?.showModal();
    // Opened from an effect, after React's own autoFocus would have run (on a dialog still closed), and showModal alone would pick the note field.
    cancel.current?.focus();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // Pressed again while it is on its way: nothing to do.
    if (sending) return;
    setSending(true);
    const result = await decideOnNote(item.id, action, note);

    setSending(false);
    if (result.ok) {
      // Closed first: the note leaves the page, and the page moves the keyboard on (focus would otherwise return to a button that is gone).
      dialog.current?.close();
      onDone(DONE[action]);
    } else if (result.handled) {
      dialog.current?.close();
      onDone(result.message);
    } else {
      setProblem(result.message);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-describedby={textId}
      aria-labelledby={`${titleId} ${quoteId}`}
      className="bg-card text-ink paper-grain m-auto w-[min(28rem,calc(100vw-2rem))] overflow-visible px-6 pt-9 pb-6 shadow-[0_1px_2px_rgba(0,0,0,.12),0_24px_40px_-16px_rgba(40,20,10,.6)] backdrop:bg-[rgba(43,29,20,.45)]"
      onClose={onClose}
    >
      <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={action === "tear-up" ? -3 : 2} width={96} />
      <form onSubmit={submit}>
        <h2 className="font-hand text-[30px] leading-none font-bold" id={titleId}>
          {words.title}
        </h2>
        <p className="font-hand mt-2 text-[21px] leading-snug font-bold break-words" id={quoteId}>
          “{noteExcerpt(item.content)}”
        </p>
        <p className="text-soft mt-3 text-[16px] leading-relaxed" id={textId}>
          {words.text}
        </p>
        <label className="mt-4 block text-[15px] font-bold" htmlFor={noteId}>
          A note for the record <span className="text-soft font-normal">(optional, moderators only)</span>
        </label>
        <textarea
          className="border-ink/30 bg-paper focus-ring mt-1 block min-h-20 w-full rounded-[3px] border-2 px-3 py-2 text-[15.5px]"
          id={noteId}
          maxLength={MAX_REPORT_REASON_CHARACTERS}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {problem && (
          <p className="text-pen mt-2 text-[15px] font-semibold" role="alert">
            {problem}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {/* First, and focused: Enter or a stray tap decides nothing. */}
          <Button ref={cancel} variant="text" onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <Button aria-disabled={sending} type="submit" variant={action === "tear-up" ? "danger" : "primary"}>
            {sending ? "Recording…" : words.confirm}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
