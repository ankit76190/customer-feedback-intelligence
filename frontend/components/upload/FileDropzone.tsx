'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  Loader2, 
  Download, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import { api } from '../../lib/api';
import { UploadPreviewResponse } from '../../lib/types';

interface FileDropzoneProps {
  onUploadSuccess: (preview: UploadPreviewResponse, file: File) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError(`Invalid file format for "${file.name}". Please upload a .csv, .xlsx, or .xls file.`);
      return;
    }

    const MAX_SIZE_MB = 25;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB limit.`);
      return;
    }

    if (file.size === 0) {
      setError(`File "${file.name}" is completely empty (0 bytes).`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setError(null);
    setSelectedFileName(file.name);

    try {
      // Simulate progress progression while parsing large files
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 25 : prev));
      }, 200);

      const preview = await api.uploadFile(file);
      clearInterval(progressTimer);
      setUploadProgress(100);

      setTimeout(() => {
        onUploadSuccess(preview, file);
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and validate dataset.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Sample Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Need test data to try right now?</h4>
            <p className="text-[11px] text-slate-400">
              Download our synthetic dataset with 500 diverse customer feedback verbatims across SaaS, E-Commerce, and FinTech.
            </p>
          </div>
        </div>
        <a
          href={api.getSampleCsvUrl()}
          download="customer_feedback_sample_500.csv"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors shrink-0 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample CSV (500 Rows)</span>
        </a>
      </div>

      {/* Main Drag-and-Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/20 scale-[0.99]'
            : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
          {isUploading ? (
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          ) : (
            <UploadCloud className="w-7 h-7" />
          )}
        </div>

        <h3 className="text-sm font-semibold text-white mb-1">
          {isUploading
            ? `Validating & Ingesting ${selectedFileName}...`
            : 'Click to select or drag and drop customer feedback files'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md">
          Supported file types: <span className="text-white font-mono font-medium">.csv, .xlsx, .xls</span>. Up to 25 MB and 20,000 rows.
        </p>

        {/* Progress Bar when uploading */}
        {isUploading && (
          <div className="w-full max-w-xs mt-4 space-y-1.5">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Checking schema & encodings...</span>
              <span>{uploadProgress}%</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Safe Isolated Storage
          </span>
          <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Multi-sheet Excel Support
          </span>
          <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Zero Record Dropping
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
