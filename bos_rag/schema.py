from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


SignalStance = Literal["BUY", "SELL", "HOLD", "WATCH", "AVOID"]
EvidenceKind = Literal["financial_statement", "news", "resolution", "market_data", "research_note"]


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(min_length=1, description="Stable document id from the RAG store.")
    title: str = Field(min_length=1)
    kind: EvidenceKind
    published_at: str | None = Field(default=None, description="ISO-8601 date/time when available.")
    url: str | None = None
    page: int | None = Field(default=None, ge=1)
    chunk_id: str = Field(min_length=1)
    quote: str = Field(min_length=1, max_length=700)


class FactorContribution(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weight: float = Field(ge=0, le=1)
    raw_value: float | None = None
    factor_score: float = Field(ge=0, le=100)
    weighted_points: float = Field(ge=0, le=100)
    interpretation: str = Field(min_length=1, max_length=280)


class BosWeightBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    momentum: FactorContribution
    volume_delta: FactorContribution
    foreign_flow: FactorContribution
    valuation: FactorContribution
    total_s_bos: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def weighted_points_must_match_total(self) -> "BosWeightBreakdown":
        total = (
            self.momentum.weighted_points
            + self.volume_delta.weighted_points
            + self.foreign_flow.weighted_points
            + self.valuation.weighted_points
        )
        if abs(total - self.total_s_bos) > 0.25:
            raise ValueError("factor weighted_points must sum to total_s_bos")
        return self


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=140)
    impact: Literal["positive", "negative", "mixed", "neutral"]
    summary: str = Field(min_length=1, max_length=500)
    citations: list[Citation] = Field(min_length=1, max_length=5)


class PriceZone(BaseModel):
    model_config = ConfigDict(extra="forbid")

    low: float = Field(gt=0)
    high: float = Field(gt=0)

    @model_validator(mode="after")
    def low_must_not_exceed_high(self) -> "PriceZone":
        if self.low > self.high:
            raise ValueError("low must be less than or equal to high")
        return self


class RiskRewardPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entry_zone: PriceZone
    stop_loss: float = Field(gt=0)
    take_profit_1: float = Field(gt=0)
    take_profit_2: float | None = Field(default=None, gt=0)
    max_position_pct: float = Field(ge=0, le=100)
    invalidation_rule: str = Field(min_length=1, max_length=360)


class ActionableScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stance: SignalStance
    confidence_from_quant: float = Field(ge=0, le=100)
    base_case: str = Field(min_length=1, max_length=700)
    bull_case: str = Field(min_length=1, max_length=700)
    bear_case: str = Field(min_length=1, max_length=700)
    risk_reward: RiskRewardPlan
    time_horizon: Literal["T+3", "T+5", "T+20", "multi_horizon"]

    @field_validator("stance")
    @classmethod
    def forbid_unbacked_buy_sell(cls, value: SignalStance) -> SignalStance:
        return value


class BosRagExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["bos_rag.v1"] = "bos_rag.v1"
    symbol: str = Field(pattern=r"^[A-Z0-9]{1,10}$")
    generated_at: str
    quant_snapshot_id: str = Field(min_length=1)
    s_bos: float = Field(ge=0, le=100)
    weight_breakdown: BosWeightBreakdown
    key_catalysts: list[EvidenceItem] = Field(default_factory=list, max_length=5)
    risks: list[EvidenceItem] = Field(default_factory=list, max_length=5)
    actionable_scenario: ActionableScenario
    limitations: list[str] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def enforce_quant_consistency(self) -> "BosRagExplanation":
        if abs(self.s_bos - self.weight_breakdown.total_s_bos) > 0.01:
            raise ValueError("s_bos must equal weight_breakdown.total_s_bos")
        if not self.key_catalysts and not self.risks:
            raise ValueError("at least one cited catalyst or risk is required")
        return self
