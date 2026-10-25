import pytest
from app.models.feedback import FeedbackRecord
from app.models.analysis import FeedbackItemAnalysis, SentimentEnum, UrgencyLevel
from app.services.analytics_engine import AnalyticsEngine

def test_zero_records_handling():
    insights = AnalyticsEngine.calculate_insights([])
    assert insights.total_records == 0
    assert insights.analyzed_records == 0
    assert insights.classified_records == 0
    assert insights.completion_rate == 0.0
    assert insights.has_valid_dates is False
    assert insights.has_product_column is False
    assert insights.has_category_column is False
    assert len(insights.time_series_data) == 0
    assert len(insights.product_breakdown) == 0
    assert len(insights.category_breakdown) == 0
    assert "No records" in insights.exclusions_disclaimer

def test_missing_dates_are_never_interpreted_as_real_dates():
    records = [
        FeedbackRecord(
            id="rec-1",
            original_row_number=1,
            original_text="Great tool",
            cleaned_text="Great tool",
            date=None,  # Missing
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE,
                sentiment_reason="Customer praised the tool",
                primary_theme="Usability",
                urgency=UrgencyLevel.LOW,
                summary="Praise"
            )
        ),
        FeedbackRecord(
            id="rec-2",
            original_row_number=2,
            original_text="Terrible support",
            cleaned_text="Terrible support",
            date="not-a-real-date",  # Invalid string
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEGATIVE,
                sentiment_reason="Negative reaction to support",
                primary_theme="Support",
                urgency=UrgencyLevel.HIGH,
                summary="Complaint"
            )
        ),
        FeedbackRecord(
            id="rec-3",
            original_row_number=3,
            original_text="Acceptable",
            cleaned_text="Acceptable",
            date="NaN",  # Invalid
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEUTRAL,
                sentiment_reason="Neutral evaluation",
                primary_theme="Pricing",
                urgency=UrgencyLevel.LOW,
                summary="Neutral"
            )
        )
    ]
    insights = AnalyticsEngine.calculate_insights(records)
    assert insights.dated_records_count == 0
    assert insights.undated_records_count == 3
    assert insights.has_valid_dates is False
    assert len(insights.time_series_data) == 0

def test_valid_dates_time_series_aggregation():
    records = [
        FeedbackRecord(
            id="rec-1",
            original_row_number=1,
            original_text="Awesome",
            cleaned_text="Awesome",
            date="2025-01-10 14:00:00",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE,
                sentiment_reason="Expressed satisfaction",
                primary_theme="Speed",
                urgency=UrgencyLevel.LOW,
                summary="Awesome"
            )
        ),
        FeedbackRecord(
            id="rec-2",
            original_row_number=2,
            original_text="Poor quality",
            cleaned_text="Poor quality",
            date="2025-01-10 15:30:00",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEGATIVE,
                sentiment_reason="Expressed dissatisfaction",
                primary_theme="Quality",
                urgency=UrgencyLevel.HIGH,
                summary="Poor"
            )
        ),
        FeedbackRecord(
            id="rec-3",
            original_row_number=3,
            original_text="Very fast",
            cleaned_text="Very fast",
            date="2025-01-11 09:00:00",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE,
                sentiment_reason="Praised speed",
                primary_theme="Speed",
                urgency=UrgencyLevel.LOW,
                summary="Fast"
            )
        ),
    ]
    insights = AnalyticsEngine.calculate_insights(records)
    assert insights.dated_records_count == 3
    assert insights.undated_records_count == 0
    assert insights.has_valid_dates is True
    assert len(insights.time_series_data) == 2
    
    # 2025-01-10 has 1 positive, 1 negative
    day1 = [p for p in insights.time_series_data if p.date == "2025-01-10"][0]
    assert day1.total == 2
    assert day1.positive == 1
    assert day1.negative == 1

    # 2025-01-11 has 1 positive
    day2 = [p for p in insights.time_series_data if p.date == "2025-01-11"][0]
    assert day2.total == 1
    assert day2.positive == 1

