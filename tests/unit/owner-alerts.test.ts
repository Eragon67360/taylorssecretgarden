import { afterEach, describe, expect, it, vi } from "vitest";

import { ALERTS_REPOSITORY, givenUpAlert, notifyOwner, reportsAlert } from "@/service/owner-alerts";

// GitHub is never called: every test hands notifyOwner a stand-in fetch.

type Call = { url: string; method: string; body: unknown; auth: string | null };

/** A stand-in for GitHub's REST API: the open issues it lists, and every call it receives. */
function fakeGitHub({ open = [] as { number: number; title: string; pull_request?: unknown }[], fail = 0, refuseLabels = false } = {}) {
	const calls: Call[] = [];
	const send = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		const url = String(input);
		const method = init?.method ?? "GET";
		const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined;

		calls.push({ url, method, body, auth: new Headers(init?.headers).get("authorization") });
		if (fail) return new Response("{}", { status: fail });
		if (method === "GET") return Response.json(url.includes("labels=") ? open.filter((issue) => issue.number < 100) : open);
		if (refuseLabels && (body as { labels?: string[] }).labels) return Response.json({ message: "Validation Failed" }, { status: 422 });
		if (url.endsWith("/comments")) return Response.json({ html_url: `https://github.com/${ALERTS_REPOSITORY}/issues/1#comment` }, { status: 201 });

		return Response.json({ html_url: `https://github.com/${ALERTS_REPOSITORY}/issues/7` }, { status: 201 });
	});

	return { calls, fetch: send as unknown as typeof fetch };
}

const alert = { title: "Swiftter: something", body: "Note `abc`." };

describe("notifyOwner", () => {
	afterEach(() => vi.restoreAllMocks());

	it("without a token, logs the alert, as before, and calls nobody", async () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		const github = fakeGitHub();

		await expect(notifyOwner(alert, { token: "", fetch: github.fetch })).resolves.toEqual({ channel: "log" });
		expect(github.calls).toEqual([]);
		expect(log).toHaveBeenCalledWith(expect.stringContaining("ALERT: Swiftter: something"));
	});

	it("with a token, opens an issue on the project's repository, labelled", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const github = fakeGitHub();

		await expect(notifyOwner({ ...alert, labels: ["moderation"] }, { token: "t0ken", fetch: github.fetch })).resolves.toEqual({
			channel: "issue",
			url: `https://github.com/${ALERTS_REPOSITORY}/issues/7`,
		});
		const opened = github.calls.find((call) => call.method === "POST");

		expect(opened?.url).toBe(`https://api.github.com/repos/${ALERTS_REPOSITORY}/issues`);
		expect(opened?.body).toEqual({ title: alert.title, body: alert.body, labels: ["owner-alert", "moderation"] });
		expect(opened?.auth).toBe("Bearer t0ken");
	});

	it("never opens the same alert twice: an open issue with its title gets a comment instead", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const github = fakeGitHub({ open: [{ number: 3, title: alert.title, pull_request: {} }, { number: 5, title: alert.title }] });

		await expect(notifyOwner(alert, { token: "t0ken", fetch: github.fetch })).resolves.toMatchObject({ channel: "comment" });
		const posts = github.calls.filter((call) => call.method === "POST");

		// Number 3 is a pull request with the same title: not an alert.
		expect(posts.map((call) => call.url)).toEqual([`https://api.github.com/repos/${ALERTS_REPOSITORY}/issues/5/comments`]);
		expect(posts[0].body).toEqual({ body: alert.body });
	});

	it("finds an open alert whose label was dropped, among the newest issues", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const github = fakeGitHub({ open: [{ number: 120, title: alert.title }] });

		await expect(notifyOwner(alert, { token: "t0ken", fetch: github.fetch })).resolves.toMatchObject({ channel: "comment" });
		expect(github.calls.filter((call) => call.method === "GET")).toHaveLength(2);
	});

	it("opens it without labels when the token may not set them", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const github = fakeGitHub({ refuseLabels: true });

		await expect(notifyOwner(alert, { token: "t0ken", fetch: github.fetch })).resolves.toMatchObject({ channel: "issue" });
		expect(github.calls.filter((call) => call.method === "POST").map((call) => call.body)).toEqual([
			{ title: alert.title, body: alert.body, labels: ["owner-alert"] },
			{ title: alert.title, body: alert.body },
		]);
	});

	it("when GitHub fails, logs the alert and says so, never throwing", async () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		const github = fakeGitHub({ fail: 401 });

		await expect(notifyOwner(alert, { token: "t0ken", fetch: github.fetch })).resolves.toEqual({ channel: "log", error: "listing issues answered 401" });
		expect(log).toHaveBeenCalledWith(expect.stringContaining("ALERT: Swiftter: something"));

		const down = vi.fn(async () => {
			throw new TypeError("fetch failed");
		}) as unknown as typeof fetch;

		await expect(notifyOwner(alert, { token: "t0ken", fetch: down })).resolves.toEqual({ channel: "log", error: "fetch failed" });
	});

	it("takes any email address out, should one slip in: the repository is public", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const github = fakeGitHub();

		await notifyOwner({ title: "From fan@example.com", body: "Write to someone.else+x@mail.example.org" }, { token: "t0ken", fetch: github.fetch });
		const sent = JSON.stringify(github.calls.find((call) => call.method === "POST")?.body);

		expect(sent).not.toContain("@");
		expect(sent).toContain("[email removed]");
	});
});

describe("the alerts' contents", () => {
	const at = new Date("2026-10-01T03:00:00Z");

	it("notes given up on are named by id only", () => {
		const { title, body } = givenUpAlert(["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"], at);

		expect(title).toBe(givenUpAlert([]).title);
		expect(body).toContain("gave up on 2 notes");
		expect(body).toContain("`11111111-1111-4111-8111-111111111111`");
		expect(body).not.toContain("http");
	});

	it("reports and appeals: counted, one line per note, a link only to a public note", () => {
		const publicNote = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const refused = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
		const { title, body } = reportsAlert(
			[
				{ id: "r1", kind: "report", postId: publicNote, isPublic: true },
				{ id: "r2", kind: "report", postId: publicNote, isPublic: true },
				{ id: "r3", kind: "appeal", postId: refused, isPublic: false },
			],
			at,
			"https://www.taylorssecretgarden.com",
		);

		// Fixed, so the next run's alert lands on the same open issue.
		expect(title).toBe(reportsAlert([]).title);
		expect(body).toContain("2 reports of public notes and 1 appeal of refused notes, on 2 notes");
		expect(body).toContain(`- note \`${publicNote}\`, 2 reports: https://www.taylorssecretgarden.com/swiftter/p/${publicNote}`);
		expect(body).toContain(`- note \`${refused}\`, 1 appeal (not public: id only)`);
		expect(body).not.toContain(`/swiftter/p/${refused}`);
	});

	it("lists at most 50 notes, saying how many more", () => {
		const many = Array.from({ length: 53 }, (_, index) => ({ id: `r${index}`, kind: "report" as const, postId: `note-${index}`, isPublic: false }));
		const { body } = reportsAlert(many, at);

		expect(body.match(/^- note /gm)).toHaveLength(50);
		expect(body).toContain("- and 3 more notes");
	});
});
