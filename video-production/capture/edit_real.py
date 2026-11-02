"""Cut the real hosted-app ADB recordings into per-shot edit clips.

Each clip is a list of (take, start_s, end_s, speed) segments from
public/footage/real/. Only authentic frames are used: waits and typing are
sped up, unrelated stretches are skipped, and the last real frame is held.
"""
from pathlib import Path
import json
import subprocess

root = Path(__file__).resolve().parent.parent
bin_dir = root / 'tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin'
src = root / 'public/footage/real'
out = root / 'public/footage/edit'
out.mkdir(parents=True, exist_ok=True)

CLIPS = {
    'e04b': [('r01-employer-create', 0, 5, 1), ('r12-discover-hub', 0, 7, 1)],
    'e05a': [('r01-employer-create', 0, 6, 1.5), ('r01-employer-create', 8, 44, 3)],
    'e05b': [('r01-employer-create', 46, 72, 2.6)],
    'e05c': [('r01-employer-create', 72, 78, 1.2), ('r01-employer-create', 80, 104, 5), ('r01-employer-create', 104, 121, 1.2)],
    'e06a': [('r02-worker-discover', 0, 22, 3)],
    'e06b': [('r02-worker-discover', 26, 44, 3), ('r02-worker-discover', 46, 52, 1.5), ('r02-worker-discover', 60, 67, 1)],
    'e06c': [('r12-discover-hub', 6, 26, 1), ('r12-discover-hub', 28, 40, 1.5)],
    'e07a': [('r03-worker-apply', 0, 4, 1), ('r03-worker-apply', 4, 26, 2.6)],
    'e07b': [('r03-worker-apply', 26, 34, 1), ('r03-worker-apply', 120, 134, 1)],
    'e08a': [('r04-employer-select', 0, 6, 2), ('r04-employer-select', 8, 24, 4), ('r04-employer-select', 26, 30, 1), ('r04-employer-select', 38, 41, 1)],
    # Stops at 109 s: the take later shows the pre-fix agreement error screen.
    'e08b': [('r04-employer-select', 66, 72, 1), ('r04-employer-select', 72, 98, 3), ('r04-employer-select', 98, 110, 1)],
    'e09a': [('r06-worker-accept', 8, 13, 1), ('r06-worker-accept', 82, 88, 3), ('r06-worker-accept', 108, 124, 2.2)],
    'e09b': [('r07-employer-milestones', 16, 48, 3), ('r07-employer-milestones', 48, 92, 8), ('r07-employer-milestones', 92, 110, 1.2)],
    'e10a': [('r08-worker-submit', 0, 10, 3.3), ('r08-worker-submit', 22, 46, 3.5)],
    # Ends on the camera permission prompt; the emulator's test-pattern camera is not used.
    'e10b': [('r08-worker-submit', 50, 82, 2.5), ('r08-worker-submit', 82, 96, 1.2)],
    'e11a': [('r10-employer-approve', 8, 12, 1), ('r10-employer-approve', 22, 32, 1.5)],
    'e11b': [('r10-employer-approve', 62, 74, 3), ('r10-employer-approve', 74, 98, 4.5), ('r10-employer-approve', 98, 110, 1.2), ('r10-employer-approve', 126, 134, 1.6)],
    'e12a': [('r09-offline', 0, 14, 1), ('r09-offline', 44, 48, 1)],
    'e12b': [('r11-worker-complete', 18, 28, 1.5), ('r11-worker-complete', 36, 44, 1), ('r11-worker-complete', 58, 64, 1.5)],
}
HOLD = 3

manifest = []
for name, segments in CLIPS.items():
    takes = sorted({t for t, *_ in segments})
    inputs = []
    for t in takes:
        inputs += ['-i', str(src / f'{t}.mp4')]
    parts = []
    for i, (take, start, end, speed) in enumerate(segments):
        idx = takes.index(take)
        parts.append(f'[{idx}:v]trim=start={start}:end={end},setpts=(PTS-STARTPTS)/{speed},fps=30,scale=720:1600,setsar=1[s{i}]')
    labels = ''.join(f'[s{i}]' for i in range(len(segments)))
    graph = ';'.join(parts) + f';{labels}concat=n={len(segments)}:v=1:a=0,tpad=stop_mode=clone:stop_duration={HOLD},format=yuv420p[v]'
    target = out / f'{name}.mp4'
    subprocess.run([str(bin_dir / 'ffmpeg.exe'), '-hide_banner', '-loglevel', 'error', '-y', *inputs,
                    '-filter_complex', graph, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '19',
                    '-preset', 'veryfast', '-threads', '2', '-movflags', '+faststart', str(target)], check=True)
    duration = float(json.loads(subprocess.check_output([str(bin_dir / 'ffprobe.exe'), '-v', 'error', '-show_entries',
                                                         'format=duration', '-of', 'json', str(target)]))['format']['duration'])
    manifest.append({'name': name, 'segments': [{'take': t, 'start': s, 'end': e, 'speed': sp} for t, s, e, sp in segments],
                     'held_final_frame_s': HOLD, 'edit_duration': round(duration, 3)})
    print(name, round(duration, 1), flush=True)

(root / 'capture/edit-real-manifest.json').write_text(json.dumps(
    {'policy': 'Authentic frames from the hosted-app recordings only; speed-ups and cuts, final real frame held.',
     'clips': manifest}, indent=2), encoding='utf-8')
