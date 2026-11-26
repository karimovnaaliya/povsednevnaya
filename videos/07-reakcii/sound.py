"""Soundtrack for 07-reakcii (19.6 s), synced to index.html.
    python3 videos/07-reakcii/sound.py out.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from audio_lib import Mix, SR, tvec, note

m = Mix(19.6, seed=77)


def squeal(d=1.2, f0=900, f1=1700):
    """cartoon happy squeal: rising sine with fast vibrato + harmonics"""
    t = tvec(d)
    f = f0 + (f1 - f0) * np.minimum(1, t / (d * 0.35)) + 60 * np.sin(2 * np.pi * 11 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return s * np.minimum(1, t / 0.04) * np.minimum(1, (d - t) / 0.25)


def boing(d=0.35):
    t = tvec(d)
    f = 230 * (1 + 0.45 * np.sin(2 * np.pi * 16 * t) * np.exp(-t * 7))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)


def sniff(d=0.2):
    t = tvec(d)
    return m.bandnoise(d, 900, 3500) * (t / d) ** 2 * np.minimum(1, (d - t) / 0.02)


def bass_drop(d=1.0):
    t = tvec(d)
    f = 45 + 120 * np.exp(-t * 4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5) * np.minimum(1, t / 0.01)


S = [0, 1.6, 5.6, 9.8, 13.8]

# ---- music bed ----
m.music_loop(0.0, 8, gain=0.75)

# ---- scene 0 ----
m.sparkle(0.1, ['G5', 'C6', 'E6', 'G6'], 0.06, 0.15)
for tt, g in [(0.42, 0.8), (0.695, 0.35), (0.83, 0.15)]:
    m.add(m.thump(g), tt, 0.6, 0, rev=0.15)

# ---- transitions, pills, bubbles ----
for s0 in S[1:]:
    m.add(m.whoosh(0.5, 300, 4000), s0, 0.32, -0.3, rev=0.15)
for s0 in S[1:4]:
    m.add(m.pop(520), s0 + 0.3, 0.3, 0, rev=0.15)
for tt in [2.5, 4.1, 6.2, 8.0, 10.3, 10.8, 11.5]:
    m.add(m.pop(760), tt, 0.3, 0, rev=0.15)

# ---- scene 1: mom ----
m.add(m.whoosh(0.4, 600, 5000), 2.1, 0.3, 0.4, rev=0.2)
m.sparkle(2.3, ['E6', 'G6', 'C7'], 0.05, 0.14)
for tt in (2.7, 3.05, 3.4):
    m.add(sniff(), tt, 0.6, 0, rev=0.1)
for nm in ['F4', 'A4', 'C5']:                                  # "aww" chord
    m.add(m.bell(note(nm), 2.5), 2.45, 0.14, 0, rev=0.7)
m.add(m.whoosh(0.45, 600, 4000), 3.7, 0.25, 0, rev=0.2)
m.add(m.fwump(), 4.05, 0.5, 0, rev=0.1)
m.add(m.bell(note('C6'), 1.4), 4.08, 0.2, 0, rev=0.4)
for k in range(6):
    m.add(m.bell(note(['G6', 'E6', 'C7', 'A6', 'G6', 'E7'][k]), 0.8), 2.4 + k * 0.4, 0.09, -0.6 + 0.24 * k, rev=0.6)

# ---- scene 2: friend ----
m.add(squeal(1.3), 6.2, 0.28, 0, rev=0.25)
m.add(squeal(0.7, 1100, 1900), 8.0, 0.22, 0, rev=0.25)
n = 1
while 6.0 + 0.45 * n < 9.75:
    m.add(boing(), 6.0 + 0.45 * n, 0.22, (-1) ** n * 0.2, rev=0.1)
    n += 1
m.sparkle(6.25, ['C6', 'E6', 'G6', 'C7', 'E7'], 0.05, 0.12)

# ---- scene 3: colleague ----
for tt, nm, pn in [(10.3, 'C7', -0.6), (10.8, 'D7', 0.6)]:     # mugs "tink"
    m.add(m.bell(note(nm), 0.4), tt + 0.1, 0.16, pn, rev=0.2)
m.add(m.whoosh(0.3, 500, 4000), 12.15, 0.3, 0, rev=0.1)
m.add(bass_drop(), 12.42, 0.75, 0, rev=0.1)
m.sparkle(12.6, ['G6', 'C7', 'E7'], 0.07, 0.15)

# ---- scene 4 ----
for tt, g in [(14.39, 0.8), (14.68, 0.35), (14.83, 0.15)]:
    m.add(m.thump(g), tt, 0.5, 0, rev=0.15)
m.add(m.thump(0.5), 14.95, 0.4, 0.5, rev=0.2)
m.sparkle(15.0, ['C6', 'G6', 'C7', 'E7'], 0.045, 0.2, 0.2, 0.8)

# ---- outro ----
m.sparkle(16.1, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 3.0), 16.7, 0.12, 0, rev=0.6)
m.add(m.pop(650), 17.75, 0.4, 0, rev=0.2)

m.write(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav')
