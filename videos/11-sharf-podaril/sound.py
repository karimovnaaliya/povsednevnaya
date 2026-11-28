"""Soundtrack for 11-sharf-podaril (18 s), synced to index.html.
    python3 videos/11-sharf-podaril/sound.py out.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from audio_lib import Mix, tvec, note

m = Mix(18.0, seed=111)

# ---- grey evening: soft wind, tender music box, snow footsteps ----
d = 6.6; t = tvec(d)
wind = m.bandnoise(d, 200, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t))
wind *= np.minimum(1, t / 0.3) * np.clip((6.6 - t) / 1.0, 0, 1)
m.add(wind, 0, 0.45, 0, rev=0.1)
for tt, nm in [(0.2, 'E5'), (0.9, 'G5'), (1.6, 'C6'), (2.3, 'B5'), (3.0, 'A5'), (3.7, 'G5'), (4.4, 'E5'), (5.1, 'F5')]:
    m.add(m.musicbox(note(nm), 2.0), tt, 0.17, 0, rev=0.8)
for k in range(5):                                     # crunchy footsteps
    crunch = m.bandnoise(0.12, 400, 4000) * np.exp(-tvec(0.12) * 30)
    m.add(crunch, 0.4 + k * 0.38, 0.35, 0.6 - 0.1 * k, rev=0.05)
m.add(m.whoosh(0.4, 400, 3000), 0.2, 0.15, 0, rev=0.2)
m.add(m.whoosh(0.4, 400, 3000), 1.0, 0.15, 0, rev=0.2)

# ---- the gift ----
m.add(m.rustle(0.4), 2.6, 0.35, 0.2, rev=0.2)
m.add(m.bell(note('A5'), 1.6), 3.1, 0.2, 0, rev=0.6)   # heart
m.add(m.bell(note('E6'), 1.6), 3.2, 0.14, 0, rev=0.6)
m.add(m.pop(520), 4.0, 0.35, 0.2, rev=0.15)            # lid
m.sparkle(4.1, ['E6', 'G6', 'C7'], 0.06, 0.14)
m.add(m.whoosh(0.8, 300, 5000), 5.0, 0.35, -0.4, rev=0.2)  # scarf flies to her
m.add(m.fwump(), 5.75, 0.55, -0.3, rev=0.1)

# ---- colour bloom + warm music ----
m.sparkle(5.7, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.05, 0.2)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 2.5), 5.8, 0.12, 0, rev=0.6)
for k in range(10):
    m.add(m.bell(note(['G6', 'C7', 'E6', 'A6', 'D7', 'G6', 'C7', 'E7', 'A6', 'G6'][k]), 0.8), 5.85 + k * 0.08, 0.06, -0.8 + 0.18 * k, rev=0.5)
m.music_loop(5.8, 5)                                   # 5.8 .. 15.8 + ring
m.add(m.pop(600), 6.6, 0.25, 0, rev=0.15)              # label 1

# ---- swap to burgundy ----
m.add(m.rustle(0.3), 8.9, 0.35, -0.3, rev=0.2)
m.sparkle(9.0, ['A5', 'C6', 'E6', 'A6'], 0.06, 0.17)
m.add(m.pop(760), 9.05, 0.3, 0, rev=0.15)
m.add(m.pop(600), 9.4, 0.25, 0, rev=0.15)

# ---- "намекни ему" + paper plane ----
m.add(m.whoosh(0.4, 300, 3000), 11.95, 0.3, 0, rev=0.15)
m.add(m.pop(820), 12.1, 0.4, 0, rev=0.15)
d = 1.1; t = tvec(d)
plane = m.bandnoise(d, 1200, 7000) * np.sin(np.pi * t / d) ** 2
m.add(plane, 12.5, 0.3, 0.3, rev=0.2)
m.add(m.bell(note('C7'), 1.0), 13.6, 0.18, 0.5, rev=0.4)   # "sent!"
m.add(m.bell(note('G6'), 1.0), 13.5, 0.16, 0.5, rev=0.4)

# ---- outro ----
m.add(m.whoosh(0.5, 300, 3000), 14.35, 0.25, 0, rev=0.3)
m.sparkle(14.5, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 0.15)
for nm in ['C4', 'E4', 'G4', 'C5']:
    m.add(m.bell(note(nm), 3.0), 14.8, 0.12, 0, rev=0.6)
m.add(m.pop(700), 15.15, 0.35, 0, rev=0.2)
m.add(m.pop(650), 15.95, 0.4, 0, rev=0.2)

m.write(sys.argv[1] if len(sys.argv) > 1 else 'sound.wav')
