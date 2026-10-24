import { createSupabaseCrypto } from "../supabase-web-crypto";

describe("Supabase WebCrypto capabilities", () => {
  it("provides secure randomness and SHA-256 digest for S256 PKCE", async () => {
    const expectedDigest = new Uint8Array([1, 2, 3]).buffer;
    const getRandomValues = jest.fn(
      (value: Uint8Array<ArrayBuffer> | Uint32Array<ArrayBuffer>) => {
        value.fill(7);
        return value;
      },
    );
    const digest = jest.fn(async () => expectedDigest);
    const crypto = createSupabaseCrypto(undefined, {
      getRandomValues,
      digest,
    });
    const random = new Uint8Array(4);

    expect(crypto.getRandomValues(random)).toEqual(
      new Uint8Array([7, 7, 7, 7]),
    );
    await expect(
      crypto.subtle.digest("SHA-256", new Uint8Array([9])),
    ).resolves.toBe(expectedDigest);
    expect(digest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
  });

  it("rejects unsupported digest algorithms instead of silently weakening PKCE", async () => {
    const crypto = createSupabaseCrypto(undefined, {
      getRandomValues: (value) => value,
      digest: jest.fn(),
    });

    await expect(
      crypto.subtle.digest("SHA-1", new Uint8Array([1])),
    ).rejects.toThrow("Only SHA-256 is supported");
  });

  it("fills missing randomness when an existing crypto object only has subtle crypto", () => {
    const subtle = {
      digest: jest.fn(async () => new ArrayBuffer(32)),
    };
    const getRandomValues = jest.fn(
      (value: Uint8Array<ArrayBuffer> | Uint32Array<ArrayBuffer>) => {
        value.fill(11);
        return value;
      },
    );
    const crypto = createSupabaseCrypto(
      { subtle },
      {
        getRandomValues,
        digest: jest.fn(),
      },
    );
    const random = new Uint32Array(2);

    expect(crypto.getRandomValues(random)).toEqual(new Uint32Array([11, 11]));
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });
});
