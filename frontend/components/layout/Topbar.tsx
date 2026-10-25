'use client';

import React from 'react';
import { 
  FileSpreadsheet, 
  RotateCcw, 
  Key, 
  Database, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { api } from '../../lib/api';
import { SystemStatus } from '../../lib/types';

interface TopbarProps {
  currentDatasetId: string;
  onDatasetChange: (id: string) => void;
  status: SystemStatus | null;
  onOpenApiKeyModal: () => void;
  onReloadSample: () => void;
  totalRecordsCount?: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentDatasetId,
  onDatasetChange,
  status,
  onOpenApiKeyModal,
  onReloadSample,
  totalRecordsCount
}) => {
  const activeDatasets = status?.active_datasets || [];

  return (
    <header className="h-16 bg-[#0F172A]/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Active Dataset Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Dataset:</span>
          {activeDatasets.length > 0 ? (
            <select
              value={currentDatasetId}
              onChange={(e) => onDatasetChange(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {activeDatasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id} className="bg-slate-900 text-white">
                  {d.filename} ({d.total_records} rows)
                </option>
              ))}
            </select>
          ) : (
            <span className="font-medium text-white">{currentDatasetId}</span>
          )}
        </div>

        {totalRecordsCount !== undefined && (
          <span className="text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-1 rounded">
            {totalRecordsCount} records
          </span>
        )}
      </div>

      {/* Right Actions: API Status, Sample Load, Export */}
      <div className="flex items-center gap-3">
        {/* Gemini API Pill */}
        <button
          onClick={onOpenApiKeyModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            status?.api_key_configured
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40 animate-pulse'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${status?.api_key_configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>
            {status?.api_key_configured
              ? `Gemini Connected (${status.gemini_model})`
              : 'Gemini Key Missing'}
          </span>
        </button>

        {/* Reload Sample */}
        <button
          onClick={onReloadSample}
          title="Reload clean enterprise sample data"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Sample</span>
        </button>

        {/* Excel Export Button */}
        <a
          href={api.getExcelExportUrl(currentDatasetId)}
          download
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </a>
      </div>
    </header>
  );
};
