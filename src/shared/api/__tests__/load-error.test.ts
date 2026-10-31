import { z } from "zod";

import { classifyLoadError, LoadError, toLoadError } from "../load-error";
import { NetworkTimeoutError } from "../network-timeout";

describe("load error classification", () => {
  it.each([
    [new NetworkTimeoutError(), "timeout"],
    [new TypeError("Network request failed"), "offline"],
    [{ message: "TypeError: Network request failed", code: "" }, "offline"],
    [{ message: "Failed to fetch" }, "offline"],
    [{ message: "JWT expired", code: "PGRST301" }, "unauthorized"],
    [{ message: "permission denied", code: "42501" }, "unauthorized"],
    [{ message: "Unauthorized", status: 401 }, "unauthorized"],
    [z.string().safeParse(1).error, "invalid"],
    [{ message: "relation does not exist", code: "42P01" }, "server"],
    [undefined, "server"],
  ])("classifies %p as %s", (error, kind) => {
    expect(classifyLoadError(error)).toBe(kind);
  });

  it("keeps the caller's user-facing message and exposes the kind", () => {
    const error = toLoadError(
      new TypeError("Network request failed"),
      "We couldn't load your work. Try again.",
    );
    expect(error).toBeInstanceOf(LoadError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("We couldn't load your work. Try again.");
    expect(error.kind).toBe("offline");
  });

  it("preserves an existing LoadError instead of re-wrapping it", () => {
    const original = new LoadError("unauthorized", "Sign in again.");
    expect(toLoadError(original, "Other")).toBe(original);
  });
});
