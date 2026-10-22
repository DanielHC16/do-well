import appConfig from "../../app.config";

const secretShapedKey =
  /(api.?key|client.?secret|password|private.?key|service.?role|token)/i;

function collectSecretShapedKeys(value: unknown, path = "expo"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectSecretShapedKeys(item, `${path}[${index}]`),
    );
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPath = `${path}.${key}`;
    const currentMatch = secretShapedKey.test(key) ? [nextPath] : [];
    return [...currentMatch, ...collectSecretShapedKeys(nestedValue, nextPath)];
  });
}

describe("Expo application configuration", () => {
  it("uses the approved public application identity", () => {
    expect(appConfig.name).toBe("Do Well");
    expect(appConfig.slug).toBe("do-well");
    expect(appConfig.scheme).toBe("dowell");
    expect(appConfig.android?.package).toBe("com.anghulingpullrequest.dowell");
  });

  it("does not expose secret-shaped configuration fields", () => {
    expect(collectSecretShapedKeys(appConfig)).toEqual([]);
  });

  it("uses a Windows long-path-capable Android CMake toolchain", () => {
    expect(appConfig.plugins).toContainEqual([
      "expo-build-properties",
      {
        android: {
          cmakeVersion: "3.31.6",
        },
      },
    ]);
  });
});
