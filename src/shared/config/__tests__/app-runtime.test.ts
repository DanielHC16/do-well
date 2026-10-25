import { parseAppRuntime } from "../app-runtime";

describe("application runtime configuration", () => {
  it.each([
    [undefined, "production"],
    ["production", "production"],
    ["demo", "demo"],
  ] as const)("maps %p to %s", (input, expected) => {
    expect(parseAppRuntime(input)).toBe(expected);
  });

  it("rejects every unsupported runtime", () => {
    expect(() => parseAppRuntime("preview")).toThrow(
      "Public application runtime is invalid",
    );
  });
});
