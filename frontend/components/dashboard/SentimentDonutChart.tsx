'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ExecutiveInsights } from '../../lib/types';
import { Info } from 'lucide-react';

interface SentimentDonutChartProps {
  insights: ExecutiveInsights;
  onSelectSentiment?: (sentiment: string) => void;
  selectedSentiment?: string;
}

const COLORS = {
  Positive: '#10B981', // Emerald 500
  Neutral: '#F59E0B',  // Amber 500
  Negative: '#F43F5E', // Rose 500
  Needs_Review: '#A855F7', // Purple 500
};

export const SentimentDonutChart: React.FC<SentimentDonutChartProps> = ({ 
  insights,
  onSelectSentiment,
  selectedSentiment
}) => {
  const getCount = (key: string) => {
    return insights.sentiment_counts[key] ?? 
      insights.sentiment_counts[key.toLowerCase()] ?? 
      insights.sentiment_counts[key.toUpperCase()] ?? 0;
  };

  const getPercentage = (key: string) => {
    return insights.sentiment_percentages[key] ?? 
      insights.sentiment_percentages[key.toLowerCase()] ?? 0;
  };

  const needsReviewCount = getCount('Needs_Review') + getCount('needs_review');
  const needsReviewPct = getPercentage('Needs_Review') || getPercentage('needs_review');

  const baseData = [
    {
      name: 'Positive',
      value: getCount('Positive'),
      percentage: getPercentage('Positive'),
      color: COLORS.Positive,
    },
    {
      name: 'Neutral',
      value: getCount('Neutral'),
      percentage: getPercentage('Neutral'),
      color: COLORS.Neutral,
    },
    {
      name: 'Negative',
      value: getCount('Negative'),
      percentage: getPercentage('Negative'),
      color: COLORS.Negative,
    },
  ];

  if (needsReviewCount > 0) {
    baseData.push({
      name: 'Needs Review',
      value: needsReviewCount,
      percentage: needsReviewPct,
      color: COLORS.Needs_Review,
    });
  }

  const data = baseData;
  const total = insights.analyzed_records;
  const classifiedCount = insights.classified_records ?? (getCount('Positive') + getCount('Neutral') + getCount('Negative'));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-white">{item.name}</span>
          </div>
          <div className="text-slate-300 font-mono">
            {item.value} records ({item.percentage}%)
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">
            {item.name === 'Needs Review' 
              ? 'Flagged for human verification' 
              : `Calculated over ${classifiedCount} classified records`}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Sentiment Distribution</h3>
          <p className="text-xs text-slate-400">Classified by Gemini into Positive, Neutral, Negative</p>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          {total} analyzed
        </span>
      </div>

      {total === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
          <p>No feedback analyzed yet.</p>
          <p className="text-[11px] text-slate-400 mt-1">Run Gemini analysis to evaluate sentiment breakdown.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(entry: any) => {
                      if (onSelectSentiment && entry?.name) {
                        const target = entry.name === 'Needs Review' ? 'Needs_Review' : entry.name;
                        onSelectSentiment(selectedSentiment === target ? 'all' : target);
                      }
                    }}
                    cursor="pointer"
                  >
                    {data.map((entry, index) => {
                      const isSelected = selectedSentiment?.toLowerCase() === entry.name.toLowerCase() ||
                        (selectedSentiment === 'Needs_Review' && entry.name === 'Needs Review');
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke={isSelected ? '#FFFFFF' : '#111827'} 
                          strokeWidth={isSelected ? 3 : 2} 
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-white tabular-nums">
                  {insights.sentiment_percentages.Positive || 0}%
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Positive</span>
              </div>
            </div>

            {/* Clickable Legend with Count and % */}
            <div className="space-y-2.5 w-full sm:w-auto">
              {data.map((item) => {
                const isSelected = selectedSentiment?.toLowerCase() === item.name.toLowerCase() ||
                  (selectedSentiment === 'Needs_Review' && item.name === 'Needs Review');
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (onSelectSentiment) {
                        const target = item.name === 'Needs Review' ? 'Needs_Review' : item.name;
                        onSelectSentiment(selectedSentiment === target ? 'all' : target);
                      }
                    }}
                    className={`flex items-center justify-between gap-6 text-xs w-full px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-800 border-indigo-500 shadow-sm' 
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300 font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold tabular-nums">{item.value}</span>
                      <span className="text-slate-400 font-mono text-[11px] w-12 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exclusions Notice */}
          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {insights.exclusions_disclaimer || `Percentages calculated over ${classifiedCount} classified records.`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
