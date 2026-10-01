import { vi } from "vitest";

/*
  A stand-in for Deezer's public API, installed as the global `fetch`. It
  answers `/album/<id>`, `/album/<id>/tracks` and `/track/<id>` with made-up
  but well-formed bodies; `answer` overrides a path (a twin's ID, an error
  body, a hang), and `calls` lists the paths asked, in order.
*/
export type FakeAnswer = { status?: number; body: unknown } | "hang";

export function fakeDeezer() {
  const answers = new Map<string, FakeAnswer | FakeAnswer[]>();
  const calls: string[] = [];

  const fetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const path = String(input).replace("https://api.deezer.com", "");

    calls.push(path);
    const queued = answers.get(path);
    const answer = Array.isArray(queued) ? (queued.length > 1 ? queued.shift()! : queued[0]) : (queued ?? defaultAnswer(path));

    if (answer === "hang") {
      // Like a real fetch: it waits until its signal aborts, then rejects with the signal's reason.
      return new Promise<Response>((_, reject) => {
        const signal = init?.signal;

        if (signal?.aborted) reject(signal.reason);
        signal?.addEventListener("abort", () => reject(signal.reason));
      });
    }

    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200, headers: { "Content-Type": "application/json" } });
  });

  vi.stubGlobal("fetch", fetch);

  return {
    fetch,
    calls,
    /** Answers a path (several answers: one per call, the last one repeated). */
    answer(path: string, ...answer: FakeAnswer[]) {
      answers.set(path, answer.length === 1 ? answer[0] : answer);
    },
  };
}

export const cover = (id: string | number) => `https://cdn-images.dzcdn.net/images/cover/${id}/1000x1000-000000-80-0-0.jpg`;

export const album = (id: string | number) => ({
  id: Number(id),
  title: `Album ${id}`,
  cover_xl: cover(id),
  release_date: "2020-07-24",
  record_type: "album",
  label: "Republic Records",
  duration: 3600,
  genres: { data: [{ name: "Pop" }] },
});

export const track = (id: number) => ({
  id,
  title: `Track ${id}`,
  duration: 200,
  preview: `https://cdnt-preview.dzcdn.net/${id}.mp3`,
  artist: { name: "Taylor Swift" },
});

export const quotaExceeded = { body: { error: { type: "Exception", message: "Quota limit exceeded", code: 4 } } };
export const noData = { body: { error: { type: "DataException", message: "no data", code: 800 } } };

function defaultAnswer(path: string): FakeAnswer {
  const tracks = path.match(/^\/album\/(\d+)\/tracks/);

  if (tracks) return { body: { data: [track(1), track(2), track(3)] } };
  const albumId = path.match(/^\/album\/(\d+)$/)?.[1];

  if (albumId) return { body: album(albumId) };
  const trackId = path.match(/^\/track\/(\d+)$/)?.[1];

  if (trackId) return { body: track(Number(trackId)) };

  return { status: 404, body: { error: { message: "unknown path", code: 404 } } };
}
