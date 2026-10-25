'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Table, 
  AlertCircle, 
  Loader2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { ColumnMapping, UploadPreviewResponse, NormalizationResult, RawPreviewResponse } from '../../lib/types';
import { api } from '../../lib/api';

interface ColumnMapperProps {
  preview: UploadPreviewResponse;
  onNormalizationComplete: (result: NormalizationResult) => void;
  onSheetChanged: (newPreview: UploadPreviewResponse) => void;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  preview,
  onNormalizationComplete,
  onSheetChanged,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>(preview.suggested_mapping);
  const [activeSheet, setActiveSheet] = useState<string>(preview.active_sheet || '');
  const [normalizing, setNormalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination in raw preview
  const [previewPage, setPreviewPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawPreview, setRawPreview] = useState<RawPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const columns = rawPreview?.columns || preview.detected_columns;

  const fetchLivePreview = async (page: number, search: string, sheet?: string) => {
    setLoadingPreview(true);
    try {
      const res = await api.getDatasetPreview(
        preview.dataset_id,
        page,
        10,
        search.trim() || undefined,
        sheet || activeSheet || undefined
      );
      setRawPreview(res);
    } catch (e) {
      console.warn('Could not fetch live preview:', e);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchLivePreview(1, searchQuery, activeSheet);
  }, [preview.dataset_id]);

  const handleSheetChange = async (newSheet: string) => {
    setActiveSheet(newSheet);
    setPreviewPage(1);
    try {
      await fetchLivePreview(1, searchQuery, newSheet);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPreviewPage(1);
    fetchLivePreview(1, val, activeSheet);
  };

  const handlePageChange = (newPage: number) => {
    setPreviewPage(newPage);
    fetchLivePreview(newPage, searchQuery, activeSheet);
  };

  const handleNormalize = async () => {
    if (!mapping.feedback_text_col) {
      setError('Please select which column contains the verbatim feedback text.');
      return;
    }

    setNormalizing(true);
    setError(null);
    try {
      const result = await api.normalizeDataset(preview.dataset_id, mapping);
      onNormalizationComplete(result);
    } catch (err: any) {
      setError(err.message || 'Normalization failed.');
    } finally {
      setNormalizing(false);
    }
  };

  const rows = rawPreview ? rawPreview.rows : preview.preview_rows;
  const totalRows = rawPreview ? rawPreview.total_rows : preview.total_rows;
  const totalPages = rawPreview ? rawPreview.total_pages : Math.ceil(preview.total_rows / 10);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
      {/* Header with Dataset and Sheet Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Column Mapping & Schema Verification</h3>
          <p className="text-xs text-slate-400">
            Source: <span className="font-mono text-indigo-400">{preview.filename}</span> ({totalRows.toLocaleString()} rows detected, {(preview.file_size_bytes / 1024).toFixed(1)} KB)
          </p>
        </div>

        {/* Worksheet Selector if multiple sheets exist */}
        {preview.sheet_names && preview.sheet_names.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Worksheet:</span>
            <select
              value={activeSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {preview.sheet_names.map((sheet) => (
                <option key={sheet} value={sheet} className="bg-slate-900">
                  {sheet}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Feedback Text (Required) */}
        <div className="bg-slate-900/60 border border-indigo-500/40 p-3.5 rounded-lg space-y-1.5 shadow-xs">
          <label className="block text-xs font-semibold text-indigo-300">
            Feedback Text Column <span className="text-rose-400">* (Required)</span>
          </label>
          <select
            value={mapping.feedback_text_col}
            onChange={(e) => setMapping({ ...mapping, feedback_text_col: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">The customer comment or review verbatim.</p>
        </div>

        {/* Customer / Ticket ID (Optional) */}
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Customer ID / Ticket Reference
          </label>
          <select
            value={mapping.id_col || ''}
            onChange={(e) => setMapping({ ...mapping, id_col: e.target.value || null })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- None (Auto-generate stable ID) --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">Unique identifier for tracking.</p>
        </div>

        {/* Product / SKU / Offering (Optional) */}
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Product / Feature / SKU
          </label>
          <select
            value={mapping.product_col || ''}
            onChange={(e) => setMapping({ ...mapping, product_col: e.target.value || null })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- None --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">Product tier or item name mentioned.</p>
        </div>

        {/* Submission Date (Optional) */}
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Submission Date / Timestamp
          </label>
          <select
            value={mapping.date_col || ''}
            onChange={(e) => setMapping({ ...mapping, date_col: e.target.value || null })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- None --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">Date customer submitted feedback.</p>
        </div>

        {/* Rating (Optional) */}
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Customer Rating (1-5 Stars, NPS, CSAT)
          </label>
          <select
            value={mapping.rating_col || ''}
            onChange={(e) => setMapping({ ...mapping, rating_col: e.target.value || null })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- None --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">Numerical customer score.</p>
        </div>

        {/* Channel / Category (Optional) */}
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Channel / Department / Category
          </label>
          <select
            value={mapping.category_col || ''}
            onChange={(e) => setMapping({ ...mapping, category_col: e.target.value || null })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- None --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">Source: Support ticket, Review, Survey, etc.</p>
        </div>
      </div>

      {/* Interactive Searchable Data Preview Table */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Table className="w-3.5 h-3.5 text-indigo-400" />
            <span>Uploaded Data Preview ({totalRows.toLocaleString()} total rows)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search raw rows..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0F172A] text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap text-slate-400">Row #</th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2.5 whitespace-nowrap">
                    {col}
                    {col === mapping.feedback_text_col && (
                      <span className="ml-1 text-indigo-400 lowercase font-mono">(feedback)</span>
                    )}
                    {col === mapping.product_col && (
                      <span className="ml-1 text-amber-400 lowercase font-mono">(product)</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loadingPreview ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-1" />
                    <span>Loading rows...</span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-8 text-center text-slate-400">
                    No rows match search query.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[10px] text-slate-400">
                      {row._original_row_number || (previewPage - 1) * 10 + idx + 2}
                    </td>
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 max-w-xs truncate text-[11px] text-slate-200">
                        {row[col] !== null && row[col] !== undefined ? (
                          String(row[col])
                        ) : (
                          <span className="text-slate-400 italic">null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div>
            Page <span className="text-white font-semibold">{previewPage}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(previewPage - 1)}
              disabled={previewPage <= 1 || loadingPreview}
              className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(previewPage + 1)}
              disabled={previewPage >= totalPages || loadingPreview}
              className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Confirmation CTA */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        <button
          onClick={handleNormalize}
          disabled={normalizing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
        >
          {normalizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Normalizing Records...</span>
            </>
          ) : (
            <>
              <span>Confirm Mapping & Preprocess Feedback</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
