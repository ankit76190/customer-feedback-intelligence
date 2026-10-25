'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ListFilter, 
  ArrowLeft, 
  FileSpreadsheet, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../../components/layout/AppShell';
import { api } from '../../lib/api';
import { FeedbackRecord, PaginatedRecordsResponse } from '../../lib/types';
import { FilterToolbar } from '../../components/records/FilterToolbar';
import { RecordsTable } from '../../components/records/RecordsTable';
import { RecordDrawer } from '../../components/records/RecordDrawer';

export default function RecordsPage() {
  const { currentDatasetId } = useApp();

  const [data, setData] = useState<PaginatedRecordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState('all');
  const [theme, setTheme] = useState('all');

  // Selected Record for Detail Drawer
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);

  const fetchRecords = async () => {
    if (!currentDatasetId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getRecords({
        datasetId: currentDatasetId,
        page,
        limit: 20,
        search: search.trim() || undefined,
        sentiment: sentiment !== 'all' ? sentiment : undefined,
        theme: theme !== 'all' ? theme : undefined,
      });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch feedback records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentDatasetId, page, sentiment, theme]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleClearFilters = () => {
    setSearch('');
    setSentiment('all');
    setTheme('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-slate-400">•</span>
            <span className="text-xs font-mono text-slate-400">{currentDatasetId}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Feedback Explorer & Record Inspector
          </h1>
          <p className="text-xs text-slate-400">
            Search, filter, and inspect verbatim customer entries with AI sentiment classifications and pain points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.getExcelExportUrl(currentDatasetId)}
            download
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export View to Excel</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        selectedSentiment={sentiment}
        onSentimentChange={(val) => {
          setSentiment(val);
          setPage(1);
        }}
        selectedTheme={theme}
        onThemeChange={(val) => {
          setTheme(val);
          setPage(1);
        }}
        themes={data?.available_themes || []}
        sentimentCounts={data?.sentiment_filter_counts || { Positive: 0, Negative: 0, Neutral: 0 }}
        onClearFilters={handleClearFilters}
      />

      {/* Loading state */}
      {loading && !data && (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Loading records ledger...</p>
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
            onClick={fetchRecords}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded font-medium text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Records Table */}
      {data && (
        <RecordsTable
          records={data.records}
          total={data.total}
          page={data.page}
          limit={data.limit}
          totalPages={data.total_pages}
          onPageChange={setPage}
          onSelectRecord={setSelectedRecord}
          selectedRecordId={selectedRecord?.id}
        />
      )}

      {/* Slide-over Inspection Drawer */}
      <RecordDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
