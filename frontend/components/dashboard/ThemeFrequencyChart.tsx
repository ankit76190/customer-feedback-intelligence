'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ThemeMetric } from '../../lib/types';

interface ThemeFrequencyChartProps {
  themes: ThemeMetric[];
  onSelectTheme?: (theme: string) => void;
  selectedTheme?: string;
}

export const ThemeFrequencyChart: React.FC<ThemeFrequencyChartProps> = ({ 
  themes,
  onSelectTheme,
  selectedTheme
}) => {
  const chartData = themes.slice(0, 8).map((t) => ({
    name: t.theme.length > 20 ? t.theme.substring(0, 18) + '...' : t.theme,
    fullName: t.theme,
    Positive: t.positive_count,
    Neutral: t.neutral_count,
    Negative: t.negative_count,
    total: t.count,
    percentage: t.percentage
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const full = payload[0].payload.fullName;
      const total = payload[0].payload.total;
      const pct = payload[0].payload.percentage;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5">
          <div className="border-b border-slate-800 pb-1">
            <p className="font-semibold text-white">{full}</p>
            <p className="text-[10px] text-slate-400 font-mono">{pct}% of analyzed feedback</p>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Positive:</span>
            <span className="font-semibold">{payload[0].payload.Positive}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-amber-400">
            <span>Neutral:</span>
            <span className="font-semibold">{payload[0].payload.Neutral}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Negative:</span>
            <span className="font-semibold">{payload[0].payload.Negative}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800 font-mono">
            <span>Total Volume:</span>
            <span className="text-white font-semibold">{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Most Frequent Themes</h3>
          <p className="text-xs text-slate-400">Recurring categories and sentiment distribution (Click to filter)</p>
        </div>
        {selectedTheme && selectedTheme !== 'all' && (
          <button
            onClick={() => onSelectTheme && onSelectTheme('all')}
            className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30 cursor-pointer"
          >
            Clear theme filter
          </button>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
          <p>No thematic clusters identified yet.</p>
          <p className="text-[11px] text-slate-400 mt-1">Run Gemini analysis to extract primary categories.</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <XAxis type="number" stroke="#64748B" fontSize={11} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#94A3B8" 
                fontSize={11} 
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="Positive" 
                stackId="a" 
                fill="#10B981" 
                onClick={(entry: any) => onSelectTheme && onSelectTheme(selectedTheme === entry.fullName ? 'all' : entry.fullName)}
                cursor="pointer"
              />
              <Bar 
                dataKey="Neutral" 
                stackId="a" 
                fill="#F59E0B" 
                onClick={(entry: any) => onSelectTheme && onSelectTheme(selectedTheme === entry.fullName ? 'all' : entry.fullName)}
                cursor="pointer"
              />
              <Bar 
                dataKey="Negative" 
                stackId="a" 
                fill="#F43F5E" 
                radius={[0, 4, 4, 0]} 
                onClick={(entry: any) => onSelectTheme && onSelectTheme(selectedTheme === entry.fullName ? 'all' : entry.fullName)}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
