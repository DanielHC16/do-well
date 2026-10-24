import * as ExpoCrypto from "expo-crypto";

type RandomArray = Uint8Array<ArrayBuffer> | Uint32Array<ArrayBuffer>;

type RandomValues = (value: RandomArray) => RandomArray;

type CryptoPort = Readonly<{
  getRandomValues: RandomValues;
  digest: (algorithm: "SHA-256", data: BufferSource) => Promise<ArrayBuffer>;
}>;

type ExistingCrypto = Readonly<{
  getRandomValues?: RandomValues;
  subtle?: Pick<SubtleCrypto, "digest">;
}>;

export type SupabaseCrypto = Readonly<{
  getRandomValues: RandomValues;
  subtle: Pick<SubtleCrypto, "digest">;
}>;

function algorithmName(algorithm: AlgorithmIdentifier): string {
  return typeof algorithm === "string" ? algorithm : algorithm.name;
}

export function createSupabaseCrypto(
  existing: ExistingCrypto | undefined,
  port: CryptoPort,
): SupabaseCrypto {
  const existingRandomValues = existing?.getRandomValues;
  const getRandomValues: RandomValues = existingRandomValues
    ? (value) => existingRandomValues(value)
    : (value) => port.getRandomValues(value);

  return {
    getRandomValues,
    subtle:
      existing?.subtle ??
      Object.freeze({
        digest: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
          if (algorithmName(algorithm).toUpperCase() !== "SHA-256") {
            throw new Error(
              "Only SHA-256 is supported by this crypto adapter.",
            );
          }
          return port.digest("SHA-256", data);
        },
      }),
  };
}

const expoCryptoPort: CryptoPort = {
  getRandomValues: (value) => {
    ExpoCrypto.getRandomValues(value);
    return value;
  },
  digest: (_algorithm, data) =>
    ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data),
};

export function installSupabaseWebCrypto(): void {
  const current =
    typeof globalThis.crypto === "object" ? globalThis.crypto : undefined;
  const hasRandomValues = typeof current?.getRandomValues === "function";
  if (hasRandomValues && current?.subtle) return;

  const capabilities = createSupabaseCrypto(
    current && hasRandomValues
      ? {
          getRandomValues: (value) => {
            current.getRandomValues(value);
            return value;
          },
        }
      : undefined,
    expoCryptoPort,
  );

  if (current) {
    if (!hasRandomValues) {
      Object.defineProperty(current, "getRandomValues", {
        configurable: true,
        value: capabilities.getRandomValues,
      });
    }
    if (!current.subtle) {
      // This is intentionally a Supabase-only compatibility surface, not a
      // complete WebCrypto polyfill. Audit before adding another subtle user.
      Object.defineProperty(current, "subtle", {
        configurable: true,
        value: capabilities.subtle,
      });
    }
    return;
  }

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: capabilities,
    writable: true,
  });
}
