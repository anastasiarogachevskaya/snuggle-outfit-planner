// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it, beforeEach, mock } from "bun:test";
import { parseAuthDeepLink } from "@/lib/native-auth-link";

type AuthError = { message: string } | null;

let exchangeCodeForSession: (code: string) => Promise<{ error: AuthError }>;
let setSession: (args: {
  access_token: string;
  refresh_token: string;
}) => Promise<{ error: AuthError }>;
let verifyOtp: (args: { type: string; token_hash: string }) => Promise<{ error: AuthError }>;

mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (code: string) => exchangeCodeForSession(code),
      setSession: (args: { access_token: string; refresh_token: string }) => setSession(args),
      verifyOtp: (args: { type: string; token_hash: string }) => verifyOtp(args),
    },
  },
}));

const { processAuthDeepLink, resetAuthDeepLinkState, AUTH_LINK_EXPIRED_MESSAGE } =
  await import("../native-auth-link");

beforeEach(() => {
  resetAuthDeepLinkState();
  exchangeCodeForSession = async () => ({ error: null });
  setSession = async () => ({ error: null });
  verifyOtp = async () => ({ error: null });
});

describe("processAuthDeepLink", () => {
  it("ignores links that aren't auth deep links", async () => {
    const res = await processAuthDeepLink("layerly://today");
    expect(res.status).toBe("ignored");
  });

  it("treats an expired/error link as an error without calling Supabase", async () => {
    let called = false;
    exchangeCodeForSession = async () => {
      called = true;
      return { error: null };
    };
    const res = await processAuthDeepLink(
      "layerly://auth/callback#error=access_denied&error_code=otp_expired",
    );
    expect(res).toEqual({ status: "error", kind: "callback", message: AUTH_LINK_EXPIRED_MESSAGE });
    expect(called).toBe(false);
  });

  it("exchanges a code for a session on the callback link", async () => {
    let receivedCode: string | undefined;
    exchangeCodeForSession = async (code) => {
      receivedCode = code;
      return { error: null };
    };
    const res = await processAuthDeepLink("layerly://auth/callback?code=abc123");
    expect(res).toEqual({ status: "success", kind: "callback" });
    expect(receivedCode).toBe("abc123");
  });

  it("reports an error when exchangeCodeForSession fails (e.g. reused/expired code)", async () => {
    exchangeCodeForSession = async () => ({ error: { message: "invalid grant" } });
    const res = await processAuthDeepLink("layerly://auth/reset-password?code=stale");
    expect(res).toEqual({ status: "error", kind: "reset", message: AUTH_LINK_EXPIRED_MESSAGE });
  });

  it("sets the session from access/refresh tokens on the callback link", async () => {
    let received: { access_token: string; refresh_token: string } | undefined;
    setSession = async (args) => {
      received = args;
      return { error: null };
    };
    const res = await processAuthDeepLink(
      "layerly://auth/callback#access_token=abc&refresh_token=def",
    );
    expect(res).toEqual({ status: "success", kind: "callback" });
    expect(received).toEqual({ access_token: "abc", refresh_token: "def" });
  });

  it("verifies a token_hash + type on the reset-password link", async () => {
    let received: { type: string; token_hash: string } | undefined;
    verifyOtp = async (args) => {
      received = args;
      return { error: null };
    };
    const res = await processAuthDeepLink(
      "layerly://auth/reset-password?token_hash=th_123&type=recovery",
    );
    expect(res).toEqual({ status: "success", kind: "reset" });
    expect(received).toEqual({ type: "recovery", token_hash: "th_123" });
  });

  it("errors when the link has none of the recognised parameter shapes", async () => {
    const res = await processAuthDeepLink("layerly://auth/callback?nonsense=1");
    expect(res).toEqual({ status: "error", kind: "callback", message: AUTH_LINK_EXPIRED_MESSAGE });
  });

  it("never processes the exact same link twice", async () => {
    let calls = 0;
    exchangeCodeForSession = async () => {
      calls += 1;
      return { error: null };
    };
    const first = await processAuthDeepLink("layerly://auth/callback?code=once");
    const second = await processAuthDeepLink("layerly://auth/callback?code=once");
    expect(first.status).toBe("success");
    expect(second.status).toBe("duplicate");
    expect(calls).toBe(1);
  });

  it("treats a second delivery arriving while the first is still in flight as a duplicate", async () => {
    let calls = 0;
    let resolveFirst: (() => void) | undefined;
    exchangeCodeForSession = () =>
      new Promise((resolve) => {
        calls += 1;
        resolveFirst = () => resolve({ error: null });
      });

    const first = processAuthDeepLink("layerly://auth/callback?code=racey");
    const second = await processAuthDeepLink("layerly://auth/callback?code=racey");
    expect(second.status).toBe("duplicate");

    resolveFirst?.();
    const firstResult = await first;
    expect(firstResult.status).toBe("success");
    expect(calls).toBe(1);
  });

  it("allows the same link kind again after resetAuthDeepLinkState", async () => {
    exchangeCodeForSession = async () => ({ error: null });
    await processAuthDeepLink("layerly://auth/callback?code=again");
    resetAuthDeepLinkState();
    const res = await processAuthDeepLink("layerly://auth/callback?code=again");
    expect(res.status).toBe("success");
  });
});

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
    const parsed = parseAuthDeepLink(
      "layerly://auth/callback#error=access_denied&error_code=otp_expired",
    );
    expect(parsed?.params.get("error_code")).toBe("otp_expired");
  });
});
