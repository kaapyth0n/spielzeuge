"""Sounds for the second five Kuckuck guests: goat, donkey, goose, cuckoo, monkey.

Four are short cuts from free recordings on Wikimedia Commons (see public/sounds/CREDITS.md);
the monkey is an original synthesized toy "oo-oo-aa", not a recording.
Rebuild with Python + ffmpeg + curl: python3 scripts/kuckuck-guests-2.py
"""
import math
import struct
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'sounds'
COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/'

# file, source path on Commons, start s, end s, extra filter (clean the band around the call)
CUTS = {
    'goat': ('b/bc/Herd_of_goats_bleating.ogg', 2.9, 5.0, 'highpass=f=250,lowpass=f=5000'),
    'donkey': ('2/25/157763_felix-blume_a-donkey-is-braying-in-his-enclosure-in-south-of-france.wav', 6.35, 8.45,
               'highpass=f=200'),
    'goose': ('0/0e/Greylag_Goose_%28Anser_anser%29_-_B%C3%A6rum%2C_Norway_2021-04-03.mp3', 2.9, 4.5,
              'highpass=f=300'),
    # two clean "ku-ku" calls; the band filter drops the small birds singing behind the cuckoo
    'cuckoo': ('6/65/Cuculus_canorus_-_Common_Cuckoo_XC84060.mp3', 1.75, 4.2, 'highpass=f=350,lowpass=f=1300'),
}


def encode(src: Path, dst: Path, start: float | None, end: float | None, flt: str) -> None:
    length = (end - start) if start is not None and end is not None else None
    chain = [flt] if flt else []
    if length:
        chain.append(f'afade=t=in:d=0.04,afade=t=out:st={length - 0.12:.2f}:d=0.12')
    chain.append('loudnorm=I=-17:TP=-2:LRA=7')
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    if start is not None:
        cmd += ['-ss', str(start), '-t', str(length)]
    cmd += ['-i', str(src), '-af', ','.join(chain), '-ac', '1', '-ar', '44100',
            '-codec:a', 'libmp3lame', '-b:a', '96k', str(dst)]
    subprocess.run(cmd, check=True)


def monkey(path: Path) -> None:
    """A playful toy 'oo-oo-aa-aa': two soft low hoots, two brighter rising calls."""
    rate = 24000
    notes = [(0, .20, 330, 60), (.26, .20, 350, 60), (.56, .28, 520, 260), (.92, .30, 560, 300)]
    samples = [0.] * int((max(t + d for t, d, *_ in notes) + .1) * rate)
    for start, duration, frequency, glide in notes:
        phase = 0.
        for i in range(int(duration * rate)):
            t = i / rate
            phase += 2 * math.pi * (frequency + glide * t / duration) / rate
            envelope = math.sin(math.pi * t / duration) ** 1.2
            # a rounder vowel for "oo", more overtones for "aa"
            bright = 0.15 if frequency < 400 else 0.45
            tone = (math.sin(phase) + bright * math.sin(2 * phase) + bright / 3 * math.sin(3 * phase)) / 1.5
            samples[int(start * rate) + i] += .3 * envelope * tone
    with wave.open(str(path), 'wb') as f:
        f.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        f.writeframes(b''.join(struct.pack('<h', round(s * 32767)) for s in samples))


with tempfile.TemporaryDirectory() as tmp:
    for animal, (source, start, end, flt) in CUTS.items():
        raw = Path(tmp) / Path(source).name
        subprocess.run(['curl', '-sSL', '-A', 'spielzeuge-sounds/1.0', '-o', str(raw), COMMONS + source], check=True)
        encode(raw, OUT / f'{animal}.mp3', start, end, flt)
    wav = Path(tmp) / 'monkey.wav'
    monkey(wav)
    encode(wav, OUT / 'monkey.mp3', None, None, '')
