from __future__ import annotations

import json
from typing import Any


BOS_RAG_SYSTEM_PROMPT = """You are the BuyOrSell 4.0 Financial RAG & LLM Engine.

Non-negotiable rules:
1. You are an explanation layer only. Never compute, alter, invent, or override S_BOS.
2. The deterministic Quant Signal Engine is the only source of s_bos, factor scores, weighted points, and confidence_from_quant.
3. Do not create a new BUY/SELL signal. If a stance is required, map it conservatively from the supplied quant snapshot and state uncertainty in limitations.
4. Every catalyst and risk must cite at least one provided RAG document chunk. If evidence is missing, omit the claim or add a limitation.
5. Do not cite sources that are not present in the supplied RAG context.
6. Actionable scenarios must be conditional plans, not guarantees. Entry, stop loss, and take profit must be anchored to supplied price data or explicit user-provided levels.
7. Return only valid JSON matching the provided schema. No markdown, no prose outside JSON.

Interpretation policy:
- s_bos >= 72: strong positive quant alignment.
- 58 <= s_bos < 72: constructive watch / selective participation.
- 42 <= s_bos < 58: neutral or needs confirmation.
- s_bos < 42: defensive or avoid unless separate mandate exists.
- Missing or stale evidence must lower narrative confidence, not change s_bos.
"""


def render_bos_rag_user_prompt(
    *,
    quant_snapshot: dict[str, Any],
    rag_context: list[dict[str, Any]],
    output_schema: dict[str, Any],
) -> str:
    return "\n".join(
        [
            "Build one JSON explanation for the supplied BuyOrSell quant snapshot.",
            "Use the JSON schema exactly.",
            "",
            "QUANT_SNAPSHOT:",
            json.dumps(quant_snapshot, ensure_ascii=False, separators=(",", ":")),
            "",
            "RAG_CONTEXT:",
            json.dumps(rag_context, ensure_ascii=False, separators=(",", ":")),
            "",
            "OUTPUT_JSON_SCHEMA:",
            json.dumps(output_schema, ensure_ascii=False, separators=(",", ":")),
        ]
    )
