import { describe, expect, it } from "vitest";
import { parseAuthDeepLink } from "@/lib/native-auth-link";

describe("parseAuthDeepLink", () => {
  it("ignores non-layerly urls", () => {
    expect(parseAuthDeepLink("https://layerly.online/auth-callback#access_token=a")).toBeNull();
    expect(parseAuthDeepLink("")).toBeNull();
  });

  it("ignores unrelated layerly deep links", () => {
    expect(parseAuthDeepLink("layerly://today")).toBeNull();
  });

  it("parses the callback link with hash tokens", () => {
    const parsed = parseAuthDeepLink("layerly://auth/callback#access_token=abc&refresh_token=def");
    expect(parsed?.kind).toBe("callback");
    expect(parsed?.params.get("refresh_token")).toBe("def");
  });

  it("parses the reset link with a query code", () => {
    const parsed = parseAuthDeepLink("layerly://auth/reset-password?code=xyz");
    expect(parsed?.kind).toBe("reset");
    expect(parsed?.params.get("code")).toBe("xyz");
  });

  it("gives the same key for the same link delivered twice", () => {
    const a = parseAuthDeepLink("layerly://auth/callback?code=abc");
    const b = parseAuthDeepLink("layerly://auth/callback?code=abc");
    expect(a?.key).toBe(b?.key);
  });

  it("parses error links", () => {
    const parsed = parseAuthDeepLink("layerly://auth/callback#error=access_denied&error_code=otp_expired");
    expect(parsed?.params.get("error_code")).toBe("otp_expired");
  });
});
