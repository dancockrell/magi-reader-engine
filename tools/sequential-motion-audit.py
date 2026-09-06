#!/usr/bin/env python3
"""Audit adjacent decoded frames for stalls and discontinuous motion.

This is intentionally a temporal check, not a contact-sheet or an averaged
clip score. It compares every frame N with N + 1 at source cadence, evaluates
the changed-pixel distribution and local image blocks, and additionally checks
N/N + 2 for the A-B-A pattern that reveals a temporal bounce. The output is
diagnostic: a flagged transition must still be reviewed before an asset is
rejected or admitted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--ffmpeg-bin",
        type=Path,
        required=True,
        help="directory containing ffmpeg and ffprobe (the legacy option name is retained)",
    )
    parser.add_argument("--fps", type=float, default=24.0)
    parser.add_argument("--width", type=int, default=320)
    parser.add_argument("--stall-threshold", type=float, default=0.0015)
    parser.add_argument("--pixel-threshold", type=float, default=0.04)
    parser.add_argument("--tiles", type=int, default=8)
    parser.add_argument("--jump-factor", type=float, default=4.0)
    return parser.parse_args()


def executable(root: Path, name: str) -> str:
    suffix = ".exe" if os.name == "nt" and not name.endswith(".exe") else ""
    return str((root / f"{name}{suffix}").resolve())


def probe(source: Path, ffprobe: str) -> dict:
    command = [
        ffprobe,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,avg_frame_rate,r_frame_rate,nb_frames",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(source),
    ]
    return json.loads(subprocess.check_output(command, text=True))


def frame_array(source: Path, ffmpeg: str, fps: float, width: int, height: int) -> np.ndarray:
    filter_graph = f"fps={fps},scale={width}:{height}:flags=lanczos,format=gray"
    command = [
        ffmpeg,
        "-v",
        "error",
        "-i",
        str(source),
        "-vf",
        filter_graph,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "gray",
        "pipe:1",
    ]
    raw = subprocess.check_output(command)
    pixels_per_frame = width * height
    if len(raw) % pixels_per_frame:
        raise RuntimeError("Raw frame stream is not an even number of decoded frames")
    return np.frombuffer(raw, dtype=np.uint8).reshape((-1, height, width))


def sampled_height(video_probe: dict, width: int) -> int:
    stream = video_probe["streams"][0]
    source_width = int(stream["width"])
    source_height = int(stream["height"])
    return max(2, round(source_height * width / source_width / 2) * 2)


def temporal_metrics(delta: np.ndarray, pixel_threshold: float, tiles: int) -> dict:
    """Describe one adjacent transition without reducing it to one global mean."""
    height, width = delta.shape
    tile_rows = np.array_split(delta, tiles, axis=0)
    tile_means = np.array(
        [np.mean(tile, axis=(0, 1)) for row in tile_rows for tile in np.array_split(row, tiles, axis=1)]
    )
    return {
        "meanAbsoluteDifference": float(np.mean(delta)),
        "p95AbsoluteDifference": float(np.quantile(delta, 0.95)),
        "maxAbsoluteDifference": float(np.max(delta)),
        "changedPixelFraction": float(np.mean(delta >= pixel_threshold)),
        "maxTileMeanDifference": float(np.max(tile_means)),
        "activeTileFraction": float(np.mean(tile_means >= pixel_threshold)),
    }


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = executable(args.ffmpeg_bin, "ffmpeg")
    ffprobe = executable(args.ffmpeg_bin, "ffprobe")
    video_probe = probe(source, ffprobe)
    height = sampled_height(video_probe, args.width)
    frames = frame_array(source, ffmpeg, args.fps, args.width, height).astype(np.float32) / 255.0
    if len(frames) < 2:
        raise RuntimeError("Need at least two decoded frames")

    metrics = [temporal_metrics(np.abs(frames[index] - frames[index - 1]), args.pixel_threshold, args.tiles)
               for index in range(1, len(frames))]
    tile_differences = np.array([item["maxTileMeanDifference"] for item in metrics])
    median_tile_difference = float(np.median(tile_differences))
    tile_deviation = float(np.median(np.abs(tile_differences - median_tile_difference)))
    jump_threshold = max(
        median_tile_difference * args.jump_factor,
        median_tile_difference + tile_deviation * 8,
        0.04,
    )

    # A large adjacent difference is not automatically a discontinuity: a real
    # gesture can move through a local tile for many consecutive frames.  Mark
    # such contiguous runs as sustained motion so the report does not call the
    # intended action itself a sequence of "jumps".  An isolated spike is still
    # a local-jump candidate and must be visually reviewed.
    raw_jump_candidates = [
        metric["maxTileMeanDifference"] >= jump_threshold for metric in metrics
    ]
    sustained_motion = [False] * len(raw_jump_candidates)
    index = 0
    while index < len(raw_jump_candidates):
        if not raw_jump_candidates[index]:
            index += 1
            continue
        end = index + 1
        while end < len(raw_jump_candidates) and raw_jump_candidates[end]:
            end += 1
        if end - index >= 3:
            for run_index in range(index, end):
                sustained_motion[run_index] = True
        index = end

    transitions = []
    for index, metric in enumerate(metrics, start=1):
        states = []
        if metric["meanAbsoluteDifference"] <= args.stall_threshold:
            states.append("near-static")
        if raw_jump_candidates[index - 1] and sustained_motion[index - 1]:
            states.append("sustained-motion")
        elif raw_jump_candidates[index - 1]:
            states.append("local-jump")
        # An A-B-A pattern is a dropped/repeated or oscillating frame candidate:
        # frames on either side are much closer to each other than either is to B.
        if index < len(frames) - 1:
            skip_metric = temporal_metrics(np.abs(frames[index + 1] - frames[index - 1]), args.pixel_threshold, args.tiles)
            if (
                skip_metric["maxTileMeanDifference"] <= args.stall_threshold * 4
                and metric["maxTileMeanDifference"] >= max(jump_threshold * 0.5, 0.04)
            ):
                states.append("two-frame-reversal")
        transitions.append(
            {
                "fromFrame": index - 1,
                "toFrame": index,
                "fromSeconds": round((index - 1) / args.fps, 6),
                "toSeconds": round(index / args.fps, 6),
                **{key: round(value, 7) for key, value in metric.items()},
                "states": states or ["normal"],
            }
        )

    payload = {
        "schemaVersion": 1,
        "source": {
            "file": str(source),
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "probe": video_probe,
        },
        "settings": {
            "fps": args.fps,
            "decodedWidth": args.width,
            "decodedHeight": height,
            "stallThreshold": args.stall_threshold,
            "pixelThreshold": args.pixel_threshold,
            "tiles": args.tiles,
            "jumpFactor": args.jump_factor,
            "localJumpTileThreshold": round(jump_threshold, 7),
        },
        "summary": {
            "decodedFrames": int(len(frames)),
            "transitions": int(len(transitions)),
            "medianMaxTileMeanDifference": round(median_tile_difference, 7),
            "nearStaticTransitions": sum("near-static" in item["states"] for item in transitions),
            "sustainedMotionTransitions": sum("sustained-motion" in item["states"] for item in transitions),
            "localJumpTransitions": sum("local-jump" in item["states"] for item in transitions),
            "twoFrameReversalCandidates": sum("two-frame-reversal" in item["states"] for item in transitions),
        },
        "transitions": transitions,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["summary"]))


if __name__ == "__main__":
    main()
