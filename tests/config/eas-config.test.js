const easConfig = require("../../eas.json");

describe("EAS build configuration", () => {
  it("keeps development and preview builds internal and installable", () => {
    expect(easConfig.build.development).toMatchObject({
      developmentClient: true,
      distribution: "internal",
    });
    expect(easConfig.build.preview).toMatchObject({
      distribution: "internal",
      android: {
        buildType: "apk",
      },
    });
  });

  it("does not configure production builds or submission", () => {
    expect(easConfig.build.production).toBeUndefined();
    expect(easConfig.submit).toBeUndefined();
  });
});
