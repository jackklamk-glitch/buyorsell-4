from __future__ import annotations

import argparse
import json
from pathlib import Path

import polars as pl

from bos_quant import BosScoreConfig, compute_bos_scores


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute deterministic BOS scores with Polars.")
    parser.add_argument("input", type=Path, help="CSV, Parquet, JSON, or NDJSON quote snapshot")
    parser.add_argument("--top", type=int, default=50, help="Number of ranked symbols to emit")
    parser.add_argument("--json", action="store_true", help="Emit compact JSON rows instead of a table")
    args = parser.parse_args()

    quotes = _read_frame(args.input)
    scores = compute_bos_scores(quotes, BosScoreConfig()).head(max(args.top, 1))

    if args.json:
        print(json.dumps(scores.to_dicts(), ensure_ascii=False, separators=(",", ":")))
    else:
        print(scores)


def _read_frame(path: Path) -> pl.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pl.read_csv(path)
    if suffix in {".parquet", ".pq"}:
        return pl.read_parquet(path)
    if suffix in {".ndjson", ".jsonl"}:
        return pl.read_ndjson(path)
    if suffix == ".json":
        return pl.read_json(path)
    raise ValueError(f"unsupported input format: {path.suffix}")


if __name__ == "__main__":
    main()
