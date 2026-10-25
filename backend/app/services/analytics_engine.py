from typing import List, Dict, Any, Optional, Tuple
from collections import Counter
from datetime import datetime
import pandas as pd

from app.models.analysis import (
    ExecutiveInsights, 
    ThemeMetric, 
    PainPointMetric, 
    UrgencyLevel, 
    SentimentEnum,
    TimeSeriesPoint,
    BreakdownMetric
)
from app.models.feedback import FeedbackRecord

def normalize_sentiment_label(sent: Any) -> str:
    """Normalizes sentiment into consistent display label."""
    if not sent:
        return "Needs_Review"
    val = sent.value if hasattr(sent, "value") else str(sent)
    val_lower = val.lower().strip()
    if val_lower == "positive":
        return "Positive"
    elif val_lower == "negative":
        return "Negative"
    elif val_lower == "neutral":
        return "Neutral"
    return "Needs_Review"

def extract_date_str(val: Any) -> Optional[str]:
    """
    Safely extracts YYYY-MM-DD strictly from valid real dates.
    Never invents dates and rejects NaNs, nulls, or invalid calendar strings.
    """
    if not val:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "nat", "null", "undefined"):
        return None
    # Quick ISO prefix check YYYY-MM-DD
    if len(s) >= 10 and s[4] == '-' and s[7] == '-':
        prefix = s[:10]
        try:
            datetime.strptime(prefix, "%Y-%m-%d")
            return prefix
        except ValueError:
            pass
    # Pandas flexible fallback
    try:
        ts = pd.to_datetime(s, errors="coerce")
        if pd.notna(ts):
            return ts.strftime("%Y-%m-%d")
    except Exception:
        pass
    return None

