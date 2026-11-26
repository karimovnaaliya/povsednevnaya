"""Soundtrack for 02-holodno-teplo (18 s), synced to index.html.
    python3 videos/02-holodno-teplo/sound.py out.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from audio_lib import Mix, SR, tvec, note

m = Mix(18.0, seed=21)
ITEM_LANDS = [5.9 + i for i in range(5)]


def warmth(t):
    s = 0
    for land in ITEM_LANDS:
        p = np.clip((t - (land - 0.1)) / 0.7, 0, 1)
        s += 0.2 * p
    return s


# ---- cold part ----
# howling wind, fades as the hero gets warmer
d = 11.5
t = tvec(d)
howl = m.bandnoise(d, 180, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t) * np.sin(2 * np.pi * 0.13 * t + 1))
howl += 0.5 * m.bandnoise(d, 1500, 5000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t + 2)) ** 2
howl *= (1 - warmth(t)) ** 1.6 * np.minimum(1, t / 0.3)
m.add(howl, 0, 0.9, 0, rev=0.1)

# teeth chattering 0.9–2.8
for k in range(int(1.9 * 14)):
    tt = 0.9 + k / 14 + m.rng.uniform(-0.01, 0.01)
    click = m.bandnoise(0.03, 2500, 9000) * np.exp(-tvec(0.03) * 260)
    m.add(click, tt, 0.55 * (0.7 + 0.3 * np.sin(k)), 0.15, rev=0.05)

# sad sparse music box in A minor
for tt, nm in [(0.3, 'A4'), (1.05, 'C5'), (1.8, 'E5'), (2.55, 'D5'), (3.3, 'C5'), (4.05, 'B4')]:
    m.add(m.musicbox(note(nm), 2.0), tt, 0.14, 0, rev=0.8)

# ---- parcel arrives ----
m.add(m.whoosh(0.7, 300, 3000), 3.1, 0.4, 0.5, rev=0.2)
for tt, g in [(3.491, 1.0), (3.782, 0.45), (3.927, 0.2)]:
    m.add(m.thump(g), tt, 0.8, 0.4, rev=0.15)
m.add(m.bell(note('E5'), 2.0), 3.95, 0.3, 0.3, rev=0.5)   # ding
m.add(m.bell(note('C5'), 2.5), 4.25, 0.3, 0.3, rev=0.5)   # dong
m.add(m.rustle(0.35), 4.3, 0.35, 0.4, rev=0.2)
m.add(m.whoosh(0.5, 600, 5000), 4.55, 0.35, 0.6, rev=0.3)
m.sparkle(4.7, ['E6', 'G6', 'C7'], 0.05, 0.14)

# ---- warm music starts with the first item ----
m.music_loop(5.0, 6)                                       # 5..17 s

ITEM_NOTES = ['C5', 'E5', 'G5', 'A5', 'C6']
for i, nm in enumerate(ITEM_NOTES):
    s0 = 5.0 + i
    m.add(m.pop(420 + 60 * i), s0, 0.4, 0.4, rev=0.15)
    m.add(m.whoosh(0.6, 800, 5000), s0, 0.14, 0.2 - 0.15 * i, rev=0.1)
    m.add(m.fwump(), s0 + 0.88, 0.5, 0, rev=0.1)           # put on
    m.add(m.bell(note(nm), 1.6), s0 + 0.9, 0.22, -0.3 + 0.15 * i, rev=0.5)

# ---- warm finale ----
m.sparkle(10.15, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.05, 0.18)
for k in range(7):                                          # hearts
    m.add(m.bell(note(['G6', 'C7', 'E6', 'A6', 'D7', 'G6', 'C7'][k]), 1.0), 10.25 + k * 0.32, 0.07,
          -0.6 + 0.2 * k, rev=0.6)
m.add(m.whoosh(0.5, 500, 3000), 11.6, 0.2, 0, rev=0.3)
m.add(m.thump(0.6), 12.35, 0.6, 0.5, rev=0.2)
m.sparkle(12.4, ['C6', 'G6', 'C7', 'E7'], 0.045, 0.2, 0.2, 0.8)

# ---- outro ----
m.sparkle(14.1, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 3.0), 14.7, 0.12, 0, rev=0.6)
m.add(m.pop(650), 16.05, 0.4, 0, rev=0.2)

m.write(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav')
