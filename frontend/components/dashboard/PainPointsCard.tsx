'use client';

import React from 'react';
import { Flame, Quote, AlertCircle, ArrowRight } from 'lucide-react';
import { PainPointMetric } from '../../lib/types';

interface PainPointsCardProps {
  painPoints: PainPointMetric[];
  onSelectPainPoint?: (painPoint: string) => void;
  selectedSearch?: string;
}

export const PainPointsCard: React.FC<PainPointsCardProps> = ({ 
  painPoints,
  onSelectPainPoint,
  selectedSearch
}) => {
  const maxFreq = painPoints.length > 0 ? Math.max(...painPoints.map(p => p.frequency)) : 1;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Most Common Negative Pain Points</h3>
            <p className="text-xs text-slate-400">Recurring friction points ranked by frequency (Click to filter)</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
          {painPoints.length} identified
        </span>
      </div>

      {painPoints.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-lg border border-slate-800/80 space-y-2">
          <AlertCircle className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-semibold text-slate-300">No Critical Pain Points Detected</p>
          <p className="text-[11px] text-slate-400 max-w-xs">
            Run Gemini analysis on negative feedback to automatically extract recurring customer roadblocks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {painPoints.map((item, idx) => {
            const pct = Math.round((item.frequency / maxFreq) * 100);
            const isSelected = selectedSearch && selectedSearch.toLowerCase() === item.pain_point.toLowerCase();

            return (
              <div
                key={idx}
                onClick={() => onSelectPainPoint && onSelectPainPoint(isSelected ? '' : item.pain_point)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/40'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
                title="Click to filter feedback records containing this pain point"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className="text-xs font-semibold text-white flex-1 leading-snug">
                    {item.pain_point}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.urgency?.toLowerCase() === 'high'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                          : item.urgency?.toLowerCase() === 'medium'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {item.urgency} Urgency
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono font-bold">
                      {item.frequency}x
                    </span>
                  </div>
                </div>

                {/* Visual Frequency Progress Bar */}
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden my-2">
                  <div 
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Sample Customer Quote */}
                {item.sample_quote && (
                  <div className="flex items-start gap-1.5 text-slate-400 text-[11px] italic mt-1.5 pt-1.5 border-t border-slate-800/60">
                    <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">&ldquo;{item.sample_quote}&rdquo;</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
