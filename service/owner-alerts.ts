import "server-only";

import type { ReportToNotify } from "@/service/swiftter";

import { siteConfig } from "@/config/site";

/*
  How the site tells its owner something needs a human: an issue on the
  project's GitHub repository, opened through GitHub's REST API with
  OWNER_ALERTS_GITHUB_TOKEN (a fine-grained token limited to this repository,
  Issues: read and write). Without the token, or when GitHub fails, the alert
  is logged as an error instead, as before (#117).

  The repository is public: an alert names notes by id, and links only to
  public threads. Never a Member's email or name, never the text of a held
  note, never a reason someone wrote (those stay in the database).
*/

/** Where owner alerts are opened. */
export const ALERTS_REPOSITORY = "Eragon67360/taylorssecretgarden";

/** The label every owner alert carries, so they can be found and filtered. */
export const ALERT_LABEL = "owner-alert";

const API = "https://api.github.com";

/** How long one call to GitHub may take: the cron has other work to do. */
const TIMEOUT_MS = 10_000;

export type OwnerAlert = {
  /** Fixed for a kind of alert: an open issue with the same title takes the next one as a comment. */
  title: string;
  /** Markdown. Ids and public links only (see above). */
  body: string;
  labels?: string[];
};

/** Where an alert went: a new issue, a comment on the open one with its title, or the log only (`error` when GitHub was set up but failed). */
export type AlertDelivery = { channel: "issue" | "comment"; url: string } | { channel: "log"; error?: string };

type Fetch = typeof fetch;

/** An address, should one ever slip into an alert: the repository is public. */
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;

const redact = (text: string) => text.replace(EMAIL, "[email removed]");

/**
 * Tells the owner: opens a GitHub issue, or comments on the open issue with
 * the same title (the same alert is never opened twice); without
 * OWNER_ALERTS_GITHUB_TOKEN, logs it. Never throws: when GitHub fails the
 * alert is logged, and the answer says so (`error`), so the caller can try
 * again on its next run.
 */
export async function notifyOwner(
  alert: OwnerAlert,
  { token = process.env.OWNER_ALERTS_GITHUB_TOKEN, fetch: send = fetch }: { token?: string; fetch?: Fetch } = {},
): Promise<AlertDelivery> {
  const title = redact(alert.title);
  const body = redact(alert.body);

  // Logged either way: the log is the record when GitHub is not set up.
  // eslint-disable-next-line no-console
  console.error(`ALERT: ${title}\n${body}`);

  if (!token) return { channel: "log" };

  const github = (path: string, init?: { method: string; body: unknown }) =>
    send(`${API}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "taylorssecretgarden-owner-alerts",
        ...(init ? { "Content-Type": "application/json" } : {}),
      },
      body: init ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  try {
    // The open issue with this title: listed, not searched (search lags behind). Among the alerts first, then
    // among the newest open issues, in case its label was dropped (pull requests are issues to this endpoint too).
    const find = async (query: string) => {
      const listed = await github(`/repos/${ALERTS_REPOSITORY}/issues?state=open&per_page=100&sort=created&direction=desc${query}`);

      if (!listed.ok) throw new Error(`listing issues answered ${listed.status}`);

      return ((await listed.json()) as { number: number; title: string; pull_request?: unknown }[]).find(
        (issue) => !issue.pull_request && issue.title === title,
      );
    };
    const open = (await find(`&labels=${ALERT_LABEL}`)) ?? (await find(""));

    if (open) {
      const commented = await github(`/repos/${ALERTS_REPOSITORY}/issues/${open.number}/comments`, { method: "POST", body: { body } });

      if (!commented.ok) throw new Error(`commenting answered ${commented.status}`);

      return { channel: "comment", url: ((await commented.json()) as { html_url: string }).html_url };
    }

    const labels = [ALERT_LABEL, ...(alert.labels ?? [])];
    let opened = await github(`/repos/${ALERTS_REPOSITORY}/issues`, { method: "POST", body: { title, body, labels } });

    // A token that may not set labels is answered 422 (or they are dropped silently): the alert matters more than its labels.
    if (opened.status === 422) opened = await github(`/repos/${ALERTS_REPOSITORY}/issues`, { method: "POST", body: { title, body } });
    if (!opened.ok) throw new Error(`opening an issue answered ${opened.status}`);

    return { channel: "issue", url: ((await opened.json()) as { html_url: string }).html_url };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // eslint-disable-next-line no-console
    console.error(`Owner alert not delivered to GitHub (${message}); it is in the log above`);

    return { channel: "log", error: message };
  }
}

/** The alert for notes the scheduled re-check gave up on: held notes, so ids only. */
export function givenUpAlert(ids: string[], at = new Date()): OwnerAlert {
  return {
    title: "Swiftter: notes given up on, moderation gave no verdict for a week",
    body: [
      `The scheduled re-check of ${at.toISOString()} gave up on ${ids.length} note${ids.length === 1 ? "" : "s"}: AI moderation gave no verdict for a week (AI Gateway down, or out of credits?). Their authors are told; nothing was published.`,
      "",
      ...ids.map((id) => `- note \`${id}\``),
      "",
      "These notes are not public: look them up by id in the database (`posts`, `moderation_decisions`). Close this issue once moderation answers again; the next alert opens a new one.",
    ].join("\n"),
    labels: ["moderation"],
  };
}

/** Most notes one alert lists; the counts above the list still say how many there are. */
const MAX_LISTED = 50;

/**
 * The alert summing up the reports and appeals one cron run found: how many,
 * and each note by id, with a link only when the note is public (a report);
 * an appeal is about a refused note, which only its author may see. It links
 * to the moderation page, where moderators read and handle them.
 */
export function reportsAlert(reports: ReportToNotify[], at = new Date(), siteUrl = siteConfig.url): OwnerAlert {
  const count = (kind: ReportToNotify["kind"]) => reports.filter((report) => report.kind === kind).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const notes = new Map<string, { kinds: Map<ReportToNotify["kind"], number>; isPublic: boolean }>();

  for (const report of reports) {
    const note = notes.get(report.postId) ?? { kinds: new Map(), isPublic: report.isPublic };

    note.kinds.set(report.kind, (note.kinds.get(report.kind) ?? 0) + 1);
    notes.set(report.postId, note);
  }

  const lines = [...notes].slice(0, MAX_LISTED).map(([postId, { kinds, isPublic }]) => {
    const what = [...kinds].map(([kind, n]) => plural(n, kind, `${kind}s`)).join(", ");
    // A reply's address opens its thread on it.
    const where = isPublic ? `: ${siteUrl}/swiftter/p/${postId}` : " (not public: id only)";

    return `- note \`${postId}\`, ${what}${where}`;
  });

  return {
    title: "Swiftter: notes reported, or a human asked to look again",
    body: [
      `Since the last alert (run of ${at.toISOString()}): ${plural(count("report"), "report", "reports")} of public notes and ${plural(count("appeal"), "appeal", "appeals")} of refused notes, on ${plural(notes.size, "note", "notes")}.`,
      "",
      ...lines,
      ...(notes.size > MAX_LISTED ? [`- and ${notes.size - MAX_LISTED} more notes`] : []),
      "",
      `Handle them on the moderation page, signed in as a moderator: ${siteUrl}/guestbook/moderation (tear up, keep, or publish a refused note after all; each decision is recorded).`,
      "",
      "Who reported and why is on that page and in the database only (`note_reports`), never here: this repository is public. Close this issue when the list is done; the next alert opens a new one.",
    ].join("\n"),
    labels: ["moderation"],
  };
}
