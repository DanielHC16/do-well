import { ZodError } from "zod";

import { NetworkTimeoutError } from "./network-timeout";

export type LoadErrorKind =
  "offline" | "timeout" | "unauthorized" | "server" | "invalid";

/** A read failure with a stable user-facing message and a machine-readable cause. */
export class LoadError extends Error {
  readonly kind: LoadErrorKind;

  constructor(kind: LoadErrorKind, message: string) {
    super(message);
    this.name = "LoadError";
    this.kind = kind;
  }
}

const OFFLINE_PATTERN =
  /network request failed|failed to fetch|network error|unable to resolve host|econnrefused|connection refused/i;
const UNAUTHORIZED_CODES = new Set(["PGRST301", "PGRST302", "42501"]);

function readField(error: object, key: string): unknown {
  return (error as Record<string, unknown>)[key];
}

export function classifyLoadError(error: unknown): LoadErrorKind {
  if (error instanceof LoadError) return error.kind;
  if (error instanceof NetworkTimeoutError) return "timeout";
  if (error instanceof ZodError) return "invalid";
  if (!error || typeof error !== "object") return "server";

  const message = readField(error, "message");
  const code = readField(error, "code");
  const status = readField(error, "status");
  if (typeof message === "string" && OFFLINE_PATTERN.test(message)) {
    return "offline";
  }
  if (
    (typeof code === "string" && UNAUTHORIZED_CODES.has(code)) ||
    status === 401 ||
    status === 403
  ) {
    return "unauthorized";
  }
  return "server";
}

export function toLoadError(error: unknown, message: string): LoadError {
  if (error instanceof LoadError) return error;
  return new LoadError(classifyLoadError(error), message);
}
