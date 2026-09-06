"""Read-only timing diagnostic: original dialogue stem against the mixed film.

Derivative correlation emphasizes speech transients over a quiet musical bed.
This does not approve musical editing, intelligibility, or artistic quality.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('production_root', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('--stem', default='magi-dialogue-v1.wav')
    args = parser.parse_args()
    root = args.production_root.resolve()
    ffmpeg = root / 'tools/ffmpeg/bin/ffmpeg.exe'
    folder = root / 'production/award-candidate/sound'
    manifest = json.loads((folder / 'dialogue-manifest.json').read_text())
    rate = 24000

    def decode(path):
        raw = subprocess.check_output([
            str(ffmpeg), '-v', 'error', '-i', str(path), '-map', '0:a:0',
            '-ac', '1', '-af', f'aresample={rate}:async=1:min_hard_comp=0.001:first_pts=0',
            '-f', 'f32le', '-'])
        return np.frombuffer(raw, dtype='<f4')

    stem = folder / args.stem
    voice = decode(stem)
    film = decode(root / 'public/video/films/magi-reader-film-final.mp4')
    results = []
    for chapter in manifest['sources']:
        start = chapter['startSample'] / manifest['sampleRate']
        duration = chapter['samples'] / manifest['sampleRate']
        for label, offset in [('opening', chapter['narrationOffset'] + 0.4),
                              ('middle', duration / 2), ('ending', duration - 6.4)]:
            t = start + offset
            i = round(t * rate)
            count = 6 * rate
            x = np.diff(voice[i:i + count]).astype(np.float64)
            y = np.diff(film[i:i + count]).astype(np.float64)
            if len(x) != len(y) or len(x) < count - 1:
                raise RuntimeError('Incomplete comparison window')
            x -= x.mean()
            y -= y.mean()
            fft_size = 1 << (2 * len(x) - 1).bit_length()
            corr = np.fft.irfft(np.conj(np.fft.rfft(x, fft_size)) *
                                np.fft.rfft(y, fft_size), fft_size)
            maximum_lag = round(rate * 0.75)
            lags = np.arange(-maximum_lag, maximum_lag + 1)
            lag = int(lags[np.argmax(corr[lags % fft_size])])
            if lag >= 0:
                xa, ya = x[:len(x)-lag or None], y[lag:]
            else:
                xa, ya = x[-lag:], y[:len(y)+lag]
            score = float(np.dot(xa, ya) / max(np.linalg.norm(xa) * np.linalg.norm(ya), 1e-15))
            results.append({'chapter': chapter['unit'], 'window': label,
                            'startSeconds': t, 'durationSeconds': 6,
                            'mixedFilmLagMs': lag * 1000 / rate,
                            'transientCorrelation': score,
                            'timingFlag': abs(lag) > rate * 0.02 or score < 0.8})
    report = {'status': 'diagnostic only; not a listening or artistic approval',
              'method': 'Timestamp-aware 24 kHz mono first-difference cross-correlation, +/-750 ms search',
              'stemSha256': hashlib.sha256(stem.read_bytes()).hexdigest(), 'windows': results,
              'flaggedWindows': sum(r['timingFlag'] for r in results)}
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'windows': len(results), 'flagged': report['flaggedWindows'],
                      'maximumAbsoluteLagMs': max(abs(r['mixedFilmLagMs']) for r in results),
                      'minimumCorrelation': min(r['transientCorrelation'] for r in results)}))


if __name__ == '__main__':
    main()
