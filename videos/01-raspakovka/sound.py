"""Synthesize the soundtrack for 01-raspakovka (17 s): music-box Christmas
loop + sound effects timed to the animation in index.html.
Pure numpy, original music, no samples -> no copyright issues.

    python3 videos/01-raspakovka/sound.py out.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 17.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)            # dry mix
RL = np.zeros(N); RR = np.zeros(N)          # reverb send


def add(sig, t0, gain=1.0, pan=0.0, rev=0.3):
    """Place mono signal at time t0 (s) with pan -1..1 and reverb send."""
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i0:i0 + len(sig)] += sig * gain * gl
    R[i0:i0 + len(sig)] += sig * gain * gr
    RL[i0:i0 + len(sig)] += sig * gain * gl * rev
    RR[i0:i0 + len(sig)] += sig * gain * gr * rev


def tvec(d):
    return np.arange(int(d * SR)) / SR


def bandnoise(d, lo, hi):
    n = int(d * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n)
    return x / (np.abs(x).max() + 1e-9)


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    n = names[name[0]] + (int(name[-1]) - 4) * 12
    return 440 * 2 ** (n / 12)


# ---------------- instruments ----------------
def musicbox(f, d=1.6):
    t = tvec(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2)
         + 0.35 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 9)
         + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 16))
    s *= np.minimum(1, t / 0.003)
    return s


def bell(f, d=2.5):
    t = tvec(d)
    parts = [(1, 1, 1.6), (2.0, .5, 2.4), (2.76, .35, 3.5), (5.4, .18, 6), (8.9, .08, 9)]
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in parts)
    return s * np.minimum(1, t / 0.002)


def pad(freqs, d):
    t = tvec(d)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.6, 0.6):
            ff = f + det
            s += np.sin(2 * np.pi * ff * t) + 0.25 * np.sin(2 * np.pi * 2 * ff * t)
    env = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.6)
    return s * env / (len(freqs) * 2)


def pop(f=500):
    t = tvec(0.18)
    freq = f * (1 + 1.4 * np.exp(-t * 60))
    s = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 28)
    return s + 0.15 * bandnoise(0.18, 2000, 7000) * np.exp(-t * 120)


def thump(gain=1.0):
    t = tvec(0.45)
    freq = 42 + 70 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 11)
    s += 0.35 * bandnoise(0.45, 80, 900) * np.exp(-t * 30)  # cardboard
    return s * gain


def whoosh(d, lo=250, hi=3500):
    t = tvec(d)
    env = np.sin(np.pi * t / d) ** 2
    return bandnoise(d, lo, hi) * env


def rustle(d):
    t = tvec(d)
    grains = (rng.random(len(t)) < 0.004).astype(float)
    grains = np.convolve(grains, np.exp(-np.arange(300) / 40), 'same')
    return bandnoise(d, 1500, 8000) * grains * np.sin(np.pi * t / d)


def sleigh(d=0.35):
    t = tvec(d)
    jingle = 0.6 + 0.4 * np.sin(2 * np.pi * 18 * t)
    return bandnoise(d, 5000, 12000) * np.exp(-t * 12) * jingle


def sparkle(t0, notes, step=0.06, gain=0.25, pan_from=-0.6, pan_to=0.6):
    for k, nm in enumerate(notes):
        p = pan_from + (pan_to - pan_from) * k / max(1, len(notes) - 1)
        add(bell(note(nm), 1.8), t0 + k * step, gain, p, rev=0.6)


# ---------------- music (C major, 120 bpm) ----------------
CHORDS = [('C', ['C4', 'E4', 'G4', 'C5'], 'C3'),
          ('Am', ['A3', 'C4', 'E4', 'A4'], 'A2'),
          ('F', ['F3', 'A3', 'C4', 'F4'], 'F2'),
          ('G', ['G3', 'B3', 'D4', 'G4'], 'G2')]
PATTERN = [0, 1, 2, 3, 2, 1, 2, 3]           # eighth notes over 2 s
EIGHTH = 0.25
MUSIC_END = 16.0

for bar in range(8):                          # 8 chords x 2 s = 16 s
    _, tones, bass = CHORDS[bar % 4]
    t0 = bar * 2.0
    add(pad([note(x) for x in tones[:3]], 2.2), t0, 0.09, 0, rev=0.5)
    add(musicbox(note(bass) * 2, 2.0), t0, 0.16, 0, rev=0.3)
    for k, idx in enumerate(PATTERN):
        nm = tones[idx]
        oct_up = nm[:-1] + str(int(nm[-1]) + 1)          # music box sits high
        add(musicbox(note(oct_up)), t0 + k * EIGHTH, 0.13, 0.25 * (-1) ** k, rev=0.45)
    for beat in (0.5, 1.5):                               # sleigh on 2 & 4
        add(sleigh(), t0 + beat, 0.05, 0.4, rev=0.2)

# final chord rings out
add(pad([note('C4'), note('E4'), note('G4')], 1.0), MUSIC_END, 0.08, 0, rev=0.6)
for k, nm in enumerate(['C5', 'E5', 'G5', 'C6']):
    add(musicbox(note(nm), 1.2), MUSIC_END + k * 0.03, 0.12, -0.3 + 0.2 * k, rev=0.7)

# ---------------- sound effects (synced to index.html) ----------------
sparkle(0.2, ['G5', 'C6', 'E6', 'G6', 'C7'], 0.07, 0.18)          # title
add(whoosh(0.5, 300, 2500), 2.1, 0.35, 0, rev=0.2)                  # box falls
for tt, g in [(2.564, 1.0), (2.927, 0.45), (3.109, 0.2)]:           # bounces
    add(thump(g), tt, 0.85, 0, rev=0.15)
add(rustle(0.4), 3.2, 0.35, 0.1, rev=0.2)                           # bow wiggle
add(whoosh(0.35, 1500, 7000), 3.5, 0.3, 0.3, rev=0.2)               # ribbon pulled
add(whoosh(0.7, 400, 4000), 3.85, 0.4, 0.6, rev=0.3)                # lid flies off
sparkle(4.0, ['E6', 'G6', 'C7'], 0.05, 0.12)

ITEM_NOTES = ['C5', 'E5', 'G5', 'A5', 'C6']                         # rising per item
for i, nm in enumerate(ITEM_NOTES):
    s0 = 5.0 + i * 1.0
    add(pop(420 + 60 * i), s0, 0.45, -0.3 + 0.15 * i, rev=0.15)     # pops out
    add(whoosh(0.5, 800, 5000), s0, 0.12, -0.2 + 0.1 * i, rev=0.1)
    add(bell(note(nm), 1.6), s0 + 0.85, 0.2, -0.4 + 0.2 * i, rev=0.5)  # lands

add(whoosh(0.5, 500, 3000), 10.1, 0.2, 0, rev=0.3)                  # headline
add(thump(0.6), 10.95, 0.6, 0.5, rev=0.2)                           # price stamp
sparkle(11.0, ['C6', 'G6', 'C7', 'E7'], 0.045, 0.2, 0.2, 0.8)       # "ka-ching"
sparkle(12.9, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)  # transition
for nm in ['C4', 'E4', 'G4', 'C5']:                                 # logo chord
    add(bell(note(nm), 3.0), 13.5, 0.12, 0, rev=0.6)
add(pop(650), 14.85, 0.4, 0, rev=0.2)                               # CTA button

# ---------------- reverb + master ----------------
ir_t = tvec(1.8)
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2)
ir[:int(0.02 * SR)] = 0


def conv(x, h):
    n = len(x) + len(h)
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(h, n), n)[:len(x)]
    return y


wetL = conv(RL, ir); wetR = conv(RR, ir * np.roll(np.ones_like(ir), 0))
wetL /= np.abs(wetL).max() + 1e-9; wetR /= np.abs(wetR).max() + 1e-9
dry_peak = max(np.abs(L).max(), np.abs(R).max())
outL = L / dry_peak + 0.22 * wetL
outR = R / dry_peak + 0.22 * wetR

t = np.arange(N) / SR
fade = np.minimum(1, t / 0.15) * np.minimum(1, (DUR - t) / 0.6)
out = np.stack([outL, outR], 1) * fade[:, None]
out = np.tanh(out * 1.1)
out *= 0.89 / np.abs(out).max()                # ~ -1 dBFS

pcm = (out * 32767).astype('<i2')
path = sys.argv[1] if len(sys.argv) > 1 else 'sound.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', path)