def test_clearly_defined_denominators_and_exclusions_disclosure():
    # 10 records: 4 Positive, 2 Negative, 2 Neutral, 1 Needs_Review, 1 Unanalyzed
    records = []
    # 4 positive
    for i in range(4):
        records.append(FeedbackRecord(
            id=f"pos-{i}", original_row_number=i+1, original_text="Great", cleaned_text="Great",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE, sentiment_reason="Reason", primary_theme="UX",
                urgency=UrgencyLevel.LOW, summary="Sum"
            )
        ))
    # 2 negative
    for i in range(2):
        records.append(FeedbackRecord(
            id=f"neg-{i}", original_row_number=i+5, original_text="Bad", cleaned_text="Bad",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEGATIVE, sentiment_reason="Reason", primary_theme="UX",
                urgency=UrgencyLevel.HIGH, summary="Sum"
            )
        ))
    # 2 neutral
    for i in range(2):
        records.append(FeedbackRecord(
            id=f"neu-{i}", original_row_number=i+7, original_text="Okay", cleaned_text="Okay",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEUTRAL, sentiment_reason="Reason", primary_theme="UX",
                urgency=UrgencyLevel.LOW, summary="Sum"
            )
        ))
    # 1 needs review
    records.append(FeedbackRecord(
        id="rev-1", original_row_number=9, original_text="Ambiguous", cleaned_text="Ambiguous",
        analysis=FeedbackItemAnalysis(
            sentiment=SentimentEnum.NEEDS_REVIEW, sentiment_reason="Ambiguous", primary_theme="Other",
            urgency=UrgencyLevel.NEEDS_REVIEW, summary="Sum"
        )
    ))
    # 1 unanalyzed
    records.append(FeedbackRecord(
        id="pending-1", original_row_number=10, original_text="Pending", cleaned_text="Pending",
        analysis=None
    ))

    insights = AnalyticsEngine.calculate_insights(records)
    assert insights.total_records == 10
    assert insights.analyzed_records == 9
    assert insights.classified_records == 8  # 4 + 2 + 2
    assert insights.unclassified_records == 2  # 1 needs_review + 1 pending
    assert insights.completion_rate == 90.0

    # Percentages strictly calculated over classified_records (8):
    # Positive: 4 / 8 = 50.0%
    assert insights.sentiment_percentages["Positive"] == 50.0
    # Negative: 2 / 8 = 25.0%
    assert insights.sentiment_percentages["Negative"] == 25.0
    # Neutral: 2 / 8 = 25.0%
    assert insights.sentiment_percentages["Neutral"] == 25.0
    # Net Sentiment: (4 - 2) / 8 * 100 = +25.0
    assert insights.net_sentiment_score == 25.0

    # Exclusions disclosed in disclaimer
    assert "8 classified records" in insights.exclusions_disclaimer
    assert "2 records" in insights.exclusions_disclaimer

def test_missing_optional_product_and_category_columns():
    records = [
        FeedbackRecord(
            id="1", original_row_number=1, original_text="Text", cleaned_text="Text",
            product=None, category=None,
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE, sentiment_reason="Reason", primary_theme="UX",
                urgency=UrgencyLevel.LOW, summary="Sum"
            )
        )
    ]
    insights = AnalyticsEngine.calculate_insights(records)
    assert insights.has_product_column is False
    assert len(insights.product_breakdown) == 0
    assert insights.has_category_column is False
    assert len(insights.category_breakdown) == 0

def test_product_and_category_breakdown_when_present():
    records = [
        FeedbackRecord(
            id="1", original_row_number=1, original_text="T1", cleaned_text="T1",
            product="Analytics Pro", category="In-App",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE, sentiment_reason="Reason", primary_theme="UX",
                urgency=UrgencyLevel.LOW, summary="Sum"
            )
        ),
        FeedbackRecord(
            id="2", original_row_number=2, original_text="T2", cleaned_text="T2",
            product="Analytics Pro", category="Email",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEGATIVE, sentiment_reason="Reason", primary_theme="UX",
                urgency=UrgencyLevel.HIGH, summary="Sum"
            )
        ),
        FeedbackRecord(
            id="3", original_row_number=3, original_text="T3", cleaned_text="T3",
            product="Data Sync", category="In-App",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE, sentiment_reason="Reason", primary_theme="UX",
                urgency=UrgencyLevel.LOW, summary="Sum"
            )
        )
    ]
    insights = AnalyticsEngine.calculate_insights(records)
    assert insights.has_product_column is True
    assert len(insights.product_breakdown) == 2
    assert insights.product_breakdown[0].name == "Analytics Pro"
    assert insights.product_breakdown[0].count == 2
    assert insights.product_breakdown[0].positive_count == 1
    assert insights.product_breakdown[0].negative_count == 1

    assert insights.has_category_column is True
    assert len(insights.category_breakdown) == 2
    assert insights.category_breakdown[0].name == "In-App"
    assert insights.category_breakdown[0].count == 2

