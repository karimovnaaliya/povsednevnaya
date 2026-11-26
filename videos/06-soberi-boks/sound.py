"""Soundtrack for 06-soberi-boks (18 s), synced to index.html.
    python3 videos/06-soberi-boks/sound.py out.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from audio_lib import Mix, tvec, note

m = Mix(18.0, seed=66)
TS = [2.4 + i * 1.45 for i in range(5)]

# ---- start: HUD + "game start" jingle, cards pop in, box rises ----
m.add(m.whoosh(0.5, 400, 3500), 0.0, 0.3, 0, rev=0.2)
for k, nm in enumerate(['C5', 'E5', 'G5', 'C6']):
    m.add(m.musicbox(note(nm), 1.0), 0.15 + k * 0.08, 0.2, -0.3 + 0.2 * k, rev=0.4)
for k in range(5):
    m.add(m.pop(500 + 70 * k), 0.5 + k * 0.12, 0.3, -0.5 + 0.25 * k, rev=0.15)
m.add(m.whoosh(0.6, 200, 2000), 0.6, 0.25, 0, rev=0.2)

# ---- music ----
m.music_loop(1.0, 8, gain=1.0)                           # 1..17 s

# ---- picks ----
COIN = [('B5', 'E6'), ('C6', 'F6'), ('D6', 'G6'), ('E6', 'A6'), ('G6', 'C7')]
for i, T in enumerate(TS):
    click = m.bandnoise(0.025, 3000, 10000) * np.exp(-tvec(0.025) * 300)
    m.add(click, T - 0.03, 0.5, 0.2, rev=0.05)          # tap
    m.add(m.pop(1100), T, 0.2, 0.2, rev=0.1)
    m.add(m.whoosh(0.6, 700, 5000), T + 0.1, 0.18, 0.1, rev=0.1)
    m.add(m.fwump(), T + 0.8, 0.5, 0, rev=0.1)           # lands in the box
    a, b = COIN[i]                                       # "+20%" coin
    m.add(m.bell(note(a), 0.5), T + 0.82, 0.22, 0.3, rev=0.3)
    m.add(m.bell(note(b), 1.2), T + 0.9, 0.24, 0.3, rev=0.4)

# ---- 100%: fanfare, confetti, lid, bow ----
m.sparkle(9.35, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7', 'E7'], 0.05, 0.2)
for nm in ['C4', 'G4', 'C5', 'E5']:
    m.add(m.bell(note(nm), 2.5), 9.5, 0.13, 0, rev=0.6)
d = 1.4; tt = tvec(d)                                    # confetti crackle
grains = (m.rng.random(len(tt)) < 0.0025).astype(float) * np.exp(-tt * 2)
grains = np.convolve(grains, np.exp(-np.arange(200) / 25), 'same')
m.add(m.bandnoise(d, 3000, 11000) * grains, 9.4, 0.5, 0, rev=0.2)
m.add(m.whoosh(0.3, 300, 2500), 9.6, 0.25, 0, rev=0.1)
m.add(m.thump(0.7), 9.85, 0.4, 0, rev=0.15)              # lid lands
m.add(m.rustle(0.3), 10.0, 0.3, 0, rev=0.2)
m.add(m.pop(600), 10.05, 0.35, 0, rev=0.2)               # bow

# ---- headline, price ----
m.add(m.whoosh(0.6, 300, 2500), 10.6, 0.2, 0, rev=0.2)   # box moves up
m.add(m.whoosh(0.5, 500, 3000), 11.25, 0.2, 0, rev=0.3)
m.add(m.thump(0.6), 12.05, 0.4, 0.5, rev=0.2)
m.sparkle(12.1, ['C6', 'G6', 'C7', 'E7'], 0.045, 0.2, 0.2, 0.8)

# ---- outro ----
m.sparkle(13.9, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 3.0), 14.5, 0.12, 0, rev=0.6)
m.add(m.pop(650), 15.85, 0.4, 0, rev=0.2)

m.write(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav')
