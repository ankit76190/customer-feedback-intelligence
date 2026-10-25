'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  ThumbsUp, 
  Calendar, 
  ShieldAlert, 
  Sparkles, 
  Database,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Quote,
  Eye,
  X,
  Info
} from 'lucide-react';
import { useApp } from '../../components/layout/AppShell';
import { api } from '../../lib/api';
import { AiExecutiveReport, FeedbackRecord } from '../../lib/types';
import { RecordDrawer } from '../../components/records/RecordDrawer';

export default function InsightsPage() {
  const { currentDatasetId, setCurrentDatasetId, status } = useApp();

  const [report, setReport] = useState<AiExecutiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<'excel' | 'csv' | null>(null);
  const [previewSheet, setPreviewSheet] = useState<'Feedback' | 'Sentiment' | 'Themes' | 'Quality' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!currentDatasetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAiInsights({ datasetId: currentDatasetId });
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI executive insights report.');
    } finally {
      setLoading(false);
    }
  }, [currentDatasetId]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleDownload = async (type: 'excel' | 'csv') => {
    setDownloadingType(type);
    try {
      const url = type === 'excel' 
        ? api.getExcelExportUrl({ datasetId: currentDatasetId })
        : api.getCsvExportUrl({ datasetId: currentDatasetId });

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(`Failed to initiate ${type} download:`, err);
    } finally {
      setTimeout(() => setDownloadingType(null), 1500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Executive Reporting
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs font-mono text-slate-400">{currentDatasetId}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">
            AI Insights & Business Report
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dataset-level executive synthesis grounded strictly in verified customer verbatims
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dataset Selector */}
          {status?.active_datasets && status.active_datasets.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={currentDatasetId}
                onChange={(e) => setCurrentDatasetId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                {status.active_datasets.map((d) => (
                  <option key={d.dataset_id} value={d.dataset_id} className="bg-slate-900 text-white">
                    {d.filename} ({d.total_records} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Report Preview Button */}
          <button
            onClick={() => setPreviewSheet(previewSheet ? null : 'Feedback')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>{previewSheet ? 'Close Preview' : 'Preview 4-Sheet Report'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => handleDownload('csv')}
            disabled={downloadingType !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            {downloadingType === 'csv' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Export CSV</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={() => handleDownload('excel')}
            disabled={downloadingType !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 transition-colors cursor-pointer shadow-xs"
          >
            {downloadingType === 'excel' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>Export 4-Sheet Excel</span>
          </button>

          {/* Print / Save PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 hover:bg-indigo-900/60 transition-colors cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !report && (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Synthesizing dataset-level AI intelligence report...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchInsights}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded font-medium text-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Report Body */}
      {report && (
        <div className="space-y-6">
          {/* Printable Document Title (Only appears during printing) */}
          <div className="hidden print:block border-b border-black pb-4 mb-6">
            <h1 className="text-2xl font-bold text-black">Customer Feedback Intelligence — Executive Report</h1>
            <p className="text-xs text-gray-600 mt-1">
              Dataset: {report.dataset_id} • Generated: {report.generated_at} • Engine: {report.model_attribution}
            </p>
          </div>

          {/* 4-Sheet Preview Drawer / Section */}
          {previewSheet && (
            <div className="bg-[#111827] border border-indigo-500/30 rounded-xl p-5 shadow-lg space-y-4 print:hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Workbook Sheets Preview</h3>
                  <span className="text-[10px] text-slate-400 font-mono">4 Separate Sheets with Formula Protection</span>
                </div>
                <button
                  onClick={() => setPreviewSheet(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet Switcher Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                {(['Feedback', 'Sentiment', 'Themes', 'Quality'] as const).map((sheetKey) => {
                  const labelMap = {
                    Feedback: 'Sheet 1: Feedback (Ledger)',
                    Sentiment: 'Sheet 2: Sentiment Summary',
                    Themes: 'Sheet 3: Theme Summary',
                    Quality: 'Sheet 4: Data Quality'
                  };
                  const isActive = previewSheet === sheetKey;
                  return (
                    <button
                      key={sheetKey}
                      onClick={() => setPreviewSheet(sheetKey)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {labelMap[sheetKey]}
                    </button>
                  );
                })}
              </div>

              {/* Sheet Preview Content */}
              <div className="text-xs text-slate-300">
                {previewSheet === 'Feedback' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Contains complete verbatim ledger with sanitized formula injection defense, sentiment badges, primary & secondary themes, extracted pain points, and executive summaries.
                    </p>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400">
                      Columns: Record ID, Row #, Date, Customer ID, Product, Channel, Rating, Original Verbatim, Cleaned Text, Sentiment, Confidence, Primary Theme, Secondary Themes, Pain Points, Summary, Analysis Status.
                    </div>
                  </div>
                )}
                {previewSheet === 'Sentiment' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Contains styled executive KPI cards, Net Sentiment Score ({report.net_sentiment_score > 0 ? `+${report.net_sentiment_score}` : report.net_sentiment_score}), sentiment breakdown table, and explicit denominator disclosures.
                    </p>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400">
                      Sections: Title Banner, KPI Matrix, Executive AI Insights Synthesis, Sentiment Distribution & Denominators Table.
                    </div>
                  </div>
                )}
                {previewSheet === 'Themes' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Displays thematic frequency breakdown with sentiment shares, ranked customer friction pain points with urgency tags, and prioritized actionable recommendations.
                    </p>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400">
                      Sections: Recurring Customer Themes Table, Critical Customer Pain Points, Recommended Actionable Opportunities.
                    </div>
                  </div>
                )}
                {previewSheet === 'Quality' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Audit transparency log recording cleaning and validation flags for every single record to guarantee zero record loss.
                    </p>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400">
                      Sections: Data Cleaning & Normalization Audit Log (Record ID, Row #, Validity Status, Date Validity, Audit Flags, Cleaned Preview).
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 1: Executive Summary Card (Distinguishes Observed Evidence from AI Synthesis) */}
          <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 print:border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 print:text-indigo-600" />
                <h2 className="text-base font-bold text-white print:text-black">Executive Intelligence Synthesis</h2>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 print:text-gray-600">
                <span>{report.analyzed_records} / {report.total_records} analyzed ({report.completion_rate}%)</span>
                <span>•</span>
                <span className={`font-bold ${report.net_sentiment_score >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'}`}>
                  Net Sentiment: {report.net_sentiment_score > 0 ? `+${report.net_sentiment_score}` : report.net_sentiment_score}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-200 print:text-gray-900 leading-relaxed font-sans whitespace-pre-line bg-slate-900/60 print:bg-gray-50 border border-slate-800/70 print:border-gray-200 p-4 rounded-xl">
              {report.executive_summary}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 print:text-gray-500 pt-1">
              <span>Attribution: {report.model_attribution}</span>
              <span className="font-mono">Generated: {report.generated_at}</span>
            </div>
          </div>

          {/* Section 2: Top Recurring Customer Themes */}
          <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 print:border-gray-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white print:text-black">Top Recurring Customer Themes</h3>
                <p className="text-xs text-slate-400 print:text-gray-600">Primary categories ranked by observed volume and sentiment breakdown</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 print:bg-gray-200 text-slate-300 print:text-gray-800 px-2 py-0.5 rounded">
                {report.top_recurring_themes.length} categories
              </span>
            </div>

            {report.top_recurring_themes.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recurring themes identified.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.top_recurring_themes.map((theme, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-slate-900/60 print:bg-gray-50 border border-slate-800/80 print:border-gray-200 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-white print:text-black">{theme.theme}</span>
                        <span className="text-[10px] font-mono font-bold text-indigo-400 print:text-indigo-600 bg-indigo-950/60 print:bg-indigo-50 border border-indigo-500/20 px-2 py-0.5 rounded">
                          {theme.observed_count} records ({theme.share_percentage}%)
                        </span>
                      </div>

                      {/* Sentiment Share Badges */}
                      <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                        <span className="text-emerald-400 print:text-emerald-700">+{theme.positive_count} Pos</span>
                        <span className="text-amber-400 print:text-amber-700">{theme.neutral_count} Neu</span>
                        <span className="text-rose-400 print:text-rose-700">-{theme.negative_count} Neg</span>
                      </div>
                    </div>

                    {/* Representative Verbatim Quotes */}
                    {theme.representative_quotes.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60 print:border-gray-200 text-[11px] text-slate-400 print:text-gray-600 italic">
                        <p>&ldquo;{theme.representative_quotes[0]}&rdquo;</p>
                        {theme.sample_record_ids.length > 0 && (
                          <div className="flex items-center gap-1 font-mono text-[10px] not-italic text-slate-400 print:text-gray-500">
                            <span>Record IDs:</span>
                            {theme.sample_record_ids.map(id => (
                              <span key={id} className="text-indigo-300 print:text-indigo-600">{id}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Critical Pain Points & Positive Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Critical Negative Pain Points */}
            <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 print:border-gray-200 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400 print:text-rose-600" />
                  <h3 className="text-sm font-bold text-white print:text-black">Most Frequent Negative Pain Points</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{report.frequent_pain_points.length} friction areas</span>
              </div>

              {report.frequent_pain_points.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No critical pain points recorded.</p>
              ) : (
                <div className="space-y-3">
                  {report.frequent_pain_points.map((pp, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-slate-900/60 print:bg-gray-50 border border-slate-800/80 print:border-gray-200 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold text-white print:text-black">{pp.pain_point}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                            pp.urgency.toLowerCase() === 'high' 
                              ? 'bg-rose-950/80 text-rose-300 print:text-rose-700 border border-rose-500/30' 
                              : 'bg-amber-950/80 text-amber-300 print:text-amber-700 border border-amber-500/30'
                          }`}>
                            {pp.urgency} Urgency
                          </span>
                          <span className="text-xs font-bold text-slate-300 print:text-gray-800 font-mono">{pp.frequency}x</span>
                        </div>
                      </div>
                      {pp.sample_quote && (
                        <p className="text-[11px] text-slate-400 print:text-gray-600 italic">
                          &ldquo;{pp.sample_quote}&rdquo;
                        </p>
                      )}
                      {pp.referenced_record_ids.length > 0 && (
                        <p className="text-[10px] font-mono text-slate-400 print:text-gray-500">
                          Referenced: {pp.referenced_record_ids.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Positive Customer Highlights */}
            <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 print:border-gray-200 pb-3">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-emerald-400 print:text-emerald-600" />
                  <h3 className="text-sm font-bold text-white print:text-black">Positive Customer Highlights</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{report.positive_highlights.length} strengths</span>
              </div>

              {report.positive_highlights.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No positive highlights extracted yet.</p>
              ) : (
                <div className="space-y-3">
                  {report.positive_highlights.map((ph, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-slate-900/60 print:bg-gray-50 border border-slate-800/80 print:border-gray-200 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold text-white print:text-black">{ph.highlight}</span>
                        <span className="text-xs font-bold text-emerald-400 print:text-emerald-700 font-mono shrink-0">{ph.frequency}x</span>
                      </div>
                      {ph.sample_quote && (
                        <p className="text-[11px] text-slate-400 print:text-gray-600 italic">
                          &ldquo;{ph.sample_quote}&rdquo;
                        </p>
                      )}
                      {ph.referenced_record_ids.length > 0 && (
                        <p className="text-[10px] font-mono text-slate-400 print:text-gray-500">
                          Referenced: {ph.referenced_record_ids.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Temporal Shift Observations */}
          <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800/80 print:border-gray-200 pb-3">
              <Calendar className="w-4 h-4 text-indigo-400 print:text-indigo-600" />
              <h3 className="text-sm font-bold text-white print:text-black">Chronological Trend & Temporal Analysis</h3>
            </div>
            <div className="p-4 rounded-lg bg-slate-900/60 print:bg-gray-50 border border-slate-800/80 print:border-gray-200 text-xs text-slate-300 print:text-gray-900 leading-relaxed">
              <p>{report.temporal_trends.observation}</p>
              <div className="mt-2.5 flex items-center gap-4 text-[10px] font-mono text-slate-400 print:text-gray-600 border-t border-slate-800 print:border-gray-200 pt-2">
                <span>Window: {report.temporal_trends.date_range || 'N/A'}</span>
                <span>•</span>
                <span>Dated: {report.temporal_trends.dated_count}</span>
                <span>•</span>
                <span>Undated: {report.temporal_trends.undated_count}</span>
                <span>•</span>
                <span>Trend Status: {report.temporal_trends.direction.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Section 5: Actionable Business Recommendations Supported by Real Records */}
          <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 print:border-gray-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white print:text-black">Actionable Business Recommendations</h3>
                <p className="text-xs text-slate-400 print:text-gray-600">Pragmatic product and operational interventions backed by recorded customer evidence</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 print:bg-gray-200 text-slate-300 print:text-gray-800 px-2 py-0.5 rounded">
                {report.actionable_recommendations.length} recommendations
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {report.actionable_recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900/60 print:bg-gray-50 border border-slate-800/80 print:border-gray-200 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-xs font-bold text-white print:text-black leading-snug">{rec.title}</h4>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        rec.priority.toLowerCase() === 'high' 
                          ? 'bg-rose-950/80 text-rose-300 print:text-rose-700 border border-rose-500/30' 
                          : 'bg-indigo-950/80 text-indigo-300 print:text-indigo-700 border border-indigo-500/30'
                      }`}>
                        {rec.priority} Priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">{rec.action}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60 print:border-gray-200 text-[11px] text-slate-400 print:text-gray-600">
                    {rec.supporting_evidence.map((ev, evIdx) => (
                      <p key={evIdx} className="flex items-start gap-1.5">
                        <span className="text-indigo-400">•</span>
                        <span>{ev}</span>
                      </p>
                    ))}
                    {rec.referenced_record_ids.length > 0 && (
                      <p className="text-[10px] font-mono text-slate-400 print:text-gray-500 pt-1">
                        Supported by: {rec.referenced_record_ids.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Representative Feedback Examples */}
          <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 print:border-gray-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white print:text-black">Representative Customer Verbatims</h3>
                <p className="text-xs text-slate-400 print:text-gray-600">Sample records illustrating positive praise, friction, and borderline feedback</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 print:bg-gray-200 text-slate-300 print:text-gray-800 px-2 py-0.5 rounded">
                {report.representative_examples.length} samples
              </span>
            </div>

            <div className="space-y-3">
              {report.representative_examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900/60 print:bg-gray-50 border border-slate-800/80 print:border-gray-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white print:text-black">{ex.record_id}</span>
                      <span className="text-[10px] bg-slate-800 print:bg-gray-200 text-slate-300 print:text-gray-800 px-2 py-0.5 rounded font-medium">
                        {ex.theme}
                      </span>
                      {ex.rating !== null && ex.rating !== undefined && (
                        <span className="text-[10px] font-mono text-amber-300 print:text-amber-700">★ {ex.rating}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      ex.sentiment.toLowerCase() === 'positive' 
                        ? 'bg-emerald-950/60 text-emerald-300 print:text-emerald-700 border border-emerald-500/30' 
                        : ex.sentiment.toLowerCase() === 'negative' 
                        ? 'bg-rose-950/60 text-rose-300 print:text-rose-700 border border-rose-500/30' 
                        : ex.sentiment.toLowerCase() === 'neutral' 
                        ? 'bg-amber-950/60 text-amber-300 print:text-amber-700 border border-amber-500/30' 
                        : 'bg-purple-950/60 text-purple-300 print:text-purple-700 border border-purple-500/30'
                    }`}>
                      {ex.sentiment}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 print:text-gray-900 leading-relaxed italic">
                    &ldquo;{ex.verbatim_text}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 print:text-gray-600 pt-1 border-t border-slate-800/60 print:border-gray-200">
                    <span>Summary: {ex.ai_summary}</span>
                    {ex.date && <span className="font-mono text-[10px]">{ex.date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Limitations & Areas Requiring Manual Review */}
          <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-gray-300 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800/80 print:border-gray-200 pb-3">
              <ShieldAlert className="w-4 h-4 text-purple-400 print:text-purple-600" />
              <h3 className="text-sm font-bold text-white print:text-black">Limitations & Human Verification Disclosures</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-400 print:text-gray-700">
              {report.limitations_and_disclosures.map((lim, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-900/60 print:bg-gray-50 border border-slate-800/60 print:border-gray-200 p-3 rounded-lg">
                  <Info className="w-3.5 h-3.5 text-purple-400 print:text-purple-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{lim}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over inspector drawer */}
      <RecordDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