def test_filtering_records():
    records = [
        FeedbackRecord(
            id="1", original_row_number=1, original_text="Fast dashboard", cleaned_text="Fast dashboard",
            date="2025-01-05", product="SaaS App", category="Web",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE, sentiment_reason="Reason", primary_theme="Speed",
                urgency=UrgencyLevel.LOW, summary="Dashboard is fast"
            )
        ),
        FeedbackRecord(
            id="2", original_row_number=2, original_text="Slow billing", cleaned_text="Slow billing",
            date="2025-01-15", product="Billing Pro", category="Email",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEGATIVE, sentiment_reason="Reason", primary_theme="Pricing",
                urgency=UrgencyLevel.HIGH, summary="Billing is slow"
            )
        )
    ]

    # Filter by sentiment
    res_pos = AnalyticsEngine.filter_records(records, sentiment="Positive")
    assert len(res_pos) == 1
    assert res_pos[0].id == "1"

    # Filter by theme
    res_theme = AnalyticsEngine.filter_records(records, theme="Pricing")
    assert len(res_theme) == 1
    assert res_theme[0].id == "2"

    # Filter by product
    res_prod = AnalyticsEngine.filter_records(records, product="SaaS App")
    assert len(res_prod) == 1
    assert res_prod[0].id == "1"

    # Filter by date range
    res_date = AnalyticsEngine.filter_records(records, start_date="2025-01-10", end_date="2025-01-20")
    assert len(res_date) == 1
    assert res_date[0].id == "2"

    # Filter by search
    res_search = AnalyticsEngine.filter_records(records, search="dashboard")
    assert len(res_search) == 1
    assert res_search[0].id == "1"


def test_seeded_fixtures_in_dataset_store():
    from app.services.dataset_store import dataset_store

    # 1. Zero records fixture
    zero_ds = dataset_store.get_dataset("fixture-zero-records")
    assert zero_ds is not None
    zero_ins = AnalyticsEngine.calculate_insights(zero_ds["records"])
    assert zero_ins.total_records == 0
    assert zero_ins.analyzed_records == 0
    assert zero_ins.classified_records == 0
    assert zero_ins.completion_rate == 0.0
    assert zero_ins.has_valid_dates is False
    assert len(zero_ins.time_series_data) == 0

    # 2. Missing dates fixture
    missing_ds = dataset_store.get_dataset("fixture-missing-dates")
    assert missing_ds is not None
    missing_ins = AnalyticsEngine.calculate_insights(missing_ds["records"])
    assert missing_ins.total_records == 3
    assert missing_ins.dated_records_count == 0
    assert missing_ins.undated_records_count == 3
    assert missing_ins.has_valid_dates is False
    assert len(missing_ins.time_series_data) == 0

    # 3. Partially analyzed fixture
    partial_ds = dataset_store.get_dataset("fixture-partially-analyzed")
    assert partial_ds is not None
    partial_ins = AnalyticsEngine.calculate_insights(partial_ds["records"])
    assert partial_ins.total_records == 6
    assert partial_ins.analyzed_records == 3
    assert partial_ins.completion_rate == 50.0
    assert partial_ins.classified_records == 3
    assert partial_ins.unclassified_records == 3
    assert "3 classified records" in partial_ins.exclusions_disclaimer

    # 4. No optional columns fixture
    no_opt_ds = dataset_store.get_dataset("fixture-no-optional-cols")
    assert no_opt_ds is not None
    no_opt_ins = AnalyticsEngine.calculate_insights(no_opt_ds["records"])
    assert no_opt_ins.total_records == 2
    assert no_opt_ins.has_product_column is False
    assert no_opt_ins.has_category_column is False
    assert len(no_opt_ins.product_breakdown) == 0
    assert len(no_opt_ins.category_breakdown) == 0

    # 5. Production sample-saas dataset
    prod_ds = dataset_store.get_dataset("sample-saas")
    assert prod_ds is not None
    prod_ins = AnalyticsEngine.calculate_insights(prod_ds["records"])
    assert prod_ins.total_records == 50
    assert prod_ins.analyzed_records == 50
    assert prod_ins.classified_records == 48
    assert prod_ins.needs_review_count == 2
    assert prod_ins.has_valid_dates is True
    assert prod_ins.has_category_column is True
    assert len(prod_ins.top_recurring_themes) > 0
    assert len(prod_ins.critical_pain_points) > 0


def test_pain_point_and_sentiment_reason_search_filtering():
    records = [
        FeedbackRecord(
            id="1", original_row_number=1, original_text="Everything works", cleaned_text="Everything works",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.POSITIVE, sentiment_reason="Customer praised smooth experience",
                primary_theme="Speed", secondary_themes=[], pain_points=[], positive_aspects=["Smooth UX"],
                urgency=UrgencyLevel.LOW, summary="Smooth experience"
            )
        ),
        FeedbackRecord(
            id="2", original_row_number=2, original_text="Broken system", cleaned_text="Broken system",
            analysis=FeedbackItemAnalysis(
                sentiment=SentimentEnum.NEGATIVE, sentiment_reason="Customer experienced severe login lag",
                primary_theme="Authentication", secondary_themes=[], pain_points=["Delayed password reset emails"],
                positive_aspects=[], urgency=UrgencyLevel.HIGH, summary="Password reset failure"
            )
        )
    ]

    # Search for pain point keyword
    res = AnalyticsEngine.filter_records(records, search="password reset")
    assert len(res) == 1
    assert res[0].id == "2"

    # Search for sentiment reason keyword
    res2 = AnalyticsEngine.filter_records(records, search="login lag")
    assert len(res2) == 1
    assert res2[0].id == "2"

