import { describe, expect, it } from "vitest";

import { isAuthProxyRoute } from "@/lib/auth/proxy-routes";

// Segments as the catch-all route receives them: Next decodes each one, so
// `/api/auth/.%2Fsign-up/email` arrives as [".\/sign-up", "email"].
describe("isAuthProxyRoute", () => {
	it.each([
		["GET", ["get-session"]],
		["POST", ["sign-up", "email"]],
		["POST", ["sign-in", "email"]],
		["POST", ["sign-in", "social"]],
		["POST", ["sign-out"]],
	])("forwards %s %j, which the site uses", (method, segments) => {
		expect(isAuthProxyRoute(method, segments)).toBe(true);
	});

	it.each([
		["an encoded ./ before the path", ["./sign-up", "email"]],
		["an encoded x/../ before the path", ["x/../sign-up", "email"]],
		["a dot segment", [".", "sign-up", "email"]],
		["a dot-dot segment", ["x", "..", "sign-in", "email"]],
		["a backslash", ["x\\..\\sign-up", "email"]],
		["a double-encoded path", ["%2E%2Fsign-up", "email"]],
		["a trailing segment", ["sign-up", "email", "x"]],
	])("refuses a sign-up spelled with %s", (_, segments) => {
		expect(isAuthProxyRoute("POST", segments)).toBe(false);
	});

	it.each([
		["POST", ["update-user"]],
		["POST", ["delete-user"]],
		["POST", ["request-password-reset"]],
		["POST", ["admin", "create-user"]],
		["GET", ["admin", "list-users"]],
		["GET", ["token", "anonymous"]],
		["POST", ["organization", "create"]],
		["GET", ["ok"]],
	])("refuses %s %j, which the site does not use", (method, segments) => {
		expect(isAuthProxyRoute(method, segments)).toBe(false);
	});

	it("refuses a used path with the wrong method", () => {
		expect(isAuthProxyRoute("GET", ["sign-in", "email"])).toBe(false);
		expect(isAuthProxyRoute("DELETE", ["get-session"])).toBe(false);
		expect(isAuthProxyRoute("post", ["sign-out"])).toBe(true);
	});
});
