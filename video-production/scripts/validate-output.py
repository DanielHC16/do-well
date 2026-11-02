"""Validate the actual export, never infer success from a renderer exit code."""
import argparse
import json
import pathlib
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--ffprobe", default="ffprobe")
parser.add_argument("--video", default="video-production/output/DO-WELL-UMAK-2026-FINAL.mp4")
parser.add_argument("--report", default="video-production/output/technical-qa.json")
args = parser.parse_args()
video = pathlib.Path(args.video).resolve()
if not video.is_file() or video.stat().st_size == 0:
    sys.exit(f"FAIL: expected nonempty final MP4 is missing: {video}")
result = subprocess.run([args.ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)], capture_output=True, text=True, check=True)
data = json.loads(result.stdout)
vs = next(s for s in data["streams"] if s["codec_type"] == "video")
aus = next(s for s in data["streams"] if s["codec_type"] == "audio")
duration = float(data["format"]["duration"])
numerator, denominator = map(int, vs["avg_frame_rate"].split("/"))
checks = {
    "duration_450_to_510_seconds": 450 <= duration <= 510,
    "resolution_1920x1080": (vs["width"], vs["height"]) == (1920, 1080),
    "frame_rate_30": numerator / denominator == 30,
    "h264": vs["codec_name"] == "h264",
    "aac": aus["codec_name"] == "aac",
    "widely_compatible_pixel_format": vs["pix_fmt"] == "yuv420p",
    "stereo": aus["channels"] == 2,
    "audio_video_duration_difference_under_0_15s": abs(float(vs["duration"]) - float(aus["duration"])) < .15,
}
report = {"video": str(video), "bytes": video.stat().st_size, "duration": duration, "checks": checks, "ffprobe": data}
pathlib.Path(args.report).write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({k: v for k, v in report.items() if k != "ffprobe"}, indent=2))
sys.exit(0 if all(checks.values()) else 1)
