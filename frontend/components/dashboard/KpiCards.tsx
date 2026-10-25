'use client';

import React from 'react';
import { 
  Database, 
  ThumbsUp, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  HelpCircle,
  Clock,
  ShieldAlert,
  Info
} from 'lucide-react';
import { ExecutiveInsights } from '../../lib/types';

interface KpiCardsProps {
  insights: ExecutiveInsights;
  onFilterSentiment?: (sentiment: string) => void;
  selectedSentiment?: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ 
  insights,
  onFilterSentiment,
  selectedSentiment
}) => {
  const isNetPositive = insights.net_sentiment_score >= 0;

  const getCount = (k: string) => {
    return (insights.sentiment_counts as any)[k] ?? 
      (insights.sentiment_counts as any)[k.toLowerCase()] ?? 0;
  };

  const getPct = (k: string) => {
    return (insights.sentiment_percentages as any)[k] ?? 
      (insights.sentiment_percentages as any)[k.toLowerCase()] ?? 0;
  };

  const positiveCount = getCount('Positive');
  const negativeCount = getCount('Negative');
  const neutralCount = getCount('Neutral');
  const needsReviewCount = insights.needs_review_count ?? (getCount('Needs_Review') || getCount('needs_review'));

  const positivePct = getPct('Positive');
  const negativePct = getPct('Negative');
  const neutralPct = getPct('Neutral');

  const classifiedCount = insights.classified_records ?? (positiveCount + negativeCount + neutralCount);
  const unclassifiedCount = insights.unclassified_records ?? (insights.total_records - classifiedCount);
  const completionRate = insights.completion_rate ?? 
    (insights.total_records > 0 ? Math.round((insights.analyzed_records / insights.total_records) * 100) : 0);

  return (
    <div className="space-y-3.5">
      {/* 6-Card High-Density Enterprise KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Feedback Records */}
        <div 
          onClick={() => onFilterSentiment && onFilterSentiment('all')}
          className="bg-[#111827] border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-colors cursor-pointer"
          title="Click to view all records in dataset"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Total Feedback</span>
            <Database className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {insights.total_records.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {insights.dated_records_count !== undefined 
                ? `${insights.dated_records_count} dated • ${insights.undated_records_count ?? 0} undated`
                : 'Stored records'}
            </p>
          </div>
        </div>

        {/* Card 2: Analysis Completion Rate */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Completion</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${completionRate === 100 ? 'text-emerald-400' : 'text-indigo-400'}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white tabular-nums">
                {completionRate}%
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({insights.analyzed_records}/{insights.total_records})
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${completionRate === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(100, completionRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Positive Feedback Count & Share */}
        <div 
          onClick={() => onFilterSentiment && onFilterSentiment(selectedSentiment === 'Positive' ? 'all' : 'Positive')}
          className={`border rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer ${
            selectedSentiment?.toLowerCase() === 'positive' 
              ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50' 
              : 'bg-[#111827] border-slate-800 hover:border-slate-700'
          }`}
          title="Click to filter by Positive feedback"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Positive</span>
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                {positiveCount}
              </span>
              <span className="text-xs font-semibold text-emerald-300 font-mono">
                {positivePct}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Of {classifiedCount} classified
            </p>
          </div>
        </div>

        {/* Card 4: Neutral Feedback Count & Share */}
        <div 
          onClick={() => onFilterSentiment && onFilterSentiment(selectedSentiment === 'Neutral' ? 'all' : 'Neutral')}
          className={`border rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer ${
            selectedSentiment?.toLowerCase() === 'neutral' 
              ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/50' 
              : 'bg-[#111827] border-slate-800 hover:border-slate-700'
          }`}
          title="Click to filter by Neutral feedback"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Neutral</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-400 tabular-nums">
                {neutralCount}
              </span>
              <span className="text-xs font-semibold text-amber-300 font-mono">
                {neutralPct}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Informational inquiries
            </p>
          </div>
        </div>

        {/* Card 5: Negative Feedback Count & Share */}
        <div 
          onClick={() => onFilterSentiment && onFilterSentiment(selectedSentiment === 'Negative' ? 'all' : 'Negative')}
          className={`border rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer ${
            selectedSentiment?.toLowerCase() === 'negative' 
              ? 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/50' 
              : 'bg-[#111827] border-slate-800 hover:border-slate-700'
          }`}
          title="Click to filter by Negative feedback"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Negative</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-rose-400 tabular-nums">
                {negativeCount}
              </span>
              <span className="text-xs font-semibold text-rose-300 font-mono">
                {negativePct}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Friction & complaints
            </p>
          </div>
        </div>

        {/* Card 6: Records Requiring Review */}
        <div 
          onClick={() => onFilterSentiment && onFilterSentiment(selectedSentiment === 'Needs_Review' ? 'all' : 'Needs_Review')}
          className={`border rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer ${
            selectedSentiment === 'Needs_Review' 
              ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-500/50' 
              : 'bg-[#111827] border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view records requiring human review"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">Requires Review</span>
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-purple-300 tabular-nums">
                {needsReviewCount}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {insights.total_records > 0 ? `${Math.round((needsReviewCount / insights.total_records) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {needsReviewCount > 0 ? 'Human verification' : 'Zero flags'}
            </p>
          </div>
        </div>
      </div>

      {/* Disclosures & Net Sentiment Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{insights.exclusions_disclaimer || `Percentages calculated over ${classifiedCount} classified records.`}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Net Sentiment Score:</span>
            <span className={`font-bold ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {insights.net_sentiment_score > 0 ? `+${insights.net_sentiment_score}` : insights.net_sentiment_score} / 100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
