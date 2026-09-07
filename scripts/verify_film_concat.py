"""Recover concat provenance only when every encoded video packet matches."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def sha(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def packets(probe, path):
    metadata = subprocess.run([str(probe), '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,r_frame_rate,nb_frames', '-of', 'json',
        str(path)], check=True, capture_output=True, text=True)
    stream = json.loads(metadata.stdout)['streams'][0]
    if stream['codec_name'] != 'h264' or stream['r_frame_rate'] != '24/1':
        raise ValueError('Expected native24 H264')
    # Concat remuxing inserts parameter sets at keyframes. Compare coded-picture
    # payloads, not container-specific SPS/PPS/SEI/AUD repetition. This verifies
    # ancestry and ordering, not decoded visual quality or parameter-set identity.
    result = subprocess.run([str(probe.with_name('ffmpeg.exe')), '-v', 'error',
        '-i', str(path), '-map', '0:v:0', '-c:v', 'copy', '-bsf:v',
        'filter_units=remove_types=6|7|8|9', '-f', 'framehash', '-hash', 'sha256', '-'], check=True,
        capture_output=True, text=True)
    values = [line.split(',')[-1].strip() for line in result.stdout.splitlines()
              if line and not line.startswith('#')]
    if not values or len(values) != int(stream['nb_frames']):
        raise ValueError('Packet/frame count mismatch')
    return values


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--probe', required=True, type=Path)
    parser.add_argument('--master', required=True, type=Path)
    parser.add_argument('--concat', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    files = []
    for line in args.concat.read_text(encoding='utf-8-sig').splitlines():
        if not line.strip():
            continue
        if not line.startswith("file '") or not line.endswith("'"):
            raise ValueError('Unexpected concat record')
        files.append(Path(line[6:-1]))
    master_packets = packets(args.probe, args.master)
    cursor, shots = 0, []
    for path in files:
        values = packets(args.probe, path)
        if master_packets[cursor:cursor+len(values)] != values:
            raise ValueError(f'Encoded sequence does not match: {path.name} at {cursor}')
        shots.append({'name': path.name, 'path': str(path), 'sha256': sha(path),
            'timelineStartFrame': cursor, 'timelineEndFrame': cursor+len(values),
            'in': 0, 'out': len(values)})
        cursor += len(values)
    if cursor != len(master_packets):
        raise ValueError('Unaccounted master packets')
    output = {'fps': 24, 'frames': cursor, 'outputSha256': sha(args.master),
        'verification': 'Every ordered H264 coded-picture packet SHA256 matches concat components '
        'after removing non-picture NAL types 6/7/8/9. Native24 and packet/frame counts verified. '
        'Remuxed parameter-set identity, audio, decoded quality and artistic approval not inferred.',
        'shots': shots}
    args.output.write_text(json.dumps(output, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'matched_video_packets': cursor, 'components': len(shots)}))


if __name__ == '__main__':
    main()
