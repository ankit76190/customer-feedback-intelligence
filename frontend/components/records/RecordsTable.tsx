'use client';

import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  AlertCircle, 
  Eye, 
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { FeedbackRecord } from '../../lib/types';

interface RecordsTableProps {
  records: FeedbackRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectRecord: (record: FeedbackRecord) => void;
  selectedRecordId?: string | null;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onSelectRecord,
  selectedRecordId,
}) => {
  const getSentimentBadge = (sentiment?: string) => {
    const s = sentiment?.toLowerCase();
    switch (s) {
      case 'positive':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            Positive
          </span>
        );
      case 'negative':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/30">
            Negative
          </span>
        );
      case 'neutral':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
            Neutral
          </span>
        );
      case 'needs_review':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-500/30">
            Needs Review
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
            Pending
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency?: string) => {
    const u = urgency?.toLowerCase();
    switch (u) {
      case 'high':
        return (
          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40">
            High Urgency
          </span>
        );
      case 'medium':
        return (
          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-500/30">
            Med
          </span>
        );
      case 'low':
        return (
          <span className="text-[9px] font-normal px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
            Low
          </span>
        );
      case 'needs_review':
        return (
          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-950/70 text-purple-300 border border-purple-500/30">
            Review
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0F172A] text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Record ID</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3 min-w-[280px]">Verbatim Feedback</th>
              <th className="px-4 py-3">Sentiment</th>
              <th className="px-4 py-3">Primary Theme</th>
              <th className="px-4 py-3">Pain Points</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                  No records match your selected filters.
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const isSelected = selectedRecordId === r.id;
                const analysis = r.analysis;
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/30 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* ID & Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-white">{r.id}</span>
                        {r.original_row_number && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Row {r.original_row_number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {r.date && (
                          <span className="text-[10px] text-slate-400">{r.date.split(' ')[0]}</span>
                        )}
                        {r.product && (
                          <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                            {r.product}
                          </span>
                        )}
                        {r.is_duplicate && (
                          <span className="text-[9px] bg-amber-950/60 text-amber-300 border border-amber-500/30 px-1 rounded">
                            dup
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.rating !== null && r.rating !== undefined ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-amber-300">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{r.rating}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[10px]">-</span>
                      )}
                    </td>

                    {/* Feedback Text */}
                    <td className="px-4 py-3 max-w-sm">
                      <p className="line-clamp-2 text-slate-200 text-xs leading-relaxed">
                        {r.cleaned_text || r.original_text}
                      </p>
                      {(analysis?.summary || analysis?.concise_summary) && (
                        <p className="line-clamp-1 text-[11px] text-indigo-300/80 mt-1 italic">
                          AI: {analysis.summary || analysis.concise_summary}
                        </p>
                      )}
                      {!r.is_valid && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-medium">
                          <AlertCircle className="w-3 h-3" /> Flagged: {r.flagged_reasons.join(', ')}
                        </span>
                      )}
                    </td>

                    {/* Sentiment & Urgency */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {getSentimentBadge(analysis?.sentiment)}
                        {getUrgencyBadge(analysis?.urgency)}
                      </div>
                    </td>

                    {/* Theme */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {analysis?.primary_theme ? (
                        <span className="text-[11px] font-medium text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
                          {analysis.primary_theme}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Pain Points count */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {analysis?.pain_points && analysis.pain_points.length > 0 ? (
                        <span className="text-[11px] text-rose-300 font-semibold bg-rose-950/40 border border-rose-500/20 px-2 py-0.5 rounded">
                          {analysis.pain_points.length} friction pts
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(r);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-indigo-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <span className="font-semibold text-white">{records.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
          <span className="font-semibold text-white">{Math.min(page * limit, total)}</span> of{' '}
          <span className="font-semibold text-white">{total}</span> records
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-slate-300 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
