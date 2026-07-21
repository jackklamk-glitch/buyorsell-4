import unittest

from bos_rag.engine import build_explanation_payload
from bos_rag.schema import BosRagExplanation


class BosRagSchemaTest(unittest.TestCase):
    def test_builds_payload_with_pydantic_schema(self):
        payload = build_explanation_payload(
            quant_snapshot_id="snapshot-1",
            quant_row={
                "symbol": "TCB",
                "s_bos": 63.5,
                "momentum_score": 70.0,
                "volume_delta_score": 62.0,
                "foreign_flow_score": 58.0,
                "valuation_score": 60.0,
                "momentum_points": 24.5,
                "volume_delta_points": 15.5,
                "foreign_flow_points": 14.5,
                "valuation_points": 9.0,
            },
            rag_context=[
                {
                    "source_id": "fs-2026q2",
                    "title": "TCB Q2 financial statement",
                    "kind": "financial_statement",
                    "chunk_id": "fs-2026q2:p12:c3",
                    "quote": "Net interest income improved year over year.",
                }
            ],
        )

        self.assertIs(payload["response_model"], BosRagExplanation)
        self.assertEqual(payload["json_schema"]["title"], "BosRagExplanation")
        self.assertIn("Never compute, alter, invent, or override S_BOS", payload["system"])

    def test_schema_rejects_mismatched_breakdown_total(self):
        with self.assertRaises(ValueError):
            BosRagExplanation.model_validate(
                {
                    "schema_version": "bos_rag.v1",
                    "symbol": "TCB",
                    "generated_at": "2026-07-21T00:00:00Z",
                    "quant_snapshot_id": "snapshot-1",
                    "s_bos": 60,
                    "weight_breakdown": {
                        "momentum": {"weight": 0.35, "raw_value": 0.1, "factor_score": 50, "weighted_points": 10, "interpretation": "x"},
                        "volume_delta": {"weight": 0.25, "raw_value": 0.1, "factor_score": 50, "weighted_points": 10, "interpretation": "x"},
                        "foreign_flow": {"weight": 0.25, "raw_value": 0.1, "factor_score": 50, "weighted_points": 10, "interpretation": "x"},
                        "valuation": {"weight": 0.15, "raw_value": 0.1, "factor_score": 50, "weighted_points": 10, "interpretation": "x"},
                        "total_s_bos": 40,
                    },
                    "key_catalysts": [
                        {
                            "title": "Catalyst",
                            "impact": "positive",
                            "summary": "Evidence-backed catalyst.",
                            "citations": [
                                {
                                    "source_id": "n1",
                                    "title": "News",
                                    "kind": "news",
                                    "chunk_id": "n1:c1",
                                    "quote": "Quoted evidence.",
                                }
                            ],
                        }
                    ],
                    "risks": [],
                    "actionable_scenario": {
                        "stance": "WATCH",
                        "confidence_from_quant": 60,
                        "base_case": "Base case.",
                        "bull_case": "Bull case.",
                        "bear_case": "Bear case.",
                        "risk_reward": {
                            "entry_zone": {"low": 30, "high": 32},
                            "stop_loss": 28,
                            "take_profit_1": 36,
                            "take_profit_2": 40,
                            "max_position_pct": 10,
                            "invalidation_rule": "Invalid if price closes below support.",
                        },
                        "time_horizon": "T+20",
                    },
                    "limitations": [],
                }
            )


if __name__ == "__main__":
    unittest.main()
