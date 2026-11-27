"""Soundtrack for 09-black-friday (16 s), synced to index.html.
    python3 videos/09-black-friday/sound.py out.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from audio_lib import Mix, SR, tvec, note, pluck

m = Mix(16.0, seed=99)


def kick():
    t = tvec(0.3)
    f = 48 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)


def clap():
    t = tvec(0.2)
    env = np.exp(-t * 30) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 40) * (t > 0.012)
    return m.bandnoise(0.2, 900, 5000) * env


def hat():
    t = tvec(0.06)
    return m.bandnoise(0.06, 7000, 14000) * np.exp(-t * 80)


def tap():
    t = tvec(0.05)
    return m.bandnoise(0.05, 200, 2500) * np.exp(-t * 90)


# ---- neon flicker + hum ----
d = 1.6; t = tvec(d)
gate = np.zeros_like(t)
for a, b, v in [(0.3, 0.38, 1), (0.5, 0.55, 1), (0.55, 0.7, 0.2), (0.7, 0.76, 1), (0.86, 1.6, 1)]:
    gate[(t >= a) & (t < b)] = v
gate *= np.minimum(1, (d - t) / 0.4)
hum = sum(np.sin(2 * np.pi * 100 * k * t) / k for k in range(1, 9))
m.add(hum * gate, 0, 0.3, 0, rev=0.2)
m.add(kick(), 0.86, 0.9, 0, rev=0.2)
for nm in ['C5', 'E5', 'G5', 'C6']:
    m.add(m.bell(note(nm), 1.5), 0.86, 0.12, 0, rev=0.5)
for tt in (0.3, 0.5, 0.7, 0.86):
    m.add(m.bandnoise(0.03, 2000, 9000) * np.exp(-tvec(0.03) * 200), tt, 0.4, 0, rev=0.1)
m.add(m.pop(900), 1.2, 0.3, 0, rev=0.2)                      # "скидки!"

# ---- groove 1.8–11.4 (128 bpm, C Am F G) ----
BEAT = 60 / 128
START, END = 1.8, 11.35
ROOTS = ['C2', 'A1', 'F1', 'G1']
CHORD = [['C5', 'E5', 'G5'], ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5']]
nb = int((END - START) / BEAT)
for b in range(nb):
    tt = START + b * BEAT
    bar, beat = divmod(b, 4)
    m.add(kick(), tt, 0.55, 0, rev=0.05)
    if beat in (1, 3):
        m.add(clap(), tt, 0.3, 0.1, rev=0.25)
    m.add(hat(), tt + BEAT / 2, 0.12, 0.4, rev=0.05)
    root = ROOTS[bar % 4]
    rf = note(root[:-1] + str(int(root[-1]) + 1))
    for h in (0, 0.5):
        m.add(pluck(rf, 0.3, bright=0.6, decay=0.99, seed=b), tt + h * BEAT, 0.35, 0, rev=0.05)
    tones = CHORD[bar % 4]
    for k in range(2):                                      # 8th-note arp
        nm = tones[(b * 2 + k) % 3]
        m.add(m.musicbox(note(nm), 0.6), tt + k * BEAT / 2, 0.1, 0.3 * (-1) ** k, rev=0.3)

# ---- mascot run-in, skid, wink ----
for k in range(8):
    m.add(tap(), 1.8 + k * 0.11, 0.35, 0.6 - 0.1 * k, rev=0.05)
d = 0.45; t = tvec(d)
screech = m.bandnoise(d, 1800, 5000) * np.exp(-t * 5) * (0.7 + 0.3 * np.sin(2 * np.pi * 45 * t))
m.add(screech, 2.6, 0.3, 0.2, rev=0.1)
m.add(m.bandnoise(0.5, 80, 700) * np.exp(-tvec(0.5) * 8), 2.75, 0.3, 0.3, rev=0.1)  # dust
m.add(m.bell(note('E7'), 0.8), 3.0, 0.2, 0.3, rev=0.4)       # wink "ting"

# ---- price tag ----
m.add(m.whoosh(0.35, 500, 4000), 3.4, 0.3, 0, rev=0.1)
m.add(m.bell(note('G4'), 0.8), 3.75, 0.25, 0, rev=0.3)        # clang
for tt, nm in [(3.8, 'C7'), (3.88, 'E7')]:                     # ka-ching
    m.add(m.bell(note(nm), 1.2), tt, 0.22, 0.2, rev=0.4)
m.add(m.bandnoise(0.15, 3000, 9000) * np.exp(-tvec(0.15) * 25), 3.78, 0.25, 0.2, rev=0.1)

# ---- lid pops, items fly out ----
m.add(m.pop(500), 4.4, 0.45, 0, rev=0.15)
for k in range(5):
    m.add(m.pop(600 + 80 * k), 4.5 + k * 0.14, 0.3, -0.6 + 0.3 * k, rev=0.15)
    m.add(m.bell(note(['C6', 'E6', 'G6', 'A6', 'C7'][k]), 1.0), 5.1 + k * 0.14, 0.12, -0.6 + 0.3 * k, rev=0.4)
m.add(m.pop(800), 6.6, 0.35, 0.5, rev=0.15)                   # "5 в 1"
m.sparkle(6.65, ['G6', 'C7', 'E7'], 0.05, 0.14, 0.3, 0.7)

# ---- alarm clock + УСПЕЙТЕ ----
m.add(m.whoosh(0.35, 400, 3000), 7.6, 0.3, -0.6, rev=0.1)
d = 3.35; t = tvec(d)
trill = (np.sin(2 * np.pi * 2300 * t) + 0.6 * np.sin(2 * np.pi * 3100 * t)) * (np.sin(2 * np.pi * 18 * t) > 0)
trill *= np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.1)
m.add(trill, 7.95, 0.07, -0.5, rev=0.15)
m.add(kick(), 7.9, 0.9, 0, rev=0.1)
m.add(m.whoosh(0.4, 200, 3000), 7.75, 0.3, 0, rev=0.1)
crash = m.bandnoise(1.5, 4000, 13000) * np.exp(-tvec(1.5) * 3)
m.add(crash, 7.9, 0.25, 0, rev=0.3)
k = 0
while 8.0 + k * 0.09 < 11.3:                                    # hurried feet
    m.add(tap(), 8.0 + k * 0.09, 0.18, 0.15 * (-1) ** k, rev=0.05)
    k += 1

# ---- outro (cozy) ----
m.add(m.whoosh(0.6, 300, 3000), 11.35, 0.25, 0, rev=0.3)
m.sparkle(11.5, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)
m.music_loop(11.6, 2, gain=1.1)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 3.0), 11.9, 0.12, 0, rev=0.6)
m.add(m.pop(600), 12.45, 0.35, 0, rev=0.2)
m.add(m.pop(650), 13.25, 0.4, 0, rev=0.2)

m.write(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav')
