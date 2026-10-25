'use client';

import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Filter, 
  Calendar, 
  Database, 
  RotateCcw, 
  Package, 
  Tag,
  Check
} from 'lucide-react';
import { SystemStatus } from '../../lib/types';

export interface DashboardFilters {
  search: string;
  sentiment: string;
  theme: string;
  startDate: string;
  endDate: string;
  product: string;
  category: string;
  datePreset: 'all' | '7d' | '30d' | 'custom';
}

interface DashboardFilterBarProps {
  currentDatasetId: string;
  onDatasetChange: (id: string) => void;
  status: SystemStatus | null;
  filters: DashboardFilters;
  onFiltersChange: (newFilters: DashboardFilters) => void;
  onClearFilters: () => void;
  availableThemes: string[];
  availableProducts: string[];
  availableCategories: string[];
  hasValidDates?: boolean;
  minDate?: string | null;
  maxDate?: string | null;
  totalRecordsCount?: number;
  filteredRecordsCount?: number;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  currentDatasetId,
  onDatasetChange,
  status,
  filters,
  onFiltersChange,
  onClearFilters,
  availableThemes,
  availableProducts,
  availableCategories,
  hasValidDates,
  minDate,
  maxDate,
  totalRecordsCount,
  filteredRecordsCount
}) => {
  const [showCustomDate, setShowCustomDate] = useState(filters.datePreset === 'custom');

  const activeDatasets = status?.active_datasets || [];

  const hasActiveFilters = 
    Boolean(filters.search) || 
    filters.sentiment !== 'all' || 
    filters.theme !== 'all' || 
    filters.product !== 'all' || 
    filters.category !== 'all' || 
    filters.datePreset !== 'all' ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  const handlePresetChange = (preset: 'all' | '7d' | '30d' | 'custom') => {
    if (preset === 'all') {
      setShowCustomDate(false);
      onFiltersChange({
        ...filters,
        datePreset: 'all',
        startDate: '',
        endDate: ''
      });
    } else if (preset === 'custom') {
      setShowCustomDate(true);
      onFiltersChange({
        ...filters,
        datePreset: 'custom'
      });
    } else {
      setShowCustomDate(false);
      // Calculate date relative to maxDate or now
      const base = maxDate ? new Date(maxDate) : new Date();
      const past = new Date(base);
      past.setDate(past.getDate() - (preset === '7d' ? 7 : 30));

      const start = past.toISOString().split('T')[0];
      const end = base.toISOString().split('T')[0];

      onFiltersChange({
        ...filters,
        datePreset: preset,
        startDate: start,
        endDate: end
      });
    }
  };

  const sentiments = [
    { label: 'All', value: 'all' },
    { label: 'Positive', value: 'Positive', color: 'text-emerald-400' },
    { label: 'Neutral', value: 'Neutral', color: 'text-amber-400' },
    { label: 'Negative', value: 'Negative', color: 'text-rose-400' },
    { label: 'Needs Review', value: 'Needs_Review', color: 'text-purple-400' },
  ];

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-sm space-y-3.5">
      {/* Top Row: Global Dataset Selector, Search, and Facet Selectors */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Dataset Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs shrink-0">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400 font-medium">Dataset:</span>
          {activeDatasets.length > 0 ? (
            <select
              value={currentDatasetId}
              onChange={(e) => onDatasetChange(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {activeDatasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id} className="bg-slate-900 text-white">
                  {d.filename} ({d.total_records} rows)
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-white">{currentDatasetId}</span>
          )}
        </div>

        {/* Search Feedback Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search verbatims, AI summaries, or record IDs..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters (Theme, Product, Category) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Theme Dropdown */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={filters.theme}
              onChange={(e) => onFiltersChange({ ...filters, theme: e.target.value })}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="all" className="bg-slate-900">All Themes</option>
              {availableThemes.map((t) => (
                <option key={t} value={t} className="bg-slate-900">{t}</option>
              ))}
            </select>
          </div>

          {/* Product Dropdown (if present) */}
          {availableProducts.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
              <Package className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={filters.product}
                onChange={(e) => onFiltersChange({ ...filters, product: e.target.value })}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="all" className="bg-slate-900">All Products</option>
                {availableProducts.map((p) => (
                  <option key={p} value={p} className="bg-slate-900">{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category Dropdown (if present) */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
              <Tag className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={filters.category}
                onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="all" className="bg-slate-900">All Channels</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c} className="bg-slate-900">{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Reset all filters to show full dataset"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Sentiment Pills & Date Range Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-800/70 text-xs">
        {/* Sentiment Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1.5 shrink-0">
            Sentiment:
          </span>
          {sentiments.map((s) => {
            const isActive = filters.sentiment.toLowerCase() === s.value.toLowerCase();
            return (
              <button
                key={s.value}
                onClick={() => onFiltersChange({ ...filters, sentiment: s.value })}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={!isActive && s.color ? s.color : ''}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Presets (Only enabled if valid dates exist) */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1.5 shrink-0 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Time Range:</span>
          </span>

          {hasValidDates ? (
            <div className="flex items-center gap-1">
              {(['all', '7d', '30d', 'custom'] as const).map((preset) => {
                const isActive = filters.datePreset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => handlePresetChange(preset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset === 'all' ? 'All Time' : preset === '7d' ? 'Last 7D' : preset === '30d' ? 'Last 30D' : 'Custom'}
                  </button>
                );
              })}

              {/* Custom Date Inputs */}
              {showCustomDate && (
                <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-800">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">to</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              Timestamp column unavailable
            </span>
          )}
        </div>
      </div>

      {/* Filter status reporting indicator */}
      {hasActiveFilters && filteredRecordsCount !== undefined && totalRecordsCount !== undefined && (
        <div className="text-[11px] text-indigo-300 bg-indigo-950/30 border border-indigo-500/20 px-3 py-1 rounded-lg flex items-center justify-between">
          <span>
            Filtering active: Showing <strong className="text-white">{filteredRecordsCount}</strong> of <strong className="text-white">{totalRecordsCount}</strong> records matching current parameters.
          </span>
          <button
            onClick={onClearFilters}
            className="text-[10px] font-medium text-indigo-400 hover:text-white underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
