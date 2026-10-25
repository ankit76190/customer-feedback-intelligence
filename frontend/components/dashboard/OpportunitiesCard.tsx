'use client';

import React from 'react';
import { Lightbulb, ArrowUpRight } from 'lucide-react';

interface OpportunitiesCardProps {
  opportunities: string[];
}

export const OpportunitiesCard: React.FC<OpportunitiesCardProps> = ({ opportunities }) => {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Actionable Opportunities</h3>
          <p className="text-xs text-slate-400">Gemini-synthesized product and operational improvements</p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          No improvement opportunities generated yet.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {opportunities.map((opp, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <span className="flex-1 leading-relaxed">{opp}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
