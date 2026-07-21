from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import polars as pl


@dataclass(frozen=True)
class BosFactorWeights:
    momentum: float = 0.35
    volume_delta: float = 0.25
    foreign_flow: float = 0.25
    valuation: float = 0.15

    def normalized(self) -> "BosFactorWeights":
        total = self.momentum + self.volume_delta + self.foreign_flow + self.valuation
        if total <= 0:
            raise ValueError("factor weights must sum to a positive number")
        return BosFactorWeights(
            momentum=self.momentum / total,
            volume_delta=self.volume_delta / total,
            foreign_flow=self.foreign_flow / total,
            valuation=self.valuation / total,
        )


@dataclass(frozen=True)
class BosScoreConfig:
    weights: BosFactorWeights = BosFactorWeights()
    zscore_width: float = 12.5
    min_score: float = 0.0
    max_score: float = 100.0


NUMERIC_INPUTS = (
    "price",
    "prev_close",
    "open",
    "volume",
    "adv20",
    "buy_volume",
    "sell_volume",
    "foreign_buy_volume",
    "foreign_sell_volume",
    "foreign_buy_value",
    "foreign_sell_value",
    "market_cap",
    "ret_1m",
    "ret_5d",
    "ret_20d",
    "pe",
    "pb",
    "sector_pe",
    "sector_pb",
    "roe",
)


def compute_bos_scores(
    quotes: pl.DataFrame | pl.LazyFrame | Iterable[dict],
    config: BosScoreConfig = BosScoreConfig(),
) -> pl.DataFrame:
    """Compute deterministic BuyOrSell multi-factor scores for a realtime batch.

    The engine accepts a current cross-section snapshot or micro-batch. It does
    not call upstream APIs and does not use any generative model.
    """

    lf = _as_lazy_frame(quotes)
    weights = config.weights.normalized()

    scored = (
        _ensure_numeric_columns(lf)
        .with_columns(
            intraday_ret=_safe_ratio(pl.col("price"), pl.col("prev_close")) - 1.0,
            open_ret=_safe_ratio(pl.col("price"), pl.col("open")) - 1.0,
            buy_sell_imbalance=_safe_ratio(
                pl.col("buy_volume") - pl.col("sell_volume"),
                pl.col("buy_volume") + pl.col("sell_volume"),
            ),
            volume_impulse=(
                _safe_ratio(pl.col("volume"), pl.col("adv20"))
                .clip(0.0, 10.0)
                .log()
                .fill_nan(None)
            ),
            foreign_net_volume=pl.col("foreign_buy_volume") - pl.col("foreign_sell_volume"),
            foreign_net_value=pl.col("foreign_buy_value") - pl.col("foreign_sell_value"),
            foreign_volume_ratio=_safe_ratio(
                pl.col("foreign_buy_volume") - pl.col("foreign_sell_volume"),
                pl.col("volume"),
            ),
            foreign_value_ratio=_safe_ratio(
                pl.col("foreign_buy_value") - pl.col("foreign_sell_value"),
                pl.col("market_cap"),
            ),
            pe_discount=_safe_ratio(pl.col("sector_pe"), pl.col("pe")) - 1.0,
            pb_discount=_safe_ratio(pl.col("sector_pb"), pl.col("pb")) - 1.0,
        )
        .with_columns(
            momentum_raw=(
                0.45 * pl.coalesce([pl.col("ret_1m"), pl.col("intraday_ret"), pl.lit(0.0)])
                + 0.35 * pl.coalesce([pl.col("ret_5d"), pl.col("open_ret"), pl.lit(0.0)])
                + 0.20 * pl.coalesce([pl.col("ret_20d"), pl.lit(0.0)])
            ),
            volume_delta_raw=(
                0.70 * pl.coalesce([pl.col("buy_sell_imbalance"), pl.lit(0.0)])
                + 0.30 * pl.coalesce([pl.col("volume_impulse"), pl.lit(0.0)])
            ),
            foreign_flow_raw=(
                0.60 * pl.coalesce([pl.col("foreign_value_ratio") * 1_000.0, pl.lit(0.0)])
                + 0.40 * pl.coalesce([pl.col("foreign_volume_ratio"), pl.lit(0.0)])
            ),
            valuation_raw=(
                0.40 * pl.coalesce([pl.col("pe_discount"), pl.lit(0.0)])
                + 0.30 * pl.coalesce([pl.col("pb_discount"), pl.lit(0.0)])
                + 0.30 * pl.coalesce([pl.col("roe"), pl.lit(0.0)])
            ),
        )
    )

    factor_names = ("momentum", "volume_delta", "foreign_flow", "valuation")
    for name in factor_names:
        scored = scored.with_columns(
            _factor_score_expr(f"{name}_raw", f"{name}_score", config)
        )

    scored = scored.with_columns(
        momentum_points=pl.col("momentum_score") * weights.momentum,
        volume_delta_points=pl.col("volume_delta_score") * weights.volume_delta,
        foreign_flow_points=pl.col("foreign_flow_score") * weights.foreign_flow,
        valuation_points=pl.col("valuation_score") * weights.valuation,
    ).with_columns(
        s_bos=(
            pl.col("momentum_points")
            + pl.col("volume_delta_points")
            + pl.col("foreign_flow_points")
            + pl.col("valuation_points")
        ).round(2),
        data_quality=_data_quality_expr(),
    )

    optional_cols = [c for c in ("ts", "exchange", "sector") if c in scored.collect_schema()]
    return scored.select(
        [
            "symbol",
            *optional_cols,
            pl.col("s_bos"),
            pl.col("momentum_score").round(2),
            pl.col("volume_delta_score").round(2),
            pl.col("foreign_flow_score").round(2),
            pl.col("valuation_score").round(2),
            pl.col("momentum_points").round(2),
            pl.col("volume_delta_points").round(2),
            pl.col("foreign_flow_points").round(2),
            pl.col("valuation_points").round(2),
            pl.col("momentum_raw").round(6),
            pl.col("volume_delta_raw").round(6),
            pl.col("foreign_flow_raw").round(6),
            pl.col("valuation_raw").round(6),
            pl.col("foreign_net_volume"),
            pl.col("foreign_net_value"),
            pl.col("data_quality").round(2),
        ]
    ).sort("s_bos", descending=True).collect()


