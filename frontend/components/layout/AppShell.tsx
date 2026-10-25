'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ApiKeyModal } from './ApiKeyModal';
import { api } from '../../lib/api';
import { SystemStatus } from '../../lib/types';

interface AppContextType {
  currentDatasetId: string;
  setCurrentDatasetId: (id: string) => void;
  status: SystemStatus | null;
  refreshStatus: () => Promise<void>;
  openApiKeyModal: () => void;
}

const AppContext = createContext<AppContextType>({
  currentDatasetId: 'sample-saas',
  setCurrentDatasetId: () => {},
  status: null,
  refreshStatus: async () => {},
  openApiKeyModal: () => {},
});

export const useApp = () => useContext(AppContext);

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDatasetId, setCurrentDatasetId] = useState<string>('sample-saas');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
      if (data.active_datasets && data.active_datasets.length > 0) {
        // If current dataset doesn't exist, select the first
        const exists = data.active_datasets.some((d) => d.dataset_id === currentDatasetId);
        if (!exists) {
          setCurrentDatasetId(data.active_datasets[0].dataset_id);
        }
      }
    } catch (e) {
      console.warn('Could not fetch backend system status. Backend may still be spinning up.');
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleReloadSample = async () => {
    try {
      await api.loadSampleData();
      await fetchStatus();
      setCurrentDatasetId('sample-saas');
    } catch (e) {
      console.error('Failed to reload sample dataset:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentDatasetId,
        setCurrentDatasetId,
        status,
        refreshStatus: fetchStatus,
        openApiKeyModal: () => setIsApiKeyModalOpen(true),
      }}
    >
      <div className="flex h-screen bg-[#0B0F17] text-slate-100 overflow-hidden font-sans">
        {/* Sidebar */}
        <Sidebar
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          apiKeyConfigured={status?.api_key_configured ?? false}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            currentDatasetId={currentDatasetId}
            onDatasetChange={setCurrentDatasetId}
            status={status}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onReloadSample={handleReloadSample}
          />

          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0B0F17]">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>

        {/* Global Key Config Modal */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          isConfigured={status?.api_key_configured ?? false}
          currentModel={status?.gemini_model || 'gemini-2.5-flash'}
          onKeyUpdated={fetchStatus}
        />
      </div>
    </AppContext.Provider>
  );
};
