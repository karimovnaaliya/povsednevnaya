"""Soundtrack for 03-tainyi-santa (18 s), synced to index.html.
    python3 videos/03-tainyi-santa/sound.py out.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from audio_lib import Mix, tvec, note, pluck

m = Mix(18.0, seed=33)

# ---- chat intro ----
m.add(m.pad([note('D3'), note('F3'), note('A3')], 3.8), 0, 0.06, 0, rev=0.6)
for tt in (0.3, 0.9):                                   # incoming message
    m.add(m.bell(note('G6'), 0.6), tt, 0.22, -0.3, rev=0.3)
    m.add(m.bell(note('C7'), 0.8), tt + 0.08, 0.22, -0.3, rev=0.3)
for tt in (1.6, 2.2):                                   # sent message
    m.add(m.pop(900), tt, 0.35, 0.3, rev=0.15)
    m.add(m.whoosh(0.2, 2000, 7000), tt - 0.05, 0.12, 0.3, rev=0.1)
for k in range(6):                                      # question marks
    m.add(m.pop(700 - 60 * k), 2.6 + k * 0.12, 0.3, -0.6 + 0.24 * k, rev=0.2)
m.add(m.whoosh(0.5, 300, 3000), 3.4, 0.35, 0, rev=0.2)  # phone slides away

# ---- sneaky Santa: pizzicato + tiptoes ----
seq = ['D3', 'A3', 'F3', 'A3', 'D3', 'A3', 'F3', 'A3', 'E3', 'A3', 'G3', 'A3', 'D3', 'A3']
for k, nm in enumerate(seq):
    tt = 3.9 + k * 0.16
    m.add(pluck(note(nm), 0.5, bright=0.55, decay=0.993, seed=k), tt, 0.65 if k % 2 == 0 else 0.42,
          -0.2 if k % 2 else 0.2, rev=0.25)
for k in range(6):
    tap = m.bandnoise(0.06, 300, 2500) * np.exp(-tvec(0.06) * 90)
    m.add(tap, 3.9 + k * 0.32 + 0.08, 0.4, 0.5 - 0.15 * k, rev=0.1)
m.add(pluck(note('D2'), 0.9, bright=0.5, decay=0.995, seed=99), 6.15, 0.4, 0, rev=0.3)
m.add(m.thump(0.4), 6.2, 0.5, -0.4, rev=0.1)            # box set down
d = 0.75; tt = tvec(d)                                   # "shhh"
m.add(m.bandnoise(d, 2500, 9000) * np.sin(np.pi * tt / d) ** 1.5, 6.3, 0.3, 0.2, rev=0.2)
m.add(m.whoosh(0.45, 800, 6000), 6.95, 0.35, 0.2, rev=0.3)  # poof
m.sparkle(7.0, ['G5', 'C6', 'E6', 'G6', 'C7'], 0.04, 0.16)

# ---- tag + open ----
m.add(m.rustle(0.3), 7.3, 0.3, -0.3, rev=0.2)
m.add(m.bell(note('E6'), 1.2), 7.35, 0.15, -0.3, rev=0.4)
m.add(m.rustle(0.3), 7.9, 0.3, -0.3, rev=0.2)
m.add(m.whoosh(0.5, 600, 5000), 8.1, 0.35, -0.5, rev=0.3)
m.sparkle(8.2, ['E6', 'G6', 'C7'], 0.05, 0.14, -0.5, 0)

# ---- happy music + checklist ----
m.music_loop(8.0, 4)                                     # 8..16 s + ring
for i, nm in enumerate(['C5', 'E5', 'G5', 'A5', 'C6']):
    s0 = 8.7 + i * 0.7
    m.add(m.pop(450 + 50 * i), s0, 0.35, -0.4, rev=0.15)
    m.add(m.whoosh(0.5, 900, 5000), s0, 0.1, 0, rev=0.1)
    land = s0 + 0.6
    m.add(m.bell(note(nm), 1.4), land, 0.18, 0.4, rev=0.4)
    d = 0.22; tt = tvec(d)                               # pen tick for the check mark
    scrib = m.bandnoise(d, 1500, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * tt)) * np.sin(np.pi * tt / d)
    m.add(scrib, land + 0.06, 0.22, 0.5, rev=0.05)

# ---- headline, price ----
m.add(m.whoosh(0.5, 500, 3000), 11.95, 0.2, 0, rev=0.3)
m.add(m.thump(0.6), 12.75, 0.6, 0.4, rev=0.2)
m.sparkle(12.8, ['C6', 'G6', 'C7', 'E7'], 0.045, 0.2, 0.2, 0.8)
m.add(m.pop(800), 13.1, 0.2, 0.4, rev=0.2)

# ---- outro ----
m.sparkle(14.3, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 3.0), 14.9, 0.12, 0, rev=0.6)
m.add(m.pop(650), 16.25, 0.4, 0, rev=0.2)

m.write(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav')
