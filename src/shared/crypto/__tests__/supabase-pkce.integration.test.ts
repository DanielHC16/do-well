import { createClient } from "@supabase/supabase-js";

import { installSupabaseWebCrypto } from "../supabase-web-crypto";

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  getRandomValues: (
    value: Uint8Array<ArrayBuffer> | Uint32Array<ArrayBuffer>,
  ) => {
    value.fill(17);
    return value;
  },
  digest: async () => new Uint8Array(32).fill(29).buffer,
}));

describe("Supabase PKCE integration", () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");

  afterEach(() => {
    if (originalCrypto) {
      Object.defineProperty(globalThis, "crypto", originalCrypto);
    } else {
      Reflect.deleteProperty(globalThis, "crypto");
    }
  });

  it("installs missing capabilities and makes Supabase emit S256", async () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {},
      writable: true,
    });
    installSupabaseWebCrypto();
    const values = new Map<string, string>();
    const client = createClient(
      "https://project-ref.supabase.co",
      "sb_publishable_test-value",
      {
        auth: {
          flowType: "pkce",
          persistSession: true,
          storage: {
            getItem: async (key) => values.get(key) ?? null,
            setItem: async (key, value) => {
              values.set(key, value);
            },
            removeItem: async (key) => {
              values.delete(key);
            },
          },
        },
      },
    );

    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "do-well://auth/callback",
        skipBrowserRedirect: true,
      },
    });

    expect(error).toBeNull();
    expect(data.url).not.toBeNull();
    const authorizationUrl = new URL(data.url!);
    expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe(
      "s256",
    );
    expect(authorizationUrl.searchParams.get("code_challenge")).not.toBeNull();
  });
});
