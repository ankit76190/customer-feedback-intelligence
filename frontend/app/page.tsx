'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  UploadCloud, 
  ListFilter, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet,
  FilterX
} from 'lucide-react';
import { useApp } from '../components/layout/AppShell';
import { api } from '../lib/api';
import { ExecutiveInsights, FeedbackRecord, PaginatedRecordsResponse } from '../lib/types';
import { KpiCards } from '../components/dashboard/KpiCards';
import { ExecutiveSummaryCard } from '../components/dashboard/ExecutiveSummaryCard';
import { SentimentDonutChart } from '../components/dashboard/SentimentDonutChart';
import { ThemeFrequencyChart } from '../components/dashboard/ThemeFrequencyChart';
import { TimeSeriesCharts } from '../components/dashboard/TimeSeriesCharts';
import { ProductCategoryBreakdownChart } from '../components/dashboard/ProductCategoryBreakdownChart';
import { PainPointsCard } from '../components/dashboard/PainPointsCard';
import { OpportunitiesCard } from '../components/dashboard/OpportunitiesCard';
import { DashboardFilterBar, DashboardFilters } from '../components/dashboard/DashboardFilterBar';
import { RecordsTable } from '../components/records/RecordsTable';
import { RecordDrawer } from '../components/records/RecordDrawer';

const INITIAL_FILTERS: DashboardFilters = {
  search: '',
  sentiment: 'all',
  theme: 'all',
  startDate: '',
  endDate: '',
  product: 'all',
  category: 'all',
  datePreset: 'all'
};

