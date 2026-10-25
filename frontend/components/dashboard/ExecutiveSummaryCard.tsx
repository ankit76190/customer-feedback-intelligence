'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Play, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  RotateCcw, 
  Key,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { api } from '../../lib/api';
import { AnalysisJobResponse } from '../../lib/types';

interface ExecutiveSummaryCardProps {
  summary: string;
  datasetId: string;
  analyzedCount: number;
  totalCount: number;
  onAnalysisComplete: () => void;
  onOpenApiKeyModal: () => void;
  isApiKeyConfigured: boolean;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  summary,
  datasetId,
  analyzedCount,
  totalCount,
  onAnalysisComplete,
  onOpenApiKeyModal,
  isApiKeyConfigured,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [sampleLimit, setSampleLimit] = useState<number>(20);
  const [batchSize, setBatchSize] = useState<number>(5);
  const [activeJob, setActiveJob] = useState<AnalysisJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll job status until complete or failed
  const startPolling = (jobId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const job = await api.getAnalysisStatus(jobId);
        setActiveJob(job);

        if (job.status === 'completed' || job.status === 'failed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setAnalyzing(false);

          if (job.status === 'completed') {
            const cachedNote = job.cached_records > 0 ? ` (${job.cached_records} loaded instantly from cache)` : '';
            setSuccessMsg(
              `Gemini analysis complete! Processed ${job.processed_records} records in ${job.duration_seconds.toFixed(1)}s${cachedNote}.`
            );
            onAnalysisComplete();
          } else {
            setError(job.error_message || 'Analysis encountered an error during batch processing.');
          }
        }
      } catch (err: any) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setAnalyzing(false);
        setError(err.message || 'Error tracking analysis job.');
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleRunAnalysis = async () => {
    if (!isApiKeyConfigured) {
      onOpenApiKeyModal();
      return;
    }

    setAnalyzing(true);
    setError(null);
    setSuccessMsg(null);
    setActiveJob(null);

    try {
      const job = await api.startAnalysis({
        datasetId,
        batchSize,
        limit: sampleLimit,
      });
      setActiveJob(job);
      startPolling(job.job_id);
    } catch (err: any) {
      setAnalyzing(false);
      setError(err.message || 'Failed to start Gemini analysis job.');
    }
  };

  const handleRetryFailed = async () => {
    if (!activeJob) return;
    setAnalyzing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const job = await api.retryFailedAnalysis(activeJob.job_id);
      setActiveJob(job);
      startPolling(job.job_id);
    } catch (err: any) {
      setAnalyzing(false);
      setError(err.message || 'Failed to retry records.');
    }
  };

  const progressPct = activeJob && activeJob.total_records > 0
    ? Math.min(100, Math.round(((activeJob.processed_records + activeJob.failed_records) / activeJob.total_records) * 100))
    : 0;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Missing Key Warning Banner */}
      {!isApiKeyConfigured && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Google Gemini API key is not configured. Real AI analysis requires a free API key from Google AI Studio.
            </span>
          </div>
          <button
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-900/60 hover:bg-amber-900 text-amber-100 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Set GEMINI_API_KEY</span>
          </button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Executive Intelligence Summary</h2>
            <p className="text-xs text-slate-400">Grounded analysis with Gemini 2.5 and SHA-256 caching</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sample Limit */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400">Limit:</span>
            <select
              value={sampleLimit}
              onChange={(e) => setSampleLimit(Number(e.target.value))}
              disabled={analyzing}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-slate-900">10 records (Test)</option>
              <option value={20} className="bg-slate-900">20 records (Quick)</option>
              <option value={50} className="bg-slate-900">50 records</option>
              <option value={totalCount} className="bg-slate-900">All {totalCount} records</option>
            </select>
          </div>

          {/* Batch Size */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400">Batch:</span>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={analyzing}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value={5} className="bg-slate-900">5 / batch</option>
              <option value={10} className="bg-slate-900">10 / batch</option>
            </select>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Batches...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Analyze with Gemini</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Content Body */}
      <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans">
        {summary}
      </div>

      {/* Live Job Progress Bar */}
      {analyzing && activeJob && (
        <div className="p-3.5 rounded-lg bg-slate-900 border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="font-semibold">Batch Analysis in Progress...</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>
                {activeJob.processed_records} / {activeJob.total_records} records
              </span>
              <span className="text-white font-bold">{progressPct}%</span>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <div className="flex items-center gap-3">
              {activeJob.cached_records > 0 && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Zap className="w-3 h-3" />
                  {activeJob.cached_records} cached (zero API cost)
                </span>
              )}
              {activeJob.failed_records > 0 && (
                <span className="text-rose-400">
                  {activeJob.failed_records} failed
                </span>
              )}
            </div>
            <span>Model: {activeJob.model_used}</span>
          </div>
        </div>
      )}

      {/* Error Message & Retry Action */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          {activeJob && activeJob.failed_records > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={analyzing}
              className="flex items-center gap-1 px-3 py-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry Failed ({activeJob.failed_records})</span>
            </button>
          )}
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
};
