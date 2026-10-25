export const DEFAULT_NETWORK_TIMEOUT_MS = 12000;

export class NetworkTimeoutError extends Error {
  constructor(
    message = "Network request timed out. Please check your connection and try again.",
  ) {
    super(message);
    this.name = "NetworkTimeoutError";
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS,
  customMessage?: string,
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new NetworkTimeoutError(customMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
}

export function isNetworkOrTimeoutError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof NetworkTimeoutError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("abort") ||
      msg.includes("failed to fetch") ||
      msg.includes("connection refused") ||
      msg.includes("econnrefused")
    );
  }
  return false;
}

export async function reconcileMutation<T>(
  checkServerState: () => Promise<T | null>,
  executeMutation: () => Promise<T>,
): Promise<{ result: T; reconciled: boolean }> {
  try {
    const existing = await checkServerState();
    if (existing) {
      return { result: existing, reconciled: true };
    }
  } catch {
    // If check fails, fall through to mutation execution
  }

  const result = await executeMutation();
  return { result, reconciled: false };
}
