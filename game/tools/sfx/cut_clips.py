"""Update 0.1.17 — cuts the game's sound clips out of the designer's sound library (ASSETS/Sonniss_Game_Audio_Bundle,
royalty-free: see its licence). Pure Python and numpy (no ffmpeg here).

A recipe (tools/sfx/recipes/*.json) lists, for each of the game's sounds, its candidates: a library file (by a part of
its name), and either its separate takes (found by their loudness: a file of four punches gives four) or a stretch
of it ('snap': an impact starts on its hit). Each candidate is cut, mixed to mono, brought down to 48 kHz (a windowed-sinc low-pass, then every 2nd or 4th
sample), faded in and out, peaked at -3 dBFS and written as 16-bit WAV to public/sounds/<sound>/<n>.wav.
public/sounds/manifest.json lists them with where each came from (the licence log).

  python tools/sfx/cut_clips.py analyse <library dir part> <file part>   # the takes it finds, to choose from
  python tools/sfx/cut_clips.py cut tools/sfx/recipes/combat.json         # cut a recipe's candidates

A recipe's "_keep" (the designer's picks, by the numbers the Lab showed) keeps only those of a sound, numbered from 1;
an empty one (the designer chose Code) keeps none, so the sound stays made in code.
"""
import json
import os
import struct
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(os.path.dirname(HERE))


def _library():
    """ASSETS/Sonniss_Game_Audio_Bundle in the nearest folder up from the game that has it (ASSETS isn't in git, so a
    worktree finds the main folder's)."""
    d = os.path.dirname(GAME)
    while True:
        lib = os.path.join(d, 'ASSETS', 'Sonniss_Game_Audio_Bundle')
        if os.path.isdir(lib):
            return lib
        up = os.path.dirname(d)
        if up == d:
            return os.path.join(os.path.dirname(GAME), 'ASSETS', 'Sonniss_Game_Audio_Bundle')
        d = up


LIBRARY = _library()
OUT = os.path.join(GAME, 'public', 'sounds')
RATE = 48000
PEAK = 10 ** (-3 / 20)
# Takes: 10 ms blocks; a take is louder than the file's peak less RISE dB; quieter gaps shorter than GAP join a take.
BLOCK = 0.01
RISE = 26
GAP = 0.12
# A take ends once it's this far (dB) under its own peak; it starts this early (s).
TAIL = 42
PRE = 0.004


def read_any(path):
    """(rate, samples as float32 [n, channels]): a WAV read here, anything else (MP3...) through PyAV's FFmpeg."""
    if path.lower().endswith('.wav'):
        return read_wav(path)
    import av

    with av.open(path) as f:
        stream = f.streams.audio[0]
        rate = stream.rate
        parts = [frame.to_ndarray() for frame in f.decode(stream)]
    x = np.concatenate(parts, axis=1) if parts[0].ndim == 2 else np.concatenate(parts)
    if x.ndim == 1:
        x = x[None, :]
    # (Planar float [channels, n], or packed [1, n * channels].)
    ch = stream.channels
    if x.shape[0] == 1 and ch > 1:
        x = x.reshape(-1, ch).T
    return rate, x.T.astype(np.float32)


def read_wav(path):
    """(rate, samples as float32 [n, channels]). PCM 16/24/32-bit and 32-bit float, plain or extensible."""
    with open(path, 'rb') as f:
        if f.read(4) != b'RIFF':
            raise ValueError('not a WAV: ' + path)
        f.read(8)
        fmt = None
        while True:
            head = f.read(8)
            if len(head) < 8:
                raise ValueError('no data: ' + path)
            cid, size = head[:4], struct.unpack('<I', head[4:])[0]
            if cid == b'fmt ':
                d = f.read(size)
                tag, ch, rate, _, _, bits = struct.unpack('<HHIIHH', d[:16])
                if tag == 0xFFFE:
                    tag = struct.unpack('<H', d[24:26])[0]
                fmt = (tag, ch, rate, bits)
                if size & 1:
                    f.read(1)
            elif cid == b'data':
                raw = f.read(size)
                break
            else:
                f.seek(size + (size & 1), 1)
    tag, ch, rate, bits = fmt
    if tag == 3 and bits == 32:
        x = np.frombuffer(raw, dtype='<f4').astype(np.float32)
    elif tag == 1 and bits == 16:
        x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
    elif tag == 1 and bits == 24:
        b = np.frombuffer(raw[: len(raw) - len(raw) % 3], dtype=np.uint8).reshape(-1, 3).astype(np.int32)
        v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        v = np.where(v & 0x800000, v - 0x1000000, v)
        x = v.astype(np.float32) / 8388608
    elif tag == 1 and bits == 32:
        x = np.frombuffer(raw, dtype='<i4').astype(np.float32) / 2147483648
    else:
        raise ValueError(f'unsupported WAV ({tag}, {bits} bit): {path}')
    n = len(x) // ch
    return rate, x[: n * ch].reshape(n, ch)


