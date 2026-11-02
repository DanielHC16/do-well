const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

describe("video preparation", () => {
  let workspace;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "do-well-video-"));
    fs.mkdirSync(path.join(workspace, "scripts"));
    fs.copyFileSync(
      path.resolve(__dirname, "../../video-production/scripts/prepare.mjs"),
      path.join(workspace, "scripts/prepare.mjs"),
    );
    fs.writeFileSync(
      path.join(workspace, "script.json"),
      JSON.stringify({
        duration: 450,
        chapters: [
          {
            id: "demo",
            duration: 450,
            lang: "en",
            narration: "A disclosed offline demonstration.",
            beats: [{ at: 0, title: "Demo" }],
          },
        ],
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("writes subtitles and composition data without pre-existing output directories", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(workspace, "scripts/prepare.mjs")],
      { encoding: "utf8", timeout: 10000 },
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(
      fs.readFileSync(
        path.join(workspace, "output/DO-WELL-UMAK-2026-EN.srt"),
        "utf8",
      ),
    ).toContain("A disclosed offline demonstration.");
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(workspace, "composition/src/data.json"),
          "utf8",
        ),
      ).duration,
    ).toBe(450);
  });

  it("pads an unmeasured short draft to the minimum composition length", () => {
    const scriptPath = path.join(workspace, "script.json");
    const script = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
    script.duration = 426;
    script.chapters[0].duration = 426;
    fs.writeFileSync(scriptPath, JSON.stringify(script));

    const result = spawnSync(
      process.execPath,
      [path.join(workspace, "scripts/prepare.mjs")],
      {
        encoding: "utf8",
        timeout: 10000,
      },
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const data = JSON.parse(
      fs.readFileSync(
        path.join(workspace, "composition/src/data.json"),
        "utf8",
      ),
    );
    expect(data.duration).toBe(450);
    expect(data.chapters[0].duration).toBe(450);
    expect(data.shots.at(-1).from + data.shots.at(-1).frames).toBe(450 * 30);
  });
});
