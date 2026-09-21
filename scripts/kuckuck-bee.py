"""Original toy wing-buzz for the bee. Not a field recording. Requires ffmpeg."""
import math
import random
import struct
import subprocess
import tempfile
import wave
from pathlib import Path

RATE = 24000
DURATION = 0.95
ROOT = Path(__file__).resolve().parents[1]
rng = random.Random(7)
samples = []
phase = 0.0
for i in range(int(DURATION * RATE)):
    t = i / RATE
    envelope = math.sin(math.pi * t / DURATION) ** 1.1
    wing = 0.55 + 0.45 * math.sin(2 * math.pi * 32 * t)
    frequency = 210 + 18 * math.sin(2 * math.pi * 3.5 * t)
    phase += 2 * math.pi * frequency / RATE
    tone = math.sin(phase) * 0.55 + math.sin(phase * 2) * 0.25 + rng.uniform(-1, 1) * 0.22
    samples.append(0.55 * envelope * wing * tone)
peak = max(abs(sample) for sample in samples)
scale = (10 ** (-3 / 20)) / peak
out = ROOT / 'public' / 'sounds' / 'bee.mp3'
with tempfile.TemporaryDirectory() as tmp:
    wav = Path(tmp) / 'bee.wav'
    with wave.open(str(wav), 'wb') as handle:
        handle.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        handle.writeframes(b''.join(
            struct.pack('<h', max(-32767, min(32767, round(sample * scale * 32767))))
            for sample in samples
        ))
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
        '-af', 'afade=t=in:st=0:d=0.03,afade=t=out:st=0.86:d=0.08',
        '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', str(out),
    ], check=True)
