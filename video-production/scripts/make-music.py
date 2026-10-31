"""Create an original sectioned score locally; no sampled or third-party music.

Sections follow the measured chapter timeline in composition/src/data.json:
a tense pulse for the hook, sparse pads for context, a lift at the reveal,
a light rhythmic bed under the app demonstrations and a fuller close.
The render mix ducks this score under narration (see render.py).
"""
import json
import math
import pathlib
import wave
import numpy as np
from scipy.signal import butter, sosfilt

base = pathlib.Path(__file__).resolve().parent.parent
timeline = json.loads((base / 'composition' / 'src' / 'data.json').read_text(encoding='utf-8'))
seconds = float(timeline['duration'])
chapters = {c['id']: (float(c['start']), float(c['start']) + float(c['duration'])) for c in timeline['chapters']}
out = base / 'public' / 'audio' / 'music.wav'
out.parent.mkdir(parents=True, exist_ok=True)

sr = 44100
n = int(round(seconds * sr))
bpm = 96
beat = 60 / bpm
rng = np.random.default_rng(2026)

# Am – F – C – G, two bars each. The hook stays on Am – F for tension.
chords = [(220.0, 261.626, 329.628), (174.614, 220.0, 261.626), (130.813, 164.814, 195.998), (195.998, 246.942, 293.665)]
roots = [110.0, 87.307, 65.406, 97.999]
bar = 4 * beat
chord_len = 2 * bar

# Layer weights per chapter: pad, bass, arp, kick, hat, snare, overall gain.
weights = {
    '01-hook':       (0.75, 0.9, 0.0, 0.55, 0.0, 0.0, 0.95),
    '02-context':    (0.85, 0.4, 0.35, 0.0, 0.0, 0.0, 0.80),
    '03-problem':    (0.80, 0.55, 0.55, 0.30, 0.15, 0.0, 0.85),
    '04-introduce':  (1.00, 0.85, 0.85, 0.90, 0.70, 0.55, 1.00),
    '05-employer':    (0.60, 0.70, 0.75, 0.70, 0.60, 0.45, 0.85),
    '06-discover':    (0.60, 0.70, 0.75, 0.70, 0.60, 0.45, 0.85),
    '07-apply':       (0.60, 0.70, 0.75, 0.70, 0.60, 0.45, 0.85),
    '08-select':      (0.60, 0.70, 0.75, 0.70, 0.60, 0.45, 0.85),
    '09-agreement':   (0.60, 0.70, 0.75, 0.70, 0.60, 0.45, 0.85),
    '10-submit':      (0.60, 0.70, 0.75, 0.70, 0.60, 0.45, 0.85),
    '11-approve':     (0.60, 0.70, 0.75, 0.70, 0.60, 0.45, 0.85),
    '12-android':    (0.80, 0.80, 0.80, 0.80, 0.70, 0.55, 0.95),
    '13-difference': (0.90, 0.80, 0.80, 0.80, 0.70, 0.55, 0.95),
    '14-close':      (1.00, 0.80, 0.65, 0.60, 0.40, 0.30, 1.00),
}

# Piecewise-linear automation with 1.5 s crossfades at chapter boundaries.
points = []
for cid, (start, end) in chapters.items():
    w = weights.get(cid, weights['05-employer'])
    points.append((start + (0.75 if start > 0 else 0), w))
    points.append((end - 0.75, w))
times = np.array([p[0] for p in points])
table = np.array([p[1] for p in points])


def automation(index, t):
    return np.interp(t, times, table[:, index])


