'use client';

import React from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  BarChart3, 
  ListFilter,
  Copy,
  FileCheck2
} from 'lucide-react';
import { NormalizationResult } from '../../lib/types';

interface CleaningAuditSummaryProps {
  result: NormalizationResult;
  onGoToDashboard: () => void;
}

export const CleaningAuditSummary: React.FC<CleaningAuditSummaryProps> = ({
  result,
  onGoToDashboard,
}) => {
  const flags = Object.entries(result.flagged_reasons_summary);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Preprocessing & Normalization Complete</h3>
            <p className="text-xs text-slate-400">
              Dataset: <span className="font-mono text-indigo-400">{result.filename}</span> (ID: {result.dataset_id})
            </p>
          </div>
        </div>
      </div>

      {/* Non-destructive guarantee banner */}
      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3 text-xs text-indigo-200">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white text-xs">100% Data Preservation Audit Guarantee</p>
          <p className="text-indigo-300/80 text-[11px] mt-0.5 leading-relaxed">
            No customer feedback records were silently deleted. Blank rows, duplicates, and malformed dates are explicitly audited and tagged. Original verbatim text is preserved untouched alongside cleaned text.
          </p>
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Total Raw Rows
          </span>
          <div className="text-2xl font-bold text-white tabular-nums mt-1">
            {result.total_raw_rows.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[10px] font-semibold uppercase text-emerald-400 tracking-wider">
            Accepted Clean
          </span>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">
            {result.accepted_records.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Ready for AI analysis</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[10px] font-semibold uppercase text-amber-400 tracking-wider">
            Flagged with Notes
          </span>
          <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">
            {result.flagged_records.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Preserved with flags</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Blank Rows Skipped
          </span>
          <div className="text-2xl font-bold text-slate-300 tabular-nums mt-1">
            {result.skipped_blank_rows.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Zero data content</span>
        </div>
      </div>

      {/* Flag Breakdown */}
      {flags.length > 0 && (
        <div className="space-y-2.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Audited Quality Flag Categories</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {flags.map(([reason, count]) => (
              <div
                key={reason}
                className="px-3 py-2 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between font-mono"
              >
                <span className="text-[11px] text-slate-300 truncate">{reason}</span>
                <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded text-[10px] ml-2">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action CTAs */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        <Link
          href="/records"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ListFilter className="w-3.5 h-3.5 text-slate-400" />
          <span>Inspect Processed Records</span>
        </Link>
        <button
          onClick={onGoToDashboard}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Go to Analytics Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
