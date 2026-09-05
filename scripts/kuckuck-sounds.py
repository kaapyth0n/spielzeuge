"""Original quiet toy impressions, not wildlife recordings. Rebuild with Python + ffmpeg."""
import math
import random
import struct
import subprocess
import tempfile
import wave
from pathlib import Path

RATE = 24000
ROOT = Path(__file__).resolve().parents[1]
# start, duration, frequency, glide, breath: a little bark, trumpet, hoot, sniff, chirp.
VOICES = {
    'fox': [(0, .20, 530, -170, .13), (.30, .26, 620, -240, .12)],
    'elephant': [(0, .85, 220, 95, .04)],
    'owl': [(0, .34, 350, -30, .015), (.45, .60, 310, -40, .015)],
    'hedgehog': [(0, .17, 170, 0, .65), (.27, .17, 190, -30, .65), (.53, .22, 160, -20, .55)],
    'penguin': [(0, .24, 650, 200, .06), (.34, .32, 820, -350, .06)],
}
rng = random.Random(15)
for animal, notes in VOICES.items():
    samples = [0.] * int((max(t+d for t,d,*_ in notes) + .1) * RATE)
    for start, duration, frequency, glide, breath in notes:
        phase = 0
        for i in range(int(duration * RATE)):
            t = i / RATE
            phase += 2 * math.pi * (frequency + glide*t/duration + 9*math.sin(t*35)) / RATE
            envelope = math.sin(math.pi*t/duration) ** 1.4
            tone = (math.sin(phase) + .22*math.sin(phase*2) + .08*math.sin(phase*3)) / 1.3
            samples[int(start*RATE)+i] += .27*envelope*((1-breath)*tone+breath*rng.uniform(-1,1))
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp)/'voice.wav'
        with wave.open(str(wav), 'wb') as f:
            f.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            f.writeframes(b''.join(struct.pack('<h', round(s*32767)) for s in samples))
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '64k', str(ROOT/'public'/'sounds'/f'{animal}.mp3')], check=True)
