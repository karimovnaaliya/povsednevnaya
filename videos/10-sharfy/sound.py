"""Soundtrack for 10-sharfy (17 s), synced to index.html.
    python3 videos/10-sharfy/sound.py out.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from audio_lib import Mix, tvec, note

m = Mix(17.0, seed=110)

# ---- grey world: wind + sad music box ----
d = 4.4; t = tvec(d)
wind = m.bandnoise(d, 200, 1500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))
wind *= np.minimum(1, t / 0.3) * np.clip((4.4 - t) / 1.0, 0, 1)
m.add(wind, 0, 0.7, 0, rev=0.1)
for tt, nm in [(0.3, 'A4'), (1.0, 'C5'), (1.7, 'E5'), (2.4, 'D5')]:
    m.add(m.musicbox(note(nm), 2.0), tt, 0.16, 0, rev=0.8)
m.add(m.whoosh(0.4, 400, 3000), 0.15, 0.15, 0, rev=0.2)

# ---- red scarf flies in and lands ----
m.add(m.whoosh(1.0, 300, 5000), 2.3, 0.4, 0.6, rev=0.2)
m.add(m.fwump(), 3.28, 0.6, 0, rev=0.1)
m.add(m.pop(520), 3.3, 0.35, 0, rev=0.15)
m.sparkle(3.3, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.05, 0.2)   # colour bloom
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 2.5), 3.35, 0.12, 0, rev=0.6)
for k in range(9):
    m.add(m.bell(note(['G6', 'C7', 'E6', 'A6', 'D7', 'G6', 'C7', 'E7', 'A6'][k]), 0.8), 3.35 + k * 0.08, 0.06, -0.8 + 0.2 * k, rev=0.5)

# ---- warm music from the moment colour returns ----
m.music_loop(3.3, 6)                                  # 3.3 .. 15.3 + ring

m.add(m.pop(800), 3.4, 0.3, 0, rev=0.15)              # title
m.add(m.pop(600), 4.2, 0.25, 0, rev=0.15)             # label

# ---- spin + swap to burgundy ----
m.add(m.whoosh(0.6, 500, 6000), 7.0, 0.4, 0, rev=0.2)
m.add(m.rustle(0.3), 7.25, 0.4, 0, rev=0.2)
m.sparkle(7.6, ['A5', 'C6', 'E6', 'A6'], 0.06, 0.17)
m.add(m.pop(760), 7.6, 0.3, 0, rev=0.15)
m.add(m.pop(600), 8.0, 0.25, 0, rev=0.15)

# ---- showcase ----
m.add(m.whoosh(0.5, 300, 4000), 10.4, 0.32, -0.4, rev=0.15)
m.add(m.pop(600), 11.0, 0.35, -0.4, rev=0.15)
m.add(m.pop(760), 11.3, 0.35, 0.4, rev=0.15)
m.add(m.bell(note('E6'), 1.0), 11.75, 0.18, -0.5, rev=0.4)
m.add(m.bell(note('G6'), 1.0), 12.15, 0.18, 0.5, rev=0.4)

# ---- outro ----
m.add(m.whoosh(0.5, 300, 3000), 13.35, 0.25, 0, rev=0.3)
m.sparkle(13.5, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 3.0), 13.8, 0.12, 0, rev=0.6)
m.add(m.pop(700), 14.15, 0.35, 0, rev=0.2)
m.add(m.pop(650), 14.95, 0.4, 0, rev=0.2)

m.write(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav')