export default function DashboardPage() {
  const { currentDatasetId, setCurrentDatasetId, status, openApiKeyModal, refreshStatus } = useApp();
  
  const [insights, setInsights] = useState<ExecutiveInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dashboard Interactive Filters
  const [filters, setFilters] = useState<DashboardFilters>(INITIAL_FILTERS);

  // Paginated records state for dashboard explorer
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsLimit] = useState(10);
  const [recordsTotalPages, setRecordsTotalPages] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);

  // Fetch Analytics & Filtered Insights
  const fetchDashboardData = useCallback(async () => {
    if (!currentDatasetId) return;
    setLoading(true);
    setError(null);
    try {
      const [insightsData, recordsData] = await Promise.all([
        api.getAnalytics({
          datasetId: currentDatasetId,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          sentiment: filters.sentiment !== 'all' ? filters.sentiment : undefined,
          theme: filters.theme !== 'all' ? filters.theme : undefined,
          product: filters.product !== 'all' ? filters.product : undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
          search: filters.search || undefined
        }),
        api.getRecords({
          datasetId: currentDatasetId,
          page: recordsPage,
          limit: recordsLimit,
          search: filters.search || undefined,
          sentiment: filters.sentiment !== 'all' ? filters.sentiment : undefined,
          theme: filters.theme !== 'all' ? filters.theme : undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          product: filters.product !== 'all' ? filters.product : undefined,
          category: filters.category !== 'all' ? filters.category : undefined
        })
      ]);

      setInsights(insightsData);
      setRecords(recordsData.records);
      setRecordsTotal(recordsData.total);
      setRecordsTotalPages(recordsData.total_pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load executive intelligence analytics.');
    } finally {
      setLoading(false);
    }
  }, [currentDatasetId, filters, recordsPage, recordsLimit]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setRecordsPage(1);
  };

  const handleFilterSentiment = (sentiment: string) => {
    setFilters(prev => ({ ...prev, sentiment }));
    setRecordsPage(1);
  };

  const handleFilterTheme = (theme: string) => {
    setFilters(prev => ({ ...prev, theme }));
    setRecordsPage(1);
  };

  const handleFilterProduct = (product: string) => {
    setFilters(prev => ({ ...prev, product }));
    setRecordsPage(1);
  };

  const handleFilterCategory = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
    setRecordsPage(1);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Executive Analytics
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs font-mono text-slate-400">{currentDatasetId}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Customer Feedback Intelligence Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload Dataset</span>
          </Link>
          <a
            href={api.getExcelExportUrl(currentDatasetId)}
            download
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </a>
        </div>
      </div>

      {/* Global Interactive Filter Bar */}
      <DashboardFilterBar
        currentDatasetId={currentDatasetId}
        onDatasetChange={(id) => {
          setCurrentDatasetId(id);
          setRecordsPage(1);
        }}
        status={status}
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          setRecordsPage(1);
        }}
        onClearFilters={handleClearFilters}
        availableThemes={insights?.available_themes || []}
        availableProducts={insights?.available_products || []}
        availableCategories={insights?.available_categories || []}
        hasValidDates={insights?.has_valid_dates}
        minDate={insights?.min_date}
        maxDate={insights?.max_date}
        totalRecordsCount={status?.active_datasets.find(d => d.dataset_id === currentDatasetId)?.total_records ?? insights?.total_records}
        filteredRecordsCount={recordsTotal}
      />

      {/* Loading state indicator */}
      {loading && !insights && (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Computing data-driven intelligence metrics...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded font-medium text-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Main Content */}
      {insights && (
        <div className="space-y-6">
          {/* Executive AI Summary & Gemini Batch Engine Trigger */}
          <ExecutiveSummaryCard
            summary={insights.ai_executive_summary}
            datasetId={currentDatasetId}
            analyzedCount={insights.analyzed_records}
            totalCount={insights.total_records}
            onAnalysisComplete={() => {
              fetchDashboardData();
              refreshStatus();
            }}
            onOpenApiKeyModal={openApiKeyModal}
            isApiKeyConfigured={status?.api_key_configured ?? false}
          />

          {/* KPI Metric Cards */}
          <KpiCards 
            insights={insights}
            onFilterSentiment={handleFilterSentiment}
            selectedSentiment={filters.sentiment}
          />

          {/* Row 1 Charts: Sentiment Donut & Theme Frequency (with click-to-filter) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SentimentDonutChart 
              insights={insights} 
              onSelectSentiment={handleFilterSentiment}
              selectedSentiment={filters.sentiment}
            />
            <ThemeFrequencyChart 
              themes={insights.top_recurring_themes} 
              onSelectTheme={handleFilterTheme}
              selectedTheme={filters.theme}
            />
          </div>

          {/* Row 2 Charts: Timeline Series & Product/Channel Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeSeriesCharts insights={insights} />
            <ProductCategoryBreakdownChart 
              insights={insights}
              onFilterProduct={handleFilterProduct}
              onFilterCategory={handleFilterCategory}
              selectedProduct={filters.product}
              selectedCategory={filters.category}
            />
          </div>

          {/* Row 3: Critical Customer Pain Points & Actionable Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PainPointsCard 
              painPoints={insights.critical_pain_points} 
              onSelectPainPoint={(pp) => {
                setFilters(prev => ({ ...prev, search: pp }));
                setRecordsPage(1);
              }}
              selectedSearch={filters.search}
            />
            <OpportunitiesCard opportunities={insights.top_improvement_opportunities} />
          </div>

          {/* Row 4: Live Feedback Records Explorer Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Feedback Verbatim Ledger</h3>
                <p className="text-xs text-slate-400">
                  Showing actual feedback records reflecting current dashboard filters
                </p>
              </div>
              {recordsTotal === 0 && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 hover:bg-indigo-900/40 cursor-pointer"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <RecordsTable
              records={records}
              total={recordsTotal}
              page={recordsPage}
              limit={recordsLimit}
              totalPages={recordsTotalPages}
              onPageChange={(p) => setRecordsPage(p)}
              onSelectRecord={(r) => setSelectedRecord(r)}
              selectedRecordId={selectedRecord?.id}
            />
          </div>
        </div>
      )}

      {/* Slide-Over Record Inspector Drawer */}
      <RecordDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
