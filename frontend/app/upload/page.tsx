'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FileDropzone } from '../../components/upload/FileDropzone';
import { ColumnMapper } from '../../components/upload/ColumnMapper';
import { CleaningAuditSummary } from '../../components/upload/CleaningAuditSummary';
import { UploadPreviewResponse, NormalizationResult } from '../../lib/types';
import { useApp } from '../../components/layout/AppShell';

export default function UploadPage() {
  const router = useRouter();
  const { setCurrentDatasetId, refreshStatus } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preview, setPreview] = useState<UploadPreviewResponse | null>(null);
  const [normalizationResult, setNormalizationResult] = useState<NormalizationResult | null>(null);

  const handleUploadSuccess = (data: UploadPreviewResponse) => {
    setPreview(data);
    setCurrentDatasetId(data.dataset_id);
    setStep(2);
  };

  const handleNormalizationComplete = (result: NormalizationResult) => {
    setNormalizationResult(result);
    refreshStatus();
    setStep(3);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Data Ingestion & Normalization Wizard
          </h1>
          <p className="text-xs text-slate-400">
            Upload raw customer feedback, verify column mappings, and normalize text non-destructively.
          </p>
        </div>

        {/* Wizard Stepper */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`px-3 py-1 rounded-full font-medium ${
              step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            1. Upload
          </span>
          <span className="text-slate-400">→</span>
          <span
            className={`px-3 py-1 rounded-full font-medium ${
              step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            2. Map & Verify
          </span>
          <span className="text-slate-400">→</span>
          <span
            className={`px-3 py-1 rounded-full font-medium ${
              step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            3. Audit Summary
          </span>
        </div>
      </div>

      {/* Step 1: File Dropzone */}
      {step === 1 && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-8 shadow-sm">
          <FileDropzone onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Step 2: Column Mapper */}
      {step === 2 && preview && (
        <ColumnMapper
          preview={preview}
          onNormalizationComplete={handleNormalizationComplete}
          onSheetChanged={(newPreview) => setPreview(newPreview)}
        />
      )}

      {/* Step 3: Cleaning Audit */}
      {step === 3 && normalizationResult && (
        <CleaningAuditSummary
          result={normalizationResult}
          onGoToDashboard={() => router.push('/')}
        />
      )}
    </div>
  );
}
