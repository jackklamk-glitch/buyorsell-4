from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .prompts import BOS_RAG_SYSTEM_PROMPT, render_bos_rag_user_prompt
from .schema import BosRagExplanation


FACTOR_KEYS = {
    "momentum": ("momentum_score", "momentum_points", "momentum_raw", 0.35),
    "volume_delta": ("volume_delta_score", "volume_delta_points", "volume_delta_raw", 0.25),
    "foreign_flow": ("foreign_flow_score", "foreign_flow_points", "foreign_flow_raw", 0.25),
    "valuation": ("valuation_score", "valuation_points", "valuation_raw", 0.15),
}


def build_explanation_payload(
    *,
    quant_row: dict[str, Any],
    rag_context: list[dict[str, Any]],
    quant_snapshot_id: str,
) -> dict[str, Any]:
    """Build a strict LLM request payload from deterministic quant + RAG evidence."""

    quant_snapshot = {
        "symbol": quant_row["symbol"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "quant_snapshot_id": quant_snapshot_id,
        "s_bos": _number(quant_row["s_bos"]),
        "weight_breakdown": _weight_breakdown_from_quant(quant_row),
        "price_context": {
            "price": _optional_number(quant_row.get("price")),
            "prev_close": _optional_number(quant_row.get("prev_close")),
            "support": _optional_number(quant_row.get("support")),
            "resistance": _optional_number(quant_row.get("resistance")),
            "atr14": _optional_number(quant_row.get("atr14")),
        },
        "data_quality": _optional_number(quant_row.get("data_quality")),
    }
    schema = BosRagExplanation.model_json_schema()
    return {
        "system": BOS_RAG_SYSTEM_PROMPT,
        "user": render_bos_rag_user_prompt(
            quant_snapshot=quant_snapshot,
            rag_context=rag_context,
            output_schema=schema,
        ),
        "response_model": BosRagExplanation,
        "json_schema": schema,
    }


def _weight_breakdown_from_quant(quant_row: dict[str, Any]) -> dict[str, Any]:
    breakdown: dict[str, Any] = {}
    for factor, (score_key, points_key, raw_key, weight) in FACTOR_KEYS.items():
        breakdown[factor] = {
            "weight": weight,
            "raw_value": _optional_number(quant_row.get(raw_key)),
            "factor_score": _number(quant_row[score_key]),
            "weighted_points": _number(quant_row[points_key]),
            "interpretation": f"{factor} contribution supplied by deterministic Quant Signal Engine.",
        }
    breakdown["total_s_bos"] = _number(quant_row["s_bos"])
    return breakdown


def _number(value: Any) -> float:
    if value is None:
        raise ValueError("required numeric value is missing")
    return float(value)


def _optional_number(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)
