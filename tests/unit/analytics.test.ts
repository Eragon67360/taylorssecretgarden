import { describe, expect, it } from "vitest";

import { redactUrl } from "@/lib/analytics";

describe("redactUrl", () => {
  it("drops Neon Auth's Google verifier, the return address and error codes", () => {
    expect(redactUrl("https://www.taylorssecretgarden.com/swiftter?neon_auth_session_verifier=abc")).toBe("https://www.taylorssecretgarden.com/swiftter");
    expect(redactUrl("https://www.taylorssecretgarden.com/sign-in?redirect_url=%2Fswiftter%2Fp%2F1&error=access_denied")).toBe(
      "https://www.taylorssecretgarden.com/sign-in",
    );
  });

  it("keeps every other parameter, such as an Album", () => {
    expect(redactUrl("https://www.taylorssecretgarden.com/music?album=52612062&neon_auth_session_verifier=x")).toBe(
      "https://www.taylorssecretgarden.com/music?album=52612062",
    );
  });
});