def chord_at(time):
    k = int(time // chord_len)
    if time < chapters['01-hook'][1]:
        return k % 2  # Am / F only during the hook
    return k % 4


left = np.zeros(n, dtype=np.float32)
right = np.zeros(n, dtype=np.float32)


def add(buffer, start_time, signal):
    i = int(round(start_time * sr))
    if i >= n or i + len(signal) <= 0:
        return
    j = min(n, i + len(signal))
    buffer[i:j] += signal[: j - i].astype(np.float32)


# Pad: detuned saw-like voices per chord, overlap-added with soft envelopes.
pad_l = np.zeros(n, dtype=np.float32)
pad_r = np.zeros(n, dtype=np.float32)
segments = math.ceil(seconds / chord_len)
tail = 1.2
for s in range(segments):
    t0 = s * chord_len
    length = int((chord_len + tail) * sr)
    t = np.arange(length) / sr
    env = np.minimum(t / 0.9, 1) * np.clip((chord_len + tail - t) / (tail + 0.3), 0, 1)
    sigl = np.zeros(length)
    sigr = np.zeros(length)
    for j, hz in enumerate(chords[chord_at(t0)]):
        for h in range(1, 6):
            sigl += np.sin(2 * np.pi * hz * h * 0.9985 * t + j) / h
            sigr += np.sin(2 * np.pi * hz * h * 1.0015 * t + j * 1.3) / h
    add(pad_l, t0, sigl * env)
    add(pad_r, t0, sigr * env)
lp = butter(2, 1400, 'low', fs=sr, output='sos')
pad_l = sosfilt(lp, pad_l).astype(np.float32) * 0.05
pad_r = sosfilt(lp, pad_r).astype(np.float32) * 0.05

bass = np.zeros(n, dtype=np.float32)
arp_l = np.zeros(n, dtype=np.float32)
arp_r = np.zeros(n, dtype=np.float32)
kick = np.zeros(n, dtype=np.float32)
hat = np.zeros(n, dtype=np.float32)
snare = np.zeros(n, dtype=np.float32)

kt = np.arange(int(0.4 * sr)) / sr
kick_hit = np.sin(2 * np.pi * (48 * kt + (110 - 48) * (1 - np.exp(-kt * 28)) / 28)) * np.exp(-kt * 9)
hp = butter(2, 7000, 'high', fs=sr, output='sos')
bp = butter(2, [1500, 4500], 'band', fs=sr, output='sos')
ht = np.arange(int(0.07 * sr)) / sr
st = np.arange(int(0.22 * sr)) / sr

eighths = int(seconds / (beat / 2)) + 1
for e in range(eighths):
    time = e * beat / 2
    c = chord_at(time)
    pos = e % 8  # eighth position within the bar
    # Bass: root on eighths with a driving pulse, octave lift on the "and" of 4.
    bt = np.arange(int(beat / 2 * sr)) / sr
    hz = roots[c] * (2 if pos == 7 else 1)
    note = (np.sin(2 * np.pi * hz * bt) + 0.35 * np.sin(4 * np.pi * hz * bt)) * np.exp(-bt * 4.5)
    add(bass, time, np.tanh(note * 1.6) * 0.32)
    # Arpeggio: chord tones up one or two octaves, alternating pan.
    at = np.arange(int(0.7 * sr)) / sr
    tone = chords[c][(e + c) % 3] * (2 if e % 4 < 2 else 4)
    pluck = (np.sin(2 * np.pi * tone * at) + 0.12 * np.sin(6 * np.pi * tone * at)) * np.exp(-at * 6) * 0.11
    add(arp_l if e % 2 else arp_r, time, pluck)
    add(arp_r if e % 2 else arp_l, time + 0.012, pluck * 0.45)
    if pos in (0, 4) or (pos == 5 and e % 16 == 13):
        add(kick, time, kick_hit * 0.55)
    if pos % 2 == 1:
        noise = sosfilt(hp, rng.standard_normal(len(ht))) * np.exp(-ht * 70)
        add(hat, time, noise * 0.09)
    if pos in (2, 6):
        noise = sosfilt(bp, rng.standard_normal(len(st))) * np.exp(-st * 22)
        add(snare, time, noise * 0.16)

# Gentle noise swells into the reveal and the closing chapter.
for cid in ('04-introduce', '14-close'):
    start = chapters[cid][0]
    rt = np.arange(int(2.5 * sr)) / sr
    swell = sosfilt(butter(2, [400, 6000], 'band', fs=sr, output='sos'), rng.standard_normal(len(rt))) * (rt / 2.5) ** 2 * 0.05
    add(left, start - 2.5, swell)
    add(right, start - 2.5, swell)

t = np.arange(n) / sr
mix_l = left.astype(np.float64)
mix_r = right.astype(np.float64)
for layer, (sl, sr_) in enumerate(((pad_l, pad_r), (bass, bass), (arp_l, arp_r), (kick, kick), (hat, hat * 0.8), (snare, snare))):
    gain = automation(layer, t)
    mix_l += sl * gain
    mix_r += sr_ * gain
overall = automation(6, t) * np.minimum(t / 1.5, 1) * np.clip((seconds - t) / 3.0, 0, 1)
mix = np.column_stack((mix_l, mix_r)) * overall[:, None]
mix *= 0.5 / np.max(np.abs(mix))
with wave.open(str(out), 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(sr)
    wav.writeframes(np.clip(mix * 32767, -32768, 32767).astype('<i2').tobytes())
print(json.dumps({'file': str(out), 'seconds': seconds, 'sample_rate': sr, 'bpm': bpm, 'composition': 'Connection - original procedural score (sectioned)', 'third_party_samples': False}))
