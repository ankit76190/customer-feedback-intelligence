import pytest
from app.models.feedback import FeedbackRecord
from app.models.analysis import FeedbackItemAnalysis, SentimentEnum, UrgencyLevel
from app.services.analytics_engine import AnalyticsEngine

def test_analytics_calculation():
    # 2 positive, 1 negative, 1 neutral record
    records = [
        FeedbackRecord(
            id="1",
            original_row_number=2,
            original_text="Love this!",
            cleaned_text="Love this!",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE,
                sentiment_reason="Customer explicitly expressed love for the product",
                primary_theme="UI & UX",
                secondary_themes=["Design"],
                pain_points=[],
                positive_aspects=["Design"],
                urgency=UrgencyLevel.LOW,
                summary="Customer loved the design."
            )
        ),
        FeedbackRecord(
            id="2",
            original_row_number=3,
            original_text="Amazing support team",
            cleaned_text="Amazing support team",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE,
                sentiment_reason="Customer praised the support team as amazing",
                primary_theme="Customer Support",
                secondary_themes=[],
                pain_points=[],
                positive_aspects=["Support response"],
                urgency=UrgencyLevel.LOW,
                summary="Great support."
            )
        ),
        FeedbackRecord(
            id="3",
            original_row_number=4,
            original_text="System keeps crashing",
            cleaned_text="System keeps crashing",
            rating=1.0,
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEGATIVE,
                sentiment_reason="Customer reported repeated crashes on startup",
                primary_theme="Performance",
                secondary_themes=[],
                pain_points=["Crashing on startup"],
                positive_aspects=[],
                urgency=UrgencyLevel.HIGH,
                summary="Customer reporting repeated crashes."
            )
        ),
        FeedbackRecord(
            id="4",
            original_row_number=5,
            original_text="How do I change password?",
            cleaned_text="How do I change password?",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEUTRAL,
                sentiment_reason="Factual password reset inquiry without emotional language",
                primary_theme="Account Settings",
                secondary_themes=[],
                pain_points=[],
                positive_aspects=[],
                urgency=UrgencyLevel.MEDIUM,
                summary="Password inquiry."
            )
        ),
    ]

    insights = AnalyticsEngine.calculate_insights(records)

    assert insights.total_records == 4
    assert insights.analyzed_records == 4
    assert insights.sentiment_counts["Positive"] == 2
    assert insights.sentiment_counts["Negative"] == 1
    assert insights.sentiment_counts["Neutral"] == 1
    # Net Sentiment Score = (2 - 1) / 4 * 100 = +25.0
    assert insights.net_sentiment_score == 25.0
    assert len(insights.critical_pain_points) == 1
    assert insights.critical_pain_points[0].pain_point == "Crashing on startup"