def find(lib_part, file_part):
    """The library file whose folder name holds `lib_part` and whose name holds `file_part` (exactly one). The lib
    "AUDIO": the designer's own sounds, ASSETS/AUDIO."""
    if lib_part == 'AUDIO':
        d = os.path.join(os.path.dirname(LIBRARY), 'AUDIO')
        hits = [('AUDIO', os.path.join(d, n)) for n in sorted(os.listdir(d)) if file_part.lower() in n.lower()]
        if len(hits) != 1:
            raise ValueError(f'{len(hits)} files match AUDIO / {file_part!r}')
        return hits[0]
    hits = []
    for pack in sorted(os.listdir(LIBRARY)):
        pdir = os.path.join(LIBRARY, pack)
        if not os.path.isdir(pdir):
            continue
        for lib in sorted(os.listdir(pdir)):
            ldir = os.path.join(pdir, lib)
            if not os.path.isdir(ldir) or lib_part.lower() not in lib.lower():
                continue
            for name in sorted(os.listdir(ldir)):
                if name.lower().endswith(('.wav', '.mp3', '.ogg', '.flac')) and file_part.lower() in name.lower():
                    hits.append((lib, os.path.join(ldir, name)))
    if len(hits) != 1:
        raise ValueError(f'{len(hits)} files match {lib_part!r} / {file_part!r}: {[os.path.basename(h[1]) for h in hits]}')
    return hits[0]


def envelope(mono, rate):
    """Loudness per 10 ms block (dB)."""
    b = max(1, int(rate * BLOCK))
    n = len(mono) // b
    blocks = mono[: n * b].reshape(n, b)
    return 20 * np.log10(np.sqrt((blocks ** 2).mean(axis=1)) + 1e-9), b


def takes(mono, rate, rise=RISE):
    """The separate takes in a file: [(start, end)] in samples, in order. A take runs from its first loud block to its
    last (quiet gaps shorter than GAP inside it), then on through its tail until it's TAIL dB under its own peak or
    the next take begins."""
    env, b = envelope(mono, rate)
    loud = env > env.max() - rise
    gap = int(GAP / BLOCK)
    out = []
    i = 0
    n = len(env)
    while i < n:
        if not loud[i]:
            i += 1
            continue
        last = i
        j = i + 1
        while j < n and j - last <= gap:
            if loud[j]:
                last = j
            j += 1
        peak = env[i : last + 1].max()
        k = last + 1
        while k < n and not loud[k] and env[k] > peak - TAIL:
            k += 1
        # (A faint scrap between takes isn't one: 20 dB under the loudest.)
        if peak > env.max() - 20:
            out.append((max(0, i * b - int(PRE * rate)), min(len(mono), k * b)))
        i = k
    return out


def lowpass(x, factor):
    """Down to rate / factor: a windowed-sinc low-pass, then every factor-th sample."""
    if factor == 1:
        return x
    taps = 48 * factor + 1
    n = np.arange(taps) - (taps - 1) / 2
    cut = 0.92 / factor / 2
    h = 2 * cut * np.sinc(2 * cut * n) * np.blackman(taps)
    h /= h.sum()
    return np.convolve(x, h, mode='same')[::factor]


