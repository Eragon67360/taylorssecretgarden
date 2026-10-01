import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deezerGet, getAlbum, getAlbumDetails, getTrackPreview } from "@/service/deezer";

import { cacheStats, resetCache } from "../stubs/next-cache";

import { album, fakeDeezer, noData, quotaExceeded } from "./fake-deezer";

vi.mock("next/cache", () => import("../stubs/next-cache"));

let deezer: ReturnType<typeof fakeDeezer>;

beforeEach(() => {
  resetCache();
  deezer = fakeDeezer();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Runs a call whose retries wait on timers, moving the fake clock on until it settles. */
async function withRetries<T>(call: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  const settled = call().then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );

  await vi.runAllTimersAsync();
  const result = await settled;

  if ("error" in result) throw result.error;

  return result.value;
}

describe("deezerGet", () => {
  it("answers from the cache once a path has been fetched", async () => {
    expect(await deezerGet("/album/1")).toMatchObject({ id: 1 });
    expect(await deezerGet("/album/1")).toMatchObject({ id: 1 });
    expect(deezer.calls).toEqual(["/album/1"]);
  });

  it("retries Quota limit exceeded, after a wait, until Deezer answers", async () => {
    deezer.answer("/album/2", quotaExceeded, quotaExceeded, { body: album(2) });

    expect(await withRetries(() => deezerGet("/album/2"))).toMatchObject({ id: 2 });
    expect(deezer.calls).toEqual(["/album/2", "/album/2", "/album/2"]);
  });

  it("gives up after three Quota limit exceeded", async () => {
    deezer.answer("/album/3", quotaExceeded);

    await expect(withRetries(() => deezerGet("/album/3"))).rejects.toThrow("Deezer /album/3 failed: Quota limit exceeded");
    expect(deezer.calls).toHaveLength(3);
  });

  it("does not retry other errors, and never caches an error body", async () => {
    deezer.answer("/album/4", noData, { body: album(4) });

    await expect(deezerGet("/album/4")).rejects.toThrow("Deezer /album/4 failed: no data");
    expect(deezer.calls).toHaveLength(1);
    // Deezer's answer was not kept: the next call asks again, and gets the Album.
    expect(await deezerGet("/album/4")).toMatchObject({ id: 4 });
    expect(deezer.calls).toHaveLength(2);
  });

  it("fails on an HTTP error", async () => {
    deezer.answer("/album/5", { status: 503, body: {} });

    await expect(deezerGet("/album/5")).rejects.toThrow("Deezer /album/5 failed: 503");
  });

  it("shares one request between concurrent calls for the same path", async () => {
    const [first, second] = await Promise.all([deezerGet("/album/6"), deezerGet("/album/6")]);

    expect(first).toEqual(second);
    expect(deezer.fetch).toHaveBeenCalledTimes(1);
  });

  it("gives up on a request after 5 seconds, without retrying it", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => AbortSignal.abort(new DOMException("The operation timed out.", "TimeoutError")));

    deezer.answer("/album/7", "hang");

    await expect(getAlbum("7")).rejects.toMatchObject({ name: "TimeoutError" });
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(deezer.fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(deezer.calls).toEqual(["/album/7"]);
  });
});

describe("getAlbumDetails", () => {
  it("maps an Album and its tracks, and keeps them as one cache entry", async () => {
    const details = await getAlbumDetails("8");

    expect(details).toMatchObject({ id: "8", label: "Republic Records", genres: ["Pop"], total_duration_ms: 3_600_000 });
    expect(details.tracks.items.map(({ id }) => id)).toEqual(["1", "2", "3"]);
    expect(deezer.calls).toEqual(["/album/8", "/album/8/tracks?limit=200"]);

    cacheStats.reads = 0;
    expect(await getAlbumDetails("8")).toEqual(details);
    expect(cacheStats.reads).toBe(1);
    expect(deezer.calls).toHaveLength(2);
  });

  it("fails, caching nothing, when Deezer fails the tracks", async () => {
    deezer.answer("/album/9/tracks?limit=200", noData);

    await expect(getAlbumDetails("9")).rejects.toThrow("no data");
    deezer.answer("/album/9/tracks?limit=200", { body: { data: [] } });
    expect((await getAlbumDetails("9")).tracks.items).toEqual([]);
  });
});

describe("getTrackPreview", () => {
  it("answers the track's preview, or none", async () => {
    deezer.answer("/track/11", { body: { id: 11, preview: "" } });

    expect(await getTrackPreview("10")).toBe("https://cdnt-preview.dzcdn.net/10.mp3");
    expect(await getTrackPreview("11")).toBeUndefined();
  });
});
