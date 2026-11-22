"""
Synthesises the trailer soundtrack (no samples, no licences needed).
Event times match the scenes in trailer.html.

    python3 trailer/make_audio.py trailer/build/trailer-audio.wav
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 32.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
dry = np.zeros((2, N))
wet = np.zeros((2, N))   # sent to the reverb


def place(sig, start, gain=1.0, pan=0.0, send=0.0):
    i0 = int(start * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    for bus, g in ((dry, gain), (wet, gain * send)):
        bus[0, i0:i0 + len(sig)] += sig * g * l * 1.414
        bus[1, i0:i0 + len(sig)] += sig * g * r * 1.414


def band(sig, lo=None, hi=None):
    """Zero-phase FFT filter with soft edges."""
    S = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(S * m, len(sig))


def seg_t(d):
    return np.arange(int(d * SR)) / SR


# 1) dark drone (A minor), 0 - 27 s
f0s = [55.0, 82.41, 110.0, 130.81, 164.81]
amps = [1.0, .55, .5, .22, .12]
drone = np.zeros(N)
for f, a in zip(f0s, amps):
    for det in (1.0, 1.0035):
        drone += a * np.sin(2 * np.pi * f * det * t + 0.4 * np.sin(2 * np.pi * 0.07 * t + f))
drone *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * t)
env = np.clip(t / 3.0, 0, 1) * (0.7 + 0.3 * np.clip((t - 8) / 14, 0, 1))
env *= 1 - np.clip((t - 25.6) / 1.4, 0, 1)
air = band(rng.standard_normal(N), 60, 420) * 0.9
drone_sig = (drone * 0.11 + air * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t))) * env
place(drone_sig, 0, 1.0, 0, 0.15)

# 2) clock ticks while he checks the time
def tick(freq):
    d = seg_t(0.09)
    click = rng.standard_normal(len(d)) * np.exp(-d / 0.0016)
    ring = np.sin(2 * np.pi * freq * d) * np.exp(-d / 0.014) * 0.7
    return band(click * 0.6 + ring, 900, None)
for k in range(8):
    tt = 0.55 + k * 1.0
    place(tick(3150 if k % 2 == 0 else 2450), tt, 0.08 + 0.015 * k, -0.25 if k % 2 else 0.25, 0.25)

# 3) booms
def boom(dur=2.6, f_hi=64, f_lo=33):
    d = seg_t(dur)
    freq = f_lo + (f_hi - f_lo) * np.exp(-d / 0.35)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    sub = np.sin(phase) * np.exp(-d / 0.95)
    thud = np.sin(2 * np.pi * 118 * d) * np.exp(-d / 0.11) * 0.5
    crack = band(rng.standard_normal(len(d)), None, 2600) * np.exp(-d / 0.03) * 0.6
    return sub + thud + crack
place(boom(), 10.0, 0.95, 0, 0.35)                    # "You're not."
place(boom(2.8, 58, 31), 15.7, 0.8, 0, 0.45)          # "Meet the Master."

# reverse swell into the Master
d = seg_t(1.0)
swell = band(rng.standard_normal(len(d)), 200, 3800) * (d / d[-1]) ** 3
place(swell, 14.7, 0.32, 0, 0.6)

# 4) chain rattle
def clink(base):
    d = seg_t(0.5)
    sig = np.zeros(len(d))
    for ratio, dec, a in ((1, .14, 1), (2.76, .09, .6), (5.40, .05, .4), (8.93, .03, .25)):
        sig += a * np.sin(2 * np.pi * base * ratio * d + rng.uniform(0, 6)) * np.exp(-d / dec)
    sig += band(rng.standard_normal(len(d)), 2500, None) * np.exp(-d / 0.004) * 0.6
    return sig
for k in range(9):
    tt = 11.75 + k * 0.09 + rng.uniform(-0.03, 0.03)
    place(clink(rng.uniform(1500, 2600)), tt, 0.09 * (1 - k / 14), rng.uniform(-0.5, 0.5), 0.5)

# 5) three heavy beats: One book. One day. One last cigarette.
def beat():
    d = seg_t(1.2)
    freq = 46 + 30 * np.exp(-d / 0.06)
    s = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-d / 0.38)
    s += band(rng.standard_normal(len(d)), None, 900) * np.exp(-d / 0.025) * 0.5
    return s
for tt, g in ((19.4, .55), (20.6, .7), (21.8, .9)):
    place(beat(), tt, g, 0, 0.35)

# 6) the cigarette goes out: hiss + crackle
d = seg_t(1.8)
hiss = band(rng.standard_normal(len(d)), 1800, 9000) * (np.exp(-d / 0.35) * 0.9 + 0.1 * np.exp(-d / 1.1)) * np.clip(d / 0.012, 0, 1)
crackle = np.zeros(len(d))
for _ in range(14):
    i = int(rng.uniform(0, 0.45) * SR)
    m = min(len(d) - i, 200)
    crackle[i:i + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / 30) * rng.uniform(.3, 1)
place(hiss * 0.5 + band(crackle, 1500, None) * 0.35, 24.0, 0.5, 0.1, 0.35)

# 7) riser into the light
d = seg_t(1.1)
riser = band(rng.standard_normal(len(d)), 400, 7000) * (d / d[-1]) ** 2.5
riser += np.sin(2 * np.pi * np.cumsum(200 + 600 * (d / d[-1]) ** 2) / SR) * (d / d[-1]) ** 2 * 0.25
place(riser, 25.3, 0.3, 0, 0.5)

# 8) warm A-major bloom for the end card
pad = np.zeros(N)
for f, a in ((110.0, .9), (138.59, .55), (164.81, .6), (220.0, .5), (277.18, .25), (329.63, .3)):
    for det in (0.997, 1.0, 1.003):
        for h in range(1, 5):
            pad += a / h ** 1.6 * np.sin(2 * np.pi * f * h * det * t + h * f)
pad_env = np.clip((t - 26.4) / 1.4, 0, 1) * (1 - np.clip((t - 30.4) / 1.6, 0, 1))
pad_sig = band(pad, None, 2400) * pad_env * 0.05
place(pad_sig, 0, 1.0, 0, 0.3)

def bell(f, dur=4.0):
    d = seg_t(dur)
    s = np.zeros(len(d))
    for ratio, dec, a in ((1, 2.4, 1), (2.0, 1.5, .5), (3.0, .9, .3), (4.2, .6, .2), (5.4, .4, .12)):
        s += a * np.sin(2 * np.pi * f * ratio * d) * np.exp(-d / dec)
    return s * np.clip(d / 0.004, 0, 1)
place(bell(880.0), 26.45, 0.12, -0.2, 0.6)
place(bell(1318.5), 29.8, 0.07, 0.25, 0.6)          # "COMING SOON"

# reverb: decaying stereo noise impulse
ir_t = seg_t(2.4)
ir = np.stack([band(rng.standard_normal(len(ir_t)), 150, 6000) * np.exp(-ir_t / 0.55) for _ in range(2)])
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
L = N + len(ir_t)
nfft = 1 << (L - 1).bit_length()
rev = np.stack([np.fft.irfft(np.fft.rfft(wet[c], nfft) * np.fft.rfft(ir[c], nfft), nfft)[:N] for c in range(2)])

mix = dry + rev * 0.9
mix = np.tanh(mix * 1.2) / 1.2
mix *= np.clip(t / 0.05, 0, 1) * (1 - np.clip((t - (DUR - 1.2)) / 1.2, 0, 1))
mix *= 0.89 / np.max(np.abs(mix))

out = sys.argv[1] if len(sys.argv) > 1 else "trailer-audio.wav"
pcm = (mix.T * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out, f"{DUR}s")
