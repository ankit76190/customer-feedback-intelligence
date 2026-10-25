'use client';

import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Calendar, TrendingUp, Info, AlertCircle } from 'lucide-react';
import { ExecutiveInsights } from '../../lib/types';

interface TimeSeriesChartsProps {
  insights: ExecutiveInsights;
}

export const TimeSeriesCharts: React.FC<TimeSeriesChartsProps> = ({ insights }) => {
  const [chartView, setChartView] = useState<'volume' | 'sentiment'>('volume');

  const hasValidDates = insights.has_valid_dates && insights.time_series_data && insights.time_series_data.length > 0;
  const data = insights.time_series_data || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5">
          <p className="font-semibold text-white border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>{point.date}</span>
          </p>
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>Total Volume:</span>
            <span className="font-bold text-white">{point.total}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Positive:</span>
            <span className="font-semibold">{point.positive}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-amber-400">
            <span>Neutral:</span>
            <span className="font-semibold">{point.neutral}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Negative:</span>
            <span className="font-semibold">{point.negative}</span>
          </div>
          {point.needs_review > 0 && (
            <div className="flex items-center justify-between gap-4 text-purple-400">
              <span>Needs Review:</span>
              <span className="font-semibold">{point.needs_review}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {chartView === 'volume' ? 'Feedback Volume Over Time' : 'Sentiment Trends Over Time'}
            </h3>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              Daily Distribution
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasValidDates 
              ? `Plotted over ${insights.dated_records_count || data.reduce((acc, p) => acc + p.total, 0)} dated feedback entries`
              : 'Requires valid date column in dataset'}
          </p>
        </div>

        {/* View Toggle Buttons */}
        {hasValidDates && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setChartView('volume')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                chartView === 'volume'
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setChartView('sentiment')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                chartView === 'sentiment'
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sentiment Breakdown
            </button>
          </div>
        )}
      </div>

      {/* Main Chart Area */}
      {!hasValidDates ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-lg border border-slate-800/80 space-y-2.5">
          <AlertCircle className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-semibold text-slate-300">
            No Valid Timestamp Data Detected
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm">
            To view feedback volume and sentiment trends over time, ensure your uploaded file contains a valid date column mapped during ingestion.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'volume' ? (
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748B" 
                    fontSize={10} 
                    tickFormatter={(val) => {
                      const parts = val.split('-');
                      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val;
                    }}
                  />
                  <YAxis stroke="#64748B" fontSize={10} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#volumeGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748B" 
                    fontSize={10} 
                    tickFormatter={(val) => {
                      const parts = val.split('-');
                      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val;
                    }}
                  />
                  <YAxis stroke="#64748B" fontSize={10} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="positive" stackId="a" fill="#10B981" />
                  <Bar dataKey="neutral" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="negative" stackId="a" fill="#F43F5E" />
                  <Bar dataKey="needs_review" stackId="a" fill="#A855F7" radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Undated records transparency disclaimer */}
          {insights.undated_records_count !== undefined && insights.undated_records_count > 0 && (
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {insights.undated_records_count} record{insights.undated_records_count > 1 ? 's' : ''} with missing or unparseable timestamps excluded from timeline.
                </span>
              </div>
              <span className="font-mono text-slate-400">
                Range: {insights.min_date} to {insights.max_date}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