def finish(clip, rate, length):
    """To 48 kHz mono, at most `length` s, faded, peaked at -3 dBFS, as 16-bit samples."""
    if rate % RATE == 0:
        clip = lowpass(clip, rate // RATE)
    elif rate != RATE:
        # (44.1 kHz and the like: linear, after a low-pass to the new band.)
        clip = lowpass(clip, 1)
        t = np.arange(int(len(clip) * RATE / rate)) * rate / RATE
        clip = np.interp(t, np.arange(len(clip)), clip)
    clip = clip[: int(length * RATE)]
    fin = min(len(clip), int(0.003 * RATE))
    fout = min(len(clip) // 3, max(int(0.06 * RATE), len(clip) // 4))
    clip = clip.copy()
    clip[:fin] *= np.sin(np.linspace(0, np.pi / 2, fin)) ** 2
    if fout > 0:
        clip[-fout:] *= np.cos(np.linspace(0, np.pi / 2, fout)) ** 2
    peak = np.abs(clip).max()
    if peak > 0:
        clip *= PEAK / peak
    return (np.clip(clip, -1, 1) * 32767).astype('<i2')


def write(path, samples):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(samples.tobytes())


def analyse(lib_part, file_part):
    lib, path = find(lib_part, file_part)
    rate, x = read_any(path)
    mono = x.mean(axis=1)
    print(f'{lib} / {os.path.basename(path)}: {len(mono) / rate:.1f} s at {rate} Hz')
    env, _ = envelope(mono, rate)
    top = env.max()
    for k, (a, b) in enumerate(takes(mono, rate)):
        seg = mono[a:b]
        print(f'  take {k + 1:2d}: {a / rate:7.2f} - {b / rate:6.2f} s ({(b - a) / rate:.2f} s), peak {20 * np.log10(np.abs(seg).max() + 1e-9):6.1f} dBFS, {top:.0f} dB file')


def cut(recipe_path):
    with open(recipe_path, encoding='utf-8') as f:
        recipe = json.load(f)
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding='utf-8') as f:
            manifest = json.load(f)
    cache = {}
    for sound, sources in recipe.items():
        if sound.startswith('_'):
            continue
        sdir = os.path.join(OUT, sound)
        if os.path.isdir(sdir):
            for old in os.listdir(sdir):
                os.remove(os.path.join(sdir, old))
        clips = []
        for src in sources:
            lib, path = find(src['lib'], src['file'])
            if path not in cache:
                cache[path] = read_any(path)
            rate, x = cache[path]
            mono = x.mean(axis=1)
            if 'at' in src:
                spans = [(int(src['at'][0] * rate), int(src['at'][1] * rate))]
            else:
                found = takes(mono, rate, src.get('rise', RISE))
                pick = src.get('takes')
                spans = [found[k - 1] for k in pick if 0 < k <= len(found)] if pick else found
            for a, b in spans:
                # 'snap': an impact starts just before it first gets this loud (a share of its peak), not on a
                # sweep or a swing leading into it.
                if 'snap' in src:
                    seg = np.abs(mono[a:b])
                    a += max(0, int(np.argmax(seg > src['snap'] * seg.max())) - int(PRE * rate))
                clip = finish(mono[a:b], rate, src.get('len', 1.0))
                clips.append((clip, f'{lib} / {os.path.basename(path)} @ {a / rate:.2f}-{b / rate:.2f} s'))
        # The designer's picks ('_keep': the candidates by number, as the Lab showed them): only those stay, numbered
        # from 1 again.
        keep = recipe.get('_keep', {}).get(sound)
        if keep is not None:
            clips = [clips[k - 1] for k in keep]
        if not clips:
            # (Code: the designer keeps the sound made in code; its clips go.)
            if os.path.isdir(sdir):
                os.rmdir(sdir)
            manifest.pop(sound, None)
            print(f'{sound}: none (made in code)')
            continue
        entries = []
        for n, (clip, origin) in enumerate(clips, 1):
            write(os.path.join(sdir, f'{n}.wav'), clip)
            entries.append({'file': f'sounds/{sound}/{n}.wav', 'from': origin, 'seconds': round(len(clip) / RATE, 3)})
        manifest[sound] = entries
        print(f'{sound}: {len(entries)} {"kept" if keep else "candidates"}')
    with open(manifest_path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
        f.write('\n')


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'analyse':
        analyse(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 3 and sys.argv[1] == 'cut':
        cut(sys.argv[2])
    else:
        print(__doc__)