class AnalyticsEngine:
    """
    Computes production-grade, data-driven executive metrics, time series,
    product/category breakdowns, themes, and pain-point rankings.
    """

    @staticmethod
    def filter_records(
        records: List[FeedbackRecord],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        sentiment: Optional[str] = None,
        theme: Optional[str] = None,
        product: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[FeedbackRecord]:
        """Filters in-memory record list using multi-faceted criteria."""
        filtered = records

        if search:
            q = search.lower().strip()
            filtered = [
                r for r in filtered
                if q in r.cleaned_text.lower()
                or q in r.original_text.lower()
                or q in r.id.lower()
                or (r.analysis and (
                    q in r.analysis.summary.lower()
                    or any(q in pp.lower() for pp in r.analysis.pain_points)
                    or (r.analysis.sentiment_reason and q in r.analysis.sentiment_reason.lower())
                ))
                or (r.product and q in r.product.lower())
                or (r.category and q in r.category.lower())
            ]

        if sentiment and sentiment.lower() != "all":
            target = sentiment.lower()
            filtered = [
                r for r in filtered
                if r.analysis and normalize_sentiment_label(r.analysis.sentiment).lower() == target
            ]

        if theme and theme.lower() != "all":
            t_low = theme.lower()
            filtered = [
                r for r in filtered
                if r.analysis and (
                    (r.analysis.primary_theme and r.analysis.primary_theme.lower() == t_low)
                    or any(st.lower() == t_low for st in r.analysis.secondary_themes)
                )
            ]

        if product and product.lower() != "all":
            p_low = product.lower()
            filtered = [
                r for r in filtered
                if r.product and r.product.lower() == p_low
            ]

        if category and category.lower() != "all":
            c_low = category.lower()
            filtered = [
                r for r in filtered
                if r.category and r.category.lower() == c_low
            ]

        if start_date:
            filtered = [
                r for r in filtered
                if extract_date_str(r.date) and extract_date_str(r.date) >= start_date
            ]

        if end_date:
            filtered = [
                r for r in filtered
                if extract_date_str(r.date) and extract_date_str(r.date) <= end_date
            ]

        return filtered

    @staticmethod
    def calculate_insights(records: List[FeedbackRecord]) -> ExecutiveInsights:
        total_records = len(records)
        analyzed = [r for r in records if r.analysis is not None]
        analyzed_count = len(analyzed)

        # Collect available filter facets
        available_products = sorted(list({r.product.strip() for r in records if r.product and r.product.strip()}))
        available_categories = sorted(list({r.category.strip() for r in records if r.category and r.category.strip()}))
        available_themes = sorted(list({
            r.analysis.primary_theme.strip() 
            for r in analyzed 
            if r.analysis and r.analysis.primary_theme and r.analysis.primary_theme.strip()
        }))

        # 1. Date & Time Series Calculations
        date_buckets: Dict[str, Dict[str, int]] = {}
        dated_records_count = 0
        undated_records_count = 0

        for r in records:
            d_str = extract_date_str(r.date)
            if d_str:
                dated_records_count += 1
                if d_str not in date_buckets:
                    date_buckets[d_str] = {
                        "total": 0, "positive": 0, "negative": 0, "neutral": 0, "needs_review": 0
                    }
                date_buckets[d_str]["total"] += 1
                if r.analysis:
                    label = normalize_sentiment_label(r.analysis.sentiment)
                    if label == "Positive":
                        date_buckets[d_str]["positive"] += 1
                    elif label == "Negative":
                        date_buckets[d_str]["negative"] += 1
                    elif label == "Neutral":
                        date_buckets[d_str]["neutral"] += 1
                    else:
                        date_buckets[d_str]["needs_review"] += 1
            else:
                undated_records_count += 1

        sorted_dates = sorted(date_buckets.keys())
        time_series_data = [
            TimeSeriesPoint(
                date=d,
                total=date_buckets[d]["total"],
                positive=date_buckets[d]["positive"],
                negative=date_buckets[d]["negative"],
                neutral=date_buckets[d]["neutral"],
                needs_review=date_buckets[d]["needs_review"]
            )
            for d in sorted_dates
        ]
        has_valid_dates = len(sorted_dates) >= 2 and dated_records_count > 0
        min_date = sorted_dates[0] if sorted_dates else None
        max_date = sorted_dates[-1] if sorted_dates else None

        # 2. Product Breakdown
        product_counter = Counter()
        product_sentiments = {}
        for r in records:
            p = r.product.strip() if r.product and r.product.strip() else None
            if p:
                product_counter[p] += 1
                if p not in product_sentiments:
                    product_sentiments[p] = {"Positive": 0, "Negative": 0, "Neutral": 0}
                if r.analysis:
                    lbl = normalize_sentiment_label(r.analysis.sentiment)
                    if lbl in product_sentiments[p]:
                        product_sentiments[p][lbl] += 1

        product_breakdown: List[BreakdownMetric] = []
        total_product_records = sum(product_counter.values())
        if total_product_records > 0:
            for p_name, count in product_counter.most_common(8):
                product_breakdown.append(
                    BreakdownMetric(
                        name=p_name,
                        count=count,
                        percentage=round((count / total_product_records) * 100, 1),
                        positive_count=product_sentiments[p_name]["Positive"],
                        negative_count=product_sentiments[p_name]["Negative"],
                        neutral_count=product_sentiments[p_name]["Neutral"]
                    )
                )
        has_product_column = len(product_breakdown) > 0

        # 3. Category / Channel Breakdown
        category_counter = Counter()
        category_sentiments = {}
        for r in records:
            c = r.category.strip() if r.category and r.category.strip() else None
            if c:
                category_counter[c] += 1
                if c not in category_sentiments:
                    category_sentiments[c] = {"Positive": 0, "Negative": 0, "Neutral": 0}
                if r.analysis:
                    lbl = normalize_sentiment_label(r.analysis.sentiment)
                    if lbl in category_sentiments[c]:
                        category_sentiments[c][lbl] += 1

        category_breakdown: List[BreakdownMetric] = []
        total_category_records = sum(category_counter.values())
        if total_category_records > 0:
            for c_name, count in category_counter.most_common(8):
                category_breakdown.append(
                    BreakdownMetric(
                        name=c_name,
                        count=count,
                        percentage=round((count / total_category_records) * 100, 1),
                        positive_count=category_sentiments[c_name]["Positive"],
                        negative_count=category_sentiments[c_name]["Negative"],
                        neutral_count=category_sentiments[c_name]["Neutral"]
                    )
                )
        has_category_column = len(category_breakdown) > 0

        # Handle zero analyzed records early
        if analyzed_count == 0:
            return ExecutiveInsights(
                total_records=total_records,
                analyzed_records=0,
                classified_records=0,
                unclassified_records=total_records,
                needs_review_count=len([r for r in records if not r.is_valid]),
                completion_rate=0.0,
                exclusions_disclaimer="No records have been analyzed yet. Run analysis to calculate metrics.",
                sentiment_counts={"Positive": 0, "Negative": 0, "Neutral": 0, "Needs_Review": 0},
                sentiment_percentages={"Positive": 0.0, "Negative": 0.0, "Neutral": 0.0, "Needs_Review": 0.0},
                net_sentiment_score=0.0,
                top_recurring_themes=[],
                critical_pain_points=[],
                top_improvement_opportunities=[],
                ai_executive_summary="No feedback records have been analyzed yet. Upload feedback data or click 'Analyze with Gemini' to generate insights.",
                dataset_health="Pending Analysis",
                has_valid_dates=has_valid_dates,
                dated_records_count=dated_records_count,
                undated_records_count=undated_records_count,
                time_series_data=time_series_data,
                has_product_column=has_product_column,
                product_breakdown=product_breakdown,
                has_category_column=has_category_column,
                category_breakdown=category_breakdown,
                available_products=available_products,
                available_categories=available_categories,
                available_themes=available_themes,
                min_date=min_date,
                max_date=max_date
            )

        # 4. Sentiment counts & rigorously defined percentages
        sentiment_counts = {"Positive": 0, "Negative": 0, "Neutral": 0, "Needs_Review": 0}
        for r in analyzed:
            label = normalize_sentiment_label(r.analysis.sentiment)
            sentiment_counts[label] = sentiment_counts.get(label, 0) + 1

        # Denominator strictly defined as classified records
        classified_count = sentiment_counts["Positive"] + sentiment_counts["Negative"] + sentiment_counts["Neutral"]
        unclassified_count = total_records - classified_count
        needs_review_count = sentiment_counts["Needs_Review"] + len([r for r in records if not r.is_valid and r.analysis is None])
        completion_rate = round((analyzed_count / total_records) * 100, 1) if total_records > 0 else 0.0

        if classified_count > 0:
            sentiment_percentages = {
                "Positive": round((sentiment_counts["Positive"] / classified_count) * 100, 1),
                "Negative": round((sentiment_counts["Negative"] / classified_count) * 100, 1),
                "Neutral": round((sentiment_counts["Neutral"] / classified_count) * 100, 1),
                "Needs_Review": round((sentiment_counts["Needs_Review"] / classified_count) * 100, 1) if sentiment_counts["Needs_Review"] > 0 else 0.0
            }
            net_sentiment = round(
                ((sentiment_counts["Positive"] - sentiment_counts["Negative"]) / classified_count) * 100, 
                1
            )
            if unclassified_count > 0:
                exclusions_disclaimer = (
                    f"Percentages calculated over {classified_count} classified records. "
                    f"{unclassified_count} record{'s' if unclassified_count != 1 else ''} "
                    f"({sentiment_counts['Needs_Review']} marked 'Needs Review', {total_records - analyzed_count} pending) "
                    f"excluded from sentiment distribution denominator."
                )
            else:
                exclusions_disclaimer = f"Percentages calculated over all {classified_count} classified records (100% of dataset classified)."
        else:
            sentiment_percentages = {"Positive": 0.0, "Negative": 0.0, "Neutral": 0.0, "Needs_Review": 0.0}
            net_sentiment = 0.0
            exclusions_disclaimer = f"All {analyzed_count} analyzed records require manual review. No reliable classification exists."

        # 5. Themes Aggregation
        theme_counter = Counter()
        theme_sentiments = {}

        for r in analyzed:
            theme = r.analysis.primary_theme or "Other"
            theme_counter[theme] += 1
            if theme not in theme_sentiments:
                theme_sentiments[theme] = {"Positive": 0, "Negative": 0, "Neutral": 0, "Needs_Review": 0}
            label = normalize_sentiment_label(r.analysis.sentiment)
            theme_sentiments[theme][label] = theme_sentiments[theme].get(label, 0) + 1

        top_themes: List[ThemeMetric] = []
        for theme, count in theme_counter.most_common(8):
            top_themes.append(
                ThemeMetric(
                    theme=theme,
                    count=count,
                    percentage=round((count / analyzed_count) * 100, 1),
                    positive_count=theme_sentiments[theme].get("Positive", 0),
                    negative_count=theme_sentiments[theme].get("Negative", 0),
                    neutral_count=theme_sentiments[theme].get("Neutral", 0)
                )
            )

        # 6. Pain Points Aggregation
        pain_counter = Counter()
        pain_quotes = {}
        pain_ratings = {}

        for r in analyzed:
            for pp in r.analysis.pain_points:
                cleaned_pp = pp.strip().capitalize()
                if cleaned_pp:
                    pain_counter[cleaned_pp] += 1
                    if cleaned_pp not in pain_quotes and (r.cleaned_text or r.original_text):
                        txt = r.cleaned_text or r.original_text
                        pain_quotes[cleaned_pp] = txt[:140] + ("..." if len(txt) > 140 else "")
                    if r.rating is not None:
                        pain_ratings.setdefault(cleaned_pp, []).append(r.rating)

        critical_pain_points: List[PainPointMetric] = []
        for pp, freq in pain_counter.most_common(6):
            avg_rating = (sum(pain_ratings[pp]) / len(pain_ratings[pp])) if pp in pain_ratings and pain_ratings[pp] else 3.0
            urgency = UrgencyLevel.HIGH if (freq >= 3 or avg_rating <= 2.0) else (UrgencyLevel.MEDIUM if freq >= 2 else UrgencyLevel.LOW)
            critical_pain_points.append(
                PainPointMetric(
                    pain_point=pp,
                    frequency=freq,
                    urgency=urgency,
                    sample_quote=pain_quotes.get(pp)
                )
            )

        # 7. Positive Aspects & Opportunities
        opp_counter = Counter()
        for r in analyzed:
            for opp in getattr(r.analysis, "improvement_opportunities", []):
                cleaned_opp = opp.strip().capitalize()
                if cleaned_opp:
                    opp_counter[cleaned_opp] += 1
            for pos in getattr(r.analysis, "positive_aspects", []):
                cleaned_pos = f"Preserve {pos.lower().strip()}"
                opp_counter[cleaned_pos] += 1

        top_opportunities = [opp for opp, _ in opp_counter.most_common(5)]

        # 8. Executive AI Summary Synthesis
        lead_positive = sentiment_percentages["Positive"] >= 50
        lead_negative = sentiment_percentages["Negative"] >= 35
        top_theme_name = top_themes[0].theme if top_themes else "General Feedback"

        if lead_positive:
            health = "Healthy & Positive"
            summary = (
                f"Customer sentiment is strong at {sentiment_percentages['Positive']}% positive, "
                f"with a Net Sentiment Score of {'+' if net_sentiment > 0 else ''}{net_sentiment}. Key satisfaction driver centers on '{top_theme_name}'. "
                f"Primary optimization focus should target: {critical_pain_points[0].pain_point if critical_pain_points else 'ongoing stability'}."
            )
        elif lead_negative:
            health = "At Risk - Requires Attention"
            summary = (
                f"Negative sentiment is elevated at {sentiment_percentages['Negative']}%, producing a Net Sentiment Score of {net_sentiment}. "
                f"Highest friction occurs within '{top_theme_name}', primarily driven by '{critical_pain_points[0].pain_point if critical_pain_points else 'system obstacles'}'. "
                f"Targeted product or operational intervention recommended."
            )
        else:
            health = "Balanced / Moderate"
            summary = (
                f"Feedback indicates balanced customer sentiment with {sentiment_percentages['Neutral']}% neutral inquiries and a Net Sentiment Score of {'+' if net_sentiment > 0 else ''}{net_sentiment}. "
                f"Core volume is driven by '{top_theme_name}'. Addressing recurring friction in {critical_pain_points[0].pain_point if critical_pain_points else 'feature clarity'} "
                f"presents the strongest opportunity to convert neutral users into advocates."
            )

        return ExecutiveInsights(
            total_records=total_records,
            analyzed_records=analyzed_count,
            classified_records=classified_count,
            unclassified_records=unclassified_count,
            needs_review_count=needs_review_count,
            completion_rate=completion_rate,
            exclusions_disclaimer=exclusions_disclaimer,
            sentiment_counts=sentiment_counts,
            sentiment_percentages=sentiment_percentages,
            net_sentiment_score=net_sentiment,
            top_recurring_themes=top_themes,
            critical_pain_points=critical_pain_points,
            top_improvement_opportunities=top_opportunities,
            ai_executive_summary=summary,
            dataset_health=health,
            has_valid_dates=has_valid_dates,
            dated_records_count=dated_records_count,
            undated_records_count=undated_records_count,
            time_series_data=time_series_data,
            has_product_column=has_product_column,
            product_breakdown=product_breakdown,
            has_category_column=has_category_column,
            category_breakdown=category_breakdown,
            available_products=available_products,
            available_categories=available_categories,
            available_themes=available_themes,
            min_date=min_date,
            max_date=max_date
        )