def _as_lazy_frame(quotes: pl.DataFrame | pl.LazyFrame | Iterable[dict]) -> pl.LazyFrame:
    if isinstance(quotes, pl.LazyFrame):
        return quotes
    if isinstance(quotes, pl.DataFrame):
        return quotes.lazy()
    return pl.DataFrame(list(quotes)).lazy()


def _ensure_numeric_columns(lf: pl.LazyFrame) -> pl.LazyFrame:
    schema = lf.collect_schema()
    missing = [name for name in NUMERIC_INPUTS if name not in schema]
    if "symbol" not in schema:
        raise ValueError("quotes must contain a symbol column")
    return lf.with_columns([pl.lit(None).alias(name) for name in missing]).with_columns(
        pl.col(name).cast(pl.Float64, strict=False) for name in NUMERIC_INPUTS
    )


def _safe_ratio(numerator: pl.Expr, denominator: pl.Expr) -> pl.Expr:
    return (
        pl.when(denominator.is_not_null() & (denominator != 0))
        .then(numerator / denominator)
        .otherwise(None)
        .fill_nan(None)
    )


def _factor_score_expr(raw_col: str, score_col: str, config: BosScoreConfig) -> pl.Expr:
    raw = pl.col(raw_col)
    z = _safe_ratio(raw - raw.mean(), raw.std(ddof=0))
    return (
        (50.0 + config.zscore_width * z.fill_null(0.0))
        .clip(config.min_score, config.max_score)
        .alias(score_col)
    )


def _data_quality_expr() -> pl.Expr:
    required_groups = [
        pl.col("price").is_not_null() & pl.col("prev_close").is_not_null(),
        pl.col("volume").is_not_null()
        & (
            (pl.col("buy_volume").is_not_null() & pl.col("sell_volume").is_not_null())
            | pl.col("adv20").is_not_null()
        ),
        (pl.col("foreign_buy_volume").is_not_null() & pl.col("foreign_sell_volume").is_not_null())
        | (pl.col("foreign_buy_value").is_not_null() & pl.col("foreign_sell_value").is_not_null()),
        (pl.col("pe").is_not_null() & pl.col("sector_pe").is_not_null())
        | (pl.col("pb").is_not_null() & pl.col("sector_pb").is_not_null())
        | pl.col("roe").is_not_null(),
    ]
    return sum(expr.cast(pl.Float64) for expr in required_groups) / float(len(required_groups))
