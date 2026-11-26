// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { outingAnswersKey, parseStoredOutingAnswers } from "@/lib/today-outing";

describe("Today outing answers kept across navigation (T17A)", () => {
  it("reads back all four stated answers", () => {
    const raw = JSON.stringify({
      movement: "mixed",
      toddlerTransport: "sitting-stroller",
      activity: "wet_play",
      ground: "wet",
    });
    expect(parseStoredOutingAnswers(raw)).toEqual({
      movement: "mixed",
      toddlerTransport: "sitting-stroller",
      activity: "wet_play",
      ground: "wet",
    });
  });
  it("keeps No transport", () => {
    expect(parseStoredOutingAnswers('{"toddlerTransport":"none"}')).toEqual({
      toddlerTransport: "none",
    });
  });
  it("treats missing, broken or unknown values as unanswered", () => {
    expect(parseStoredOutingAnswers(null)).toEqual({});
    expect(parseStoredOutingAnswers("{oops")).toEqual({});
    expect(parseStoredOutingAnswers('{"movement":"running","ground":"mud"}')).toEqual({});
  });
  it("is kept per child", () => {
    expect(outingAnswersKey("a")).not.toBe(outingAnswersKey("b"));
  });
});
