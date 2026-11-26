"""Small numpy synth toolkit for My Warm Box videos (no samples, all original)."""
import wave
import numpy as np

SR = 44100


class Mix:
    def __init__(self, dur, seed=7):
        self.dur = dur
        self.n = int(SR * dur)
        self.rng = np.random.default_rng(seed)
        self.L, self.R = np.zeros(self.n), np.zeros(self.n)
        self.RL, self.RR = np.zeros(self.n), np.zeros(self.n)

    # ---------- placement ----------
    def add(self, sig, t0, gain=1.0, pan=0.0, rev=0.3):
        i0 = int(t0 * SR)
        if i0 >= self.n:
            return
        sig = sig[: self.n - i0]
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        s = slice(i0, i0 + len(sig))
        self.L[s] += sig * gain * gl; self.R[s] += sig * gain * gr
        self.RL[s] += sig * gain * gl * rev; self.RR[s] += sig * gain * gr * rev

    # ---------- generators ----------
    def bandnoise(self, d, lo, hi):
        n = int(d * SR)
        spec = np.fft.rfft(self.rng.standard_normal(n))
        f = np.fft.rfftfreq(n, 1 / SR)
        spec[(f < lo) | (f > hi)] = 0
        x = np.fft.irfft(spec, n)
        return x / (np.abs(x).max() + 1e-9)

    def musicbox(self, f, d=1.6):
        t = tvec(d)
        s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2)
             + 0.35 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 9)
             + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 16))
        return s * np.minimum(1, t / 0.003)

    def bell(self, f, d=2.5):
        t = tvec(d)
        parts = [(1, 1, 1.6), (2.0, .5, 2.4), (2.76, .35, 3.5), (5.4, .18, 6), (8.9, .08, 9)]
        s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in parts)
        return s * np.minimum(1, t / 0.002)

    def pad(self, freqs, d):
        t = tvec(d)
        s = np.zeros_like(t)
        for f in freqs:
            for det in (-0.6, 0.6):
                ff = f + det
                s += np.sin(2 * np.pi * ff * t) + 0.25 * np.sin(2 * np.pi * 2 * ff * t)
        env = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.6)
        return s * env / (len(freqs) * 2)

    def pop(self, f=500):
        t = tvec(0.18)
        freq = f * (1 + 1.4 * np.exp(-t * 60))
        s = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 28)
        return s + 0.15 * self.bandnoise(0.18, 2000, 7000) * np.exp(-t * 120)

    def thump(self, gain=1.0):
        t = tvec(0.45)
        freq = 42 + 70 * np.exp(-t * 25)
        s = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 11)
        s += 0.35 * self.bandnoise(0.45, 80, 900) * np.exp(-t * 30)
        return s * gain

    def fwump(self):
        """soft cozy 'fabric lands' sound"""
        t = tvec(0.35)
        return self.bandnoise(0.35, 60, 600) * np.exp(-t * 14) * np.minimum(1, t / 0.02)

    def whoosh(self, d, lo=250, hi=3500):
        t = tvec(d)
        return self.bandnoise(d, lo, hi) * np.sin(np.pi * t / d) ** 2

    def rustle(self, d):
        t = tvec(d)
        grains = (self.rng.random(len(t)) < 0.004).astype(float)
        grains = np.convolve(grains, np.exp(-np.arange(300) / 40), 'same')
        return self.bandnoise(d, 1500, 8000) * grains * np.sin(np.pi * t / d)

    def sleigh(self, d=0.35):
        t = tvec(d)
        return self.bandnoise(d, 5000, 12000) * np.exp(-t * 12) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * t))

    def sparkle(self, t0, notes, step=0.06, gain=0.25, pan_from=-0.6, pan_to=0.6):
        for k, nm in enumerate(notes):
            p = pan_from + (pan_to - pan_from) * k / max(1, len(notes) - 1)
            self.add(self.bell(note(nm), 1.8), t0 + k * step, gain, p, rev=0.6)

    def music_loop(self, t_start, bars, gain=1.0):
        """Music-box loop in C major (I-vi-IV-V), 2 s per chord, 120 bpm."""
        chords = [(['C4', 'E4', 'G4', 'C5'], 'C3'), (['A3', 'C4', 'E4', 'A4'], 'A2'),
                  (['F3', 'A3', 'C4', 'F4'], 'F2'), (['G3', 'B3', 'D4', 'G4'], 'G2')]
        pattern = [0, 1, 2, 3, 2, 1, 2, 3]
        for bar in range(bars):
            tones, bass = chords[bar % 4]
            t0 = t_start + bar * 2.0
            self.add(self.pad([note(x) for x in tones[:3]], 2.2), t0, 0.09 * gain, 0, rev=0.5)
            self.add(self.musicbox(note(bass) * 2, 2.0), t0, 0.16 * gain, 0, rev=0.3)
            for k, idx in enumerate(pattern):
                nm = tones[idx]
                self.add(self.musicbox(note(nm[:-1] + str(int(nm[-1]) + 1))), t0 + k * 0.25,
                         0.13 * gain, 0.25 * (-1) ** k, rev=0.45)
            for beat in (0.5, 1.5):
                self.add(self.sleigh(), t0 + beat, 0.05 * gain, 0.4, rev=0.2)
        end = t_start + bars * 2.0
        self.add(self.pad([note('C4'), note('E4'), note('G4')], 1.0), end, 0.08 * gain, 0, rev=0.6)
        for k, nm in enumerate(['C5', 'E5', 'G5', 'C6']):
            self.add(self.musicbox(note(nm), 1.2), end + k * 0.03, 0.12 * gain, -0.3 + 0.2 * k, rev=0.7)

    # ---------- master ----------
    def write(self, path):
        ir_t = tvec(1.8)
        ir = self.rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2)
        ir[: int(0.02 * SR)] = 0
        ir2 = self.rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2)
        ir2[: int(0.02 * SR)] = 0
        wl, wr = conv(self.RL, ir), conv(self.RR, ir2)
        wl /= np.abs(wl).max() + 1e-9; wr /= np.abs(wr).max() + 1e-9
        pk = max(np.abs(self.L).max(), np.abs(self.R).max())
        t = np.arange(self.n) / SR
        fade = np.minimum(1, t / 0.15) * np.minimum(1, (self.dur - t) / 0.6)
        out = np.stack([self.L / pk + 0.22 * wl, self.R / pk + 0.22 * wr], 1) * fade[:, None]
        out = np.tanh(out * 1.1)
        out *= 0.89 / np.abs(out).max()
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((out * 32767).astype('<i2').tobytes())
        print('wrote', path)


def tvec(d):
    return np.arange(int(d * SR)) / SR


def conv(x, h):
    n = len(x) + len(h)
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(h, n), n)[: len(x)]


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    return 440 * 2 ** ((names[name[0]] + (int(name[-1]) - 4) * 12) / 12)
