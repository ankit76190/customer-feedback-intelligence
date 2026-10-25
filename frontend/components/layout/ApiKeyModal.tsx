'use client';

import React, { useState } from 'react';
import { Key, CheckCircle, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
  currentModel: string;
  onKeyUpdated: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  isConfigured,
  currentModel,
  onKeyUpdated,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(currentModel || 'gemini-2.5-flash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter a valid Gemini API key');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.configureApiKey(apiKey.trim(), model);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onKeyUpdated();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update API key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Google Gemini API Setup</h2>
            <p className="text-xs text-slate-400">Configure your official GenAI SDK credentials</p>
          </div>
        </div>

        {isConfigured ? (
          <div className="mb-5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200">API Key Active</p>
              <p className="text-emerald-400/90 text-[11px] mt-0.5">
                Using model <span className="font-mono text-white">{currentModel}</span>. You can update or replace the key below.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">API Key Required for Live AI Analysis</p>
              <p className="text-amber-400/90 text-[11px] mt-0.5">
                To run real sentiment classification, thematic extraction, and pain-point identification, enter your Google AI Studio API key.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Need a key? Get one for free at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Gemini Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended: Ultra fast & structured)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Deep reasoning)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy fallback)</option>
            </select>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Credentials saved successfully!
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Connecting...' : 'Save & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
