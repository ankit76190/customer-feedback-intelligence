from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class SentimentEnum(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    NEEDS_REVIEW = "needs_review"

class UrgencyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    NEEDS_REVIEW = "needs_review"

class FeedbackItemAnalysis(BaseModel):
    """
    Validated structured AI evaluation for individual customer feedback.
    Follows strict anti-hallucination, untrusted-verbatim and grounded extraction rules.
    """
    sentiment: SentimentEnum = Field(
        ..., 
        description="Sentiment classification: positive, negative, neutral, or needs_review"
    )
    sentiment_reason: str = Field(
        ...,
        description="Short factual explanation strictly grounded in the verbatim text without inventing intentions"
    )
    primary_theme: str = Field(
        ..., 
        description="A meaningful category such as product quality, pricing, delivery, usability, support, or other"
    )
    secondary_themes: List[str] = Field(
        default_factory=list, 
        description="Optional secondary themes mentioned"
    )
    pain_points: List[str] = Field(
        default_factory=list, 
        description="List of specific customer friction points or bugs actually mentioned"
    )
    positive_aspects: List[str] = Field(
        default_factory=list,
        description="List of explicitly expressed strengths, compliments, or delighted experiences"
    )
    urgency: UrgencyLevel = Field(
        ...,
        description="Action urgency: low, medium, high, or needs_review"
    )
    summary: str = Field(
        ..., 
        description="Concise factual summary without invented facts or unsupported claims"
    )
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Model confidence score only if defensible; otherwise omitted"
    )

    # Backward compatibility helpers for UI and charts
    @property
    def concise_summary(self) -> str:
        return self.summary

    @property
    def improvement_opportunities(self) -> List[str]:
        # Formulate grounded opportunities from pain points if present
        return [f"Address {p.lower()}" for p in self.pain_points]

    @property
    def sentiment_score(self) -> float:
        """Normalized score for charts (-1.0 to 1.0)."""
        if self.sentiment == SentimentEnum.POSITIVE:
            return 1.0
        elif self.sentiment == SentimentEnum.NEGATIVE:
            return -1.0
        return 0.0

class BatchAnalysisPromptResponse(BaseModel):
    """Envelope schema for batch Gemini inference via response_schema."""
    items: List[FeedbackItemAnalysis] = Field(
        ...,
        description="List of structured feedback evaluations matching input order exactly"
    )

class ThemeMetric(BaseModel):
    theme: str
    count: int
    percentage: float
    positive_count: int
    negative_count: int
    neutral_count: int

class PainPointMetric(BaseModel):
    pain_point: str
    frequency: int
    urgency: UrgencyLevel
    sample_quote: Optional[str] = None

class TimeSeriesPoint(BaseModel):
    date: str  # YYYY-MM-DD
    total: int
    positive: int
    negative: int
    neutral: int
    needs_review: int

class BreakdownMetric(BaseModel):
    name: str
    count: int
    percentage: float
    positive_count: int
    negative_count: int
    neutral_count: int

class ExecutiveInsights(BaseModel):
    total_records: int
    analyzed_records: int
    classified_records: int = 0
    unclassified_records: int = 0
    needs_review_count: int = 0
    completion_rate: float = 0.0
    exclusions_disclaimer: str = ""

    sentiment_counts: dict  # {"Positive": count, "Negative": count, "Neutral": count, "Needs_Review": count}
    sentiment_percentages: dict  # Percentages strictly calculated over classified_records denominator
    net_sentiment_score: float  # (Positive - Negative) / classified_records * 100
    
    top_recurring_themes: List[ThemeMetric]
    critical_pain_points: List[PainPointMetric]
    top_improvement_opportunities: List[str]
    ai_executive_summary: str
    dataset_health: str

    # Time series metrics (valid dates strictly verified, missing dates excluded)
    has_valid_dates: bool = False
    dated_records_count: int = 0
    undated_records_count: int = 0
    time_series_data: List[TimeSeriesPoint] = []

    # Product and Category / Channel breakdown
    has_product_column: bool = False
    product_breakdown: List[BreakdownMetric] = []

    has_category_column: bool = False
    category_breakdown: List[BreakdownMetric] = []

    # Filter facets
    available_products: List[str] = []
    available_categories: List[str] = []
    available_themes: List[str] = []
    min_date: Optional[str] = None
    max_date: Optional[str] = None

class AnalysisJobResponse(BaseModel):
    job_id: str
    dataset_id: str
    status: str  # pending, in_progress, completed, failed, cancelled
    total_records: int
    processed_records: int
    failed_records: int
    cached_records: int
    batch_size: int
    model_used: str
    prompt_version: str
    duration_seconds: float
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

class ReportRecommendation(BaseModel):
    title: str
    action: str
    supporting_evidence: List[str] = []
    referenced_record_ids: List[str] = []
    priority: str = "Medium"

class RepresentativeExample(BaseModel):
    record_id: str
    sentiment: str
    theme: str
    rating: Optional[float] = None
    date: Optional[str] = None
    verbatim_text: str
    ai_summary: str
    key_quote: str

class TemporalShiftObservation(BaseModel):
    has_sufficient_data: bool
    observation: str
    date_range: Optional[str] = None
    dated_count: int = 0
    undated_count: int = 0
    direction: str = "insufficient_data"

class ThemeInsightDetail(BaseModel):
    theme: str
    observed_count: int
    share_percentage: float
    positive_count: int
    negative_count: int
    neutral_count: int
    sample_record_ids: List[str] = []
    representative_quotes: List[str] = []

class PainPointDetail(BaseModel):
    pain_point: str
    frequency: int
    urgency: str
    sample_quote: Optional[str] = None
    referenced_record_ids: List[str] = []

class PositiveHighlightDetail(BaseModel):
    highlight: str
    frequency: int
    sample_quote: Optional[str] = None
    referenced_record_ids: List[str] = []

class AiExecutiveReport(BaseModel):
    dataset_id: str
    generated_at: str
    total_records: int
    analyzed_records: int
    classified_records: int
    unclassified_records: int
    needs_review_count: int
    completion_rate: float
    net_sentiment_score: float
    executive_summary: str
    top_recurring_themes: List[ThemeInsightDetail] = []
    frequent_pain_points: List[PainPointDetail] = []
    positive_highlights: List[PositiveHighlightDetail] = []
    temporal_trends: TemporalShiftObservation
    actionable_recommendations: List[ReportRecommendation] = []
    representative_examples: List[RepresentativeExample] = []
    limitations_and_disclosures: List[str] = []
    model_attribution: str = "Grounding Engine / Google Gemini 2.5"

