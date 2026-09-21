"""Export sign clips as static (held still) MP4s from their first frame."""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import imageio.v2 as imageio
import numpy as np

OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "signs" / "videos"
FPS = 24
SECONDS = 2.5

ALIASES = {
    "word-please": "lawyer-01b",
    "word-ask": "lawyer-02b",
    "word-case": "lawyer-10b",
    "word-when": "lawyer-03",
    "word-evidence": "lawyer-05b",
    "word-paper": "lawyer-06b",
    "word-protect": "lawyer-07",
    "word-help": "lawyer-08b",
    "word-write": "lawyer-09",
    "word-follow": "lawyer-10",
}


def first_frame(path: Path) -> np.ndarray:
    cap = cv2.VideoCapture(str(path))
    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        raise RuntimeError(f"cannot read: {path}")
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)


def write_static(frame: np.ndarray, dst: Path) -> None:
    frame = cv2.resize(frame, (720, 540), interpolation=cv2.INTER_AREA)
    n = max(int(SECONDS * FPS), 1)
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(f".tmp-{dst.name}")
    writer = imageio.get_writer(
        tmp,
        fps=FPS,
        codec="libx264",
        quality=7,
        pixelformat="yuv420p",
        macro_block_size=1,
    )
    try:
        for _ in range(n):
            writer.append_data(frame)
    finally:
        writer.close()
    try:
        tmp.replace(dst)
    except PermissionError:
        dst.write_bytes(tmp.read_bytes())
        tmp.unlink(missing_ok=True)


def main() -> None:
    primaries = sorted(
        p
        for p in OUT_DIR.glob("*.mp4")
        if not p.name.startswith(".") and p.stem not in ALIASES
    )
    for src in primaries:
        snap = OUT_DIR / f".snap-{src.stem}.png"
        frame = first_frame(src)
        imageio.imwrite(snap, frame)
        write_static(frame, src)
        snap.unlink(missing_ok=True)
        print(f"static {src.name}")

    for alias, source in ALIASES.items():
        src_mp4 = OUT_DIR / f"{source}.mp4"
        dst_mp4 = OUT_DIR / f"{alias}.mp4"
        if src_mp4.exists():
            dst_mp4.write_bytes(src_mp4.read_bytes())
            print(f"copied {alias}.mp4")


if __name__ == "__main__":
    main()
