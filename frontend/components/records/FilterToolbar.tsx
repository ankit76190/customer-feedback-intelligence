'use client';

import React from 'react';
import { Search, X, Filter } from 'lucide-react';

interface FilterToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedSentiment: string;
  onSentimentChange: (val: string) => void;
  selectedTheme: string;
  onThemeChange: (val: string) => void;
  themes: string[];
  sentimentCounts: {
    Positive?: number;
    Negative?: number;
    Neutral?: number;
    Needs_Review?: number;
    [key: string]: number | undefined;
  };
  onClearFilters: () => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  search,
  onSearchChange,
  selectedSentiment,
  onSentimentChange,
  selectedTheme,
  onThemeChange,
  themes,
  sentimentCounts,
  onClearFilters,
}) => {
  const getCount = (k: string) => {
    return (sentimentCounts as any)[k] ?? (sentimentCounts as any)[k.toLowerCase()] ?? 0;
  };

  const pos = getCount('Positive');
  const neu = getCount('Neutral');
  const neg = getCount('Negative');
  const rev = getCount('Needs_Review') || getCount('needs_review');

  const sentiments = [
    { label: 'All', value: 'all', count: pos + neu + neg + rev },
    { label: 'Positive', value: 'Positive', count: pos, color: 'text-emerald-400' },
    { label: 'Neutral', value: 'Neutral', count: neu, color: 'text-amber-400' },
    { label: 'Negative', value: 'Negative', count: neg, color: 'text-rose-400' },
    ...(rev > 0 ? [{ label: 'Needs Review', value: 'Needs_Review', count: rev, color: 'text-purple-400' }] : []),
  ];

  const hasActiveFilters = search || selectedSentiment !== 'all' || selectedTheme !== 'all';

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search verbatims, summaries, or IDs..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Theme Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">Theme:</span>
          <select
            value={selectedTheme}
            onChange={(e) => onThemeChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 max-w-xs"
          >
            <option value="all">All Recurring Themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Sentiment Filter Pills */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
          Sentiment:
        </span>
        {sentiments.map((s) => {
          const isActive = selectedSentiment.toLowerCase() === s.value.toLowerCase();
          return (
            <button
              key={s.value}
              onClick={() => onSentimentChange(s.value)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={!isActive && s.color ? s.color : ''}>{s.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {s.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
