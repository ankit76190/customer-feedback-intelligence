'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  UploadCloud, 
  ListFilter, 
  FileSpreadsheet, 
  Key, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  onOpenApiKeyModal: () => void;
  apiKeyConfigured: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenApiKeyModal, apiKeyConfigured }) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Executive Dashboard', href: '/', icon: BarChart3 },
    { name: 'AI Insights & Reports', href: '/insights', icon: FileSpreadsheet },
    { name: 'Upload & Normalizer', href: '/upload', icon: UploadCloud },
    { name: 'Feedback Explorer', href: '/records', icon: ListFilter },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">
              FeedbackAI
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Customer Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            Analytics Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer System Controls */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <button
          onClick={onOpenApiKeyModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Gemini API Key</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${apiKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
        </button>

        <div className="px-3 pt-2 text-[11px] text-slate-300 flex items-center justify-between">
          <span>Engine: Gemini 2.5</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 font-mono">v1.0</span>
        </div>
      </div>
    </aside>
  );
};
