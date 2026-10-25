'use client';

import React, { useEffect } from 'react';
import { X, Sparkles, Star, Tag, AlertTriangle, Lightbulb, CheckCircle2, MessageSquare } from 'lucide-react';
import { FeedbackRecord } from '../../lib/types';

interface RecordDrawerProps {
  record: FeedbackRecord | null;
  onClose: () => void;
}

export const RecordDrawer: React.FC<RecordDrawerProps> = ({ record, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!record) return null;

  const analysis = record.analysis;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-lg bg-[#0F172A] border-l border-slate-800 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between text-slate-200"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-white">{record.id}</span>
                {record.original_row_number && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    Row {record.original_row_number}
                  </span>
                )}
                {record.product && (
                  <span className="text-[10px] bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-medium">
                    {record.product}
                  </span>
                )}
                {record.category && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                    {record.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {record.date ? `Submitted: ${record.date}` : 'Timestamp unavailable'}
                {record.customer_id && record.customer_id !== record.id && ` • Customer ID: ${record.customer_id}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Customer Verbatim (Preserved Original & Cleaned) */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Original Verbatim Feedback (Untouched)</span>
                </div>
                {record.is_duplicate && (
                  <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                    Duplicate
                  </span>
                )}
              </label>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 leading-relaxed font-sans whitespace-pre-wrap">
                &ldquo;{record.original_text || record.cleaned_text}&rdquo;
              </div>
            </div>

            {record.cleaned_text && record.cleaned_text !== record.original_text && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Normalized & Cleaned Text (Stored Separately)
                </label>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {record.cleaned_text}
                </div>
              </div>
            )}

            {record.rating !== null && record.rating !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono pt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Customer Rating: {record.rating} / 5</span>
              </div>
            )}
          </div>

          {/* Gemini AI Intelligence Section */}
          {analysis ? (
            <div className="space-y-5 p-4 rounded-xl bg-[#111827] border border-indigo-500/20">
              <div className="flex items-center justify-between text-indigo-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Gemini Structured Analysis</h4>
                </div>
                {analysis.confidence !== undefined && analysis.confidence !== null && (
                  <span 
                    title="Model confidence score (not a statistically calibrated probability)"
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30"
                  >
                    Conf: {Math.round(analysis.confidence * 100)}%
                  </span>
                )}
              </div>

              {/* Sentiment & Urgency Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Sentiment</span>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider inline-block ${
                        analysis.sentiment?.toLowerCase() === 'positive'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : analysis.sentiment?.toLowerCase() === 'negative'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                          : analysis.sentiment?.toLowerCase() === 'neutral'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          : 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {analysis.sentiment?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Urgency</span>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider inline-block ${
                        analysis.urgency?.toLowerCase() === 'high'
                          ? 'bg-red-950/80 text-red-300 border border-red-500/40 animate-pulse'
                          : analysis.urgency?.toLowerCase() === 'medium'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          : analysis.urgency?.toLowerCase() === 'low'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {analysis.urgency?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grounded Sentiment Reason */}
              {analysis.sentiment_reason && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Grounded Sentiment Reason</span>
                  <p className="text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                    {analysis.sentiment_reason}
                  </p>
                </div>
              )}

              {/* Concise Factual Summary */}
              {(analysis.summary || analysis.concise_summary) && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Factual Summary</span>
                  <p className="text-xs text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800 italic leading-relaxed">
                    &ldquo;{analysis.summary || analysis.concise_summary}&rdquo;
                  </p>
                </div>
              )}

              {/* Categorization & Themes */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Categorization</span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-950/60 border border-indigo-500/40 text-indigo-300">
                    Primary: {analysis.primary_theme}
                  </span>
                  {analysis.secondary_themes && analysis.secondary_themes.map((st, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-slate-900 border border-slate-800 text-slate-400"
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              {/* Positive Aspects (Explicit Strengths) */}
              {analysis.positive_aspects && analysis.positive_aspects.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Explicit Strengths Noted
                  </span>
                  <ul className="space-y-1">
                    {analysis.positive_aspects.map((pa, i) => (
                      <li
                        key={i}
                        className="text-xs text-emerald-200/95 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1.5 rounded-md flex items-start gap-1.5"
                      >
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{pa}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pain Points (Specific Friction Mentioned) */}
              {analysis.pain_points && analysis.pain_points.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-rose-400 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Specific Pain Points Mentioned
                  </span>
                  <ul className="space-y-1">
                    {analysis.pain_points.map((pp, i) => (
                      <li
                        key={i}
                        className="text-xs text-rose-200/90 bg-rose-950/20 border border-rose-500/20 px-2.5 py-1.5 rounded-md flex items-start gap-1.5"
                      >
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{pp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvement Opportunities / Suggestions */}
              {analysis.improvement_opportunities && analysis.improvement_opportunities.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-sky-400 uppercase flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Recommended Action / Opportunity
                  </span>
                  <ul className="space-y-1">
                    {analysis.improvement_opportunities.map((opp, i) => (
                      <li
                        key={i}
                        className="text-xs text-sky-200/90 bg-sky-950/20 border border-sky-500/20 px-2.5 py-1.5 rounded-md flex items-start gap-1.5"
                      >
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">Pending Gemini Evaluation</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                This record has not yet been processed by Gemini. Click &ldquo;Analyze with Gemini&rdquo; on the dashboard to evaluate it.
              </p>
            </div>
          )}

          {/* Audit flags */}
          {record.flagged_reasons.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <span className="font-semibold text-amber-200">Data Cleaner Audit Flags:</span>
              <p className="font-mono text-[11px]">{record.flagged_reasons.join(', ')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
