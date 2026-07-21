# BuyOrSell 4.0 Financial RAG & LLM Engine

## [So do/Kien truc]

```
Quant Signal Engine
  s_bos + factor points
        |
        v
RAG Retriever
  BCTC / resolutions / news / research chunks with citations
        |
        v
Instructor or Outlines structured generation
        |
        v
BosRagExplanation JSON
```

The LLM layer explains deterministic numbers. It does not calculate indicators or create new buy/sell signals.

## [Thuat toan/Code mau]

```python
from instructor import from_openai
from openai import OpenAI

from bos_rag import BosRagExplanation, build_explanation_payload

payload = build_explanation_payload(
    quant_snapshot_id="bos:TCB:2026-07-21T09:15:00+07:00",
    quant_row=bos_row_from_polars,
    rag_context=retrieved_chunks,
)

client = from_openai(OpenAI())
result: BosRagExplanation = client.chat.completions.create(
    model="gpt-4.1",
    response_model=payload["response_model"],
    messages=[
        {"role": "system", "content": payload["system"]},
        {"role": "user", "content": payload["user"]},
    ],
)
```

For Outlines, use `payload["json_schema"]` as the constrained JSON schema.

## [Ly do ky thuat & Toi uu]

- Pydantic `extra="forbid"` blocks unplanned fields and keeps API contracts stable.
- Validators force `s_bos` to match `weight_breakdown.total_s_bos`.
- Catalyst and risk claims require citations from the RAG context.
- Prompt explicitly blocks the LLM from recalculating or overriding the deterministic Quant Signal Engine.
