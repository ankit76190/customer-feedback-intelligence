export type SentimentType = 'Positive' | 'Negative' | 'Neutral' | 'needs_review' | 'positive' | 'negative' | 'neutral';
export type UrgencyType = 'High' | 'Medium' | 'Low' | 'needs_review' | 'high' | 'medium' | 'low';

export interface FeedbackItemAnalysis {
  sentiment: SentimentType;
  sentiment_reason?: string;
  primary_theme: string;
  secondary_themes: string[];
  pain_points: string[];
  positive_aspects?: string[];
  improvement_opportunities?: string[];
  urgency: UrgencyType;
  summary: string;
  concise_summary?: string;
  sentiment_score?: number;
  confidence?: number | null;
}

export interface FeedbackRecord {
  id: string;
  original_row_number: number;
  original_text: string;
  cleaned_text: string;
  customer_id?: string | null;
  product?: string | null;
  date?: string | null;
  rating?: number | null;
  category?: string | null;
  is_valid: boolean;
  is_duplicate: boolean;
  flagged_reasons: string[];
  analysis?: FeedbackItemAnalysis | null;
}

export interface ThemeMetric {
  theme: string;
  count: number;
  percentage: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
}

export interface PainPointMetric {
  pain_point: string;
  frequency: number;
  urgency: UrgencyType;
  sample_quote?: string | null;
}

export interface TimeSeriesPoint {
  date: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  needs_review: number;
}

export interface BreakdownMetric {
  name: string;
  count: number;
  percentage: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
}

export interface ExecutiveInsights {
  total_records: number;
  analyzed_records: number;
  classified_records?: number;
  unclassified_records?: number;
  needs_review_count?: number;
  completion_rate?: number;
  exclusions_disclaimer?: string;
  sentiment_counts: {
    Positive?: number;
    Negative?: number;
    Neutral?: number;
    Needs_Review?: number;
    positive?: number;
    negative?: number;
    neutral?: number;
    needs_review?: number;
    [key: string]: number | undefined;
  };
  sentiment_percentages: {
    Positive?: number;
    Negative?: number;
    Neutral?: number;
    Needs_Review?: number;
    [key: string]: number | undefined;
  };
  net_sentiment_score: number;
  top_recurring_themes: ThemeMetric[];
  critical_pain_points: PainPointMetric[];
  top_improvement_opportunities: string[];
  ai_executive_summary: string;
  dataset_health: string;
  has_valid_dates?: boolean;
  dated_records_count?: number;
  undated_records_count?: number;
  time_series_data?: TimeSeriesPoint[];
  has_product_column?: boolean;
  product_breakdown?: BreakdownMetric[];
  has_category_column?: boolean;
  category_breakdown?: BreakdownMetric[];
  available_products?: string[];
  available_categories?: string[];
  available_themes?: string[];
  min_date?: string | null;
  max_date?: string | null;
}

export interface ReportRecommendation {
  title: string;
  action: string;
  supporting_evidence: string[];
  referenced_record_ids: string[];
  priority: 'High' | 'Medium' | 'Low' | string;
}

export interface RepresentativeExample {
  record_id: string;
  sentiment: string;
  theme: string;
  rating?: number | null;
  date?: string | null;
  verbatim_text: string;
  ai_summary: string;
  key_quote: string;
}

export interface TemporalShiftObservation {
  has_sufficient_data: boolean;
  observation: string;
  date_range?: string | null;
  dated_count: number;
  undated_count: number;
  direction: 'improving' | 'deteriorating' | 'stable' | 'insufficient_data' | string;
}

export interface ThemeInsightDetail {
  theme: string;
  observed_count: number;
  share_percentage: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  sample_record_ids: string[];
  representative_quotes: string[];
}

export interface PainPointDetail {
  pain_point: string;
  frequency: number;
  urgency: string;
  sample_quote?: string | null;
  referenced_record_ids: string[];
}

export interface PositiveHighlightDetail {
  highlight: string;
  frequency: number;
  sample_quote?: string | null;
  referenced_record_ids: string[];
}

export interface AiExecutiveReport {
  dataset_id: string;
  generated_at: string;
  total_records: number;
  analyzed_records: number;
  classified_records: number;
  unclassified_records: number;
  needs_review_count: number;
  completion_rate: number;
  net_sentiment_score: number;
  executive_summary: string;
  top_recurring_themes: ThemeInsightDetail[];
  frequent_pain_points: PainPointDetail[];
  positive_highlights: PositiveHighlightDetail[];
  temporal_trends: TemporalShiftObservation;
  actionable_recommendations: ReportRecommendation[];
  representative_examples: RepresentativeExample[];
  limitations_and_disclosures: string[];
  model_attribution: string;
}

export interface ColumnMapping {
  feedback_text_col: string;
  id_col?: string | null;
  date_col?: string | null;
  product_col?: string | null;
  rating_col?: string | null;
  category_col?: string | null;
}

export interface UploadPreviewResponse {
  dataset_id: string;
  filename: string;
  file_size_bytes: number;
  sheet_names: string[];
  active_sheet?: string | null;
  total_rows: number;
  detected_columns: string[];
  suggested_mapping: ColumnMapping;
  preview_rows: Record<string, any>[];
}

export interface RawPreviewResponse {
  dataset_id: string;
  filename: string;
  sheet_names: string[];
  active_sheet?: string | null;
  columns: string[];
  total_rows: number;
  page: number;
  limit: number;
  total_pages: number;
  rows: Record<string, any>[];
}

export interface NormalizationResult {
  dataset_id: string;
  filename: string;
  total_raw_rows: number;
  accepted_records: number;
  flagged_records: number;
  skipped_blank_rows: number;
  duplicate_records_count: number;
  flagged_reasons_summary: Record<string, number>;
  sample_cleaned_records: FeedbackRecord[];
}

export interface DatasetSummaryResponse {
  dataset_id: string;
  filename: string;
  file_size_bytes: number;
  created_at: string;
  sheet_names: string[];
  active_sheet?: string | null;
  total_raw_rows: number;
  accepted_records: number;
  flagged_records: number;
  skipped_blank_rows: number;
  mapping?: ColumnMapping | null;
  flagged_reasons_summary: Record<string, number>;
}

export interface AnalysisJobResponse {
  job_id: string;
  dataset_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  total_records: number;
  processed_records: number;
  failed_records: number;
  cached_records: number;
  batch_size: number;
  model_used: string;
  prompt_version: string;
  duration_seconds: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedRecordsResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  records: FeedbackRecord[];
  available_themes: string[];
  sentiment_filter_counts: {
    Positive?: number;
    Negative?: number;
    Neutral?: number;
    Needs_Review?: number;
    [key: string]: number | undefined;
  };
}

export interface SystemStatus {
  api_key_configured: boolean;
  masked_key: string;
  gemini_model: string;
  environment: string;
  active_datasets: {
    dataset_id: string;
    filename: string;
    file_size_bytes?: number;
    total_records: number;
    analyzed_records: number;
  }[];
}
