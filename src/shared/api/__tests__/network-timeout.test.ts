import {
  isNetworkOrTimeoutError,
  NetworkTimeoutError,
  reconcileMutation,
  withTimeout,
} from "../network-timeout";

describe("network-timeout helpers", () => {
  it("resolves when promise finishes before timeout", async () => {
    const fastPromise = Promise.resolve("success");
    const result = await withTimeout(fastPromise, 1000);
    expect(result).toBe("success");
  });

  it("rejects with NetworkTimeoutError when promise exceeds timeout threshold", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 500));
    await expect(withTimeout(slowPromise, 50)).rejects.toThrow(
      NetworkTimeoutError,
    );
  });

  it("detects network and timeout errors correctly", () => {
    expect(new NetworkTimeoutError()).toBeInstanceOf(Error);
    expect(isNetworkOrTimeoutError(new NetworkTimeoutError())).toBe(true);
    expect(
      isNetworkOrTimeoutError(new Error("TypeError: Network request failed")),
    ).toBe(true);
    expect(isNetworkOrTimeoutError(new Error("Connection refused"))).toBe(true);
    expect(isNetworkOrTimeoutError(new Error("Validation failed"))).toBe(false);
    expect(isNetworkOrTimeoutError(null)).toBe(false);
  });

  it("reconciles already-completed server mutation without executing duplicate", async () => {
    const checkServerState = jest.fn(async () => ({
      id: "rec-1",
      status: "completed",
    }));
    const executeMutation = jest.fn();

    const outcome = await reconcileMutation(checkServerState, executeMutation);

    expect(outcome.reconciled).toBe(true);
    expect(outcome.result.id).toBe("rec-1");
    expect(executeMutation).not.toHaveBeenCalled();
  });

  it("executes mutation when server state has not recorded it yet", async () => {
    const checkServerState = jest.fn(async () => null);
    const executeMutation = jest.fn(async () => ({
      id: "rec-2",
      status: "created",
    }));

    const outcome = await reconcileMutation(checkServerState, executeMutation);

    expect(outcome.reconciled).toBe(false);
    expect(outcome.result.id).toBe("rec-2");
    expect(executeMutation).toHaveBeenCalledTimes(1);
  });
});
