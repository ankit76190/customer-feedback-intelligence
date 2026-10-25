import { 
  ExecutiveInsights, 
  FeedbackRecord, 
  ColumnMapping, 
  UploadPreviewResponse, 
  RawPreviewResponse,
  NormalizationResult, 
  DatasetSummaryResponse,
  AnalysisJobResponse,
  PaginatedRecordsResponse, 
  SystemStatus,
  AiExecutiveReport
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      Accept: 'application/json',
      ...options.headers,
    };

    try {
      const res = await fetch(url, { ...options, headers });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.detail || json.message || `API error (${res.status})`);
      }
      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      console.error(`Request failed for ${endpoint}:`, err);
      throw err;
    }
  }

  // System & Health
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('/api/system/status');
  }

  async configureApiKey(apiKey: string, model: string = 'gemini-2.5-flash'): Promise<any> {
    return this.request('/api/system/configure-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, model }),
    });
  }

  async loadSampleData(): Promise<{ dataset_id: string; total_records: number }> {
    return this.request('/api/system/load-sample', {
      method: 'POST',
    });
  }

  // Dataset Management (Upload & Preprocessing)
  async uploadFile(file: File, sheetName?: string): Promise<UploadPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) {
      formData.append('sheet_name', sheetName);
    }

    const res = await fetch(`${API_BASE_URL}/api/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || 'File upload failed');
    }
    return json.data;
  }

  async getDatasetPreview(
    datasetId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    sheetName?: string
  ): Promise<RawPreviewResponse> {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    query.set('limit', limit.toString());
    if (search) query.set('search', search);
    if (sheetName) query.set('sheet_name', sheetName);

    return this.request<RawPreviewResponse>(`/api/datasets/${encodeURIComponent(datasetId)}/preview?${query.toString()}`);
  }

  async getDatasetSummary(datasetId: string): Promise<DatasetSummaryResponse> {
    return this.request<DatasetSummaryResponse>(`/api/datasets/${encodeURIComponent(datasetId)}/summary`);
  }

  async normalizeDataset(datasetId: string, mapping: ColumnMapping): Promise<NormalizationResult> {
    return this.request<NormalizationResult>(`/api/datasets/${encodeURIComponent(datasetId)}/normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping }),
    });
  }

  getSampleCsvUrl(): string {
    return `${API_BASE_URL}/api/datasets/sample-csv`;
  }

  // Phase 3: Gemini Background Analysis Pipeline
  async startAnalysis(params: {
    datasetId: string;
    batchSize?: number;
    limit?: number;
    onlyFailed?: boolean;
  }): Promise<AnalysisJobResponse> {
    return this.request<AnalysisJobResponse>('/api/analysis/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: params.datasetId,
        batch_size: params.batchSize || 5,
        limit: params.limit,
        only_failed: params.onlyFailed || false,
      }),
    });
  }

  async getAnalysisStatus(jobId: string): Promise<AnalysisJobResponse> {
    return this.request<AnalysisJobResponse>(`/api/analysis/status/${encodeURIComponent(jobId)}`);
  }

  async retryFailedAnalysis(jobId: string): Promise<AnalysisJobResponse> {
    return this.request<AnalysisJobResponse>(`/api/analysis/retry-failed/${encodeURIComponent(jobId)}`, {
      method: 'POST',
    });
  }

  async getAnalysisResults(datasetId: string): Promise<{
    dataset_id: string;
    total_records: number;
    analyzed_records: number;
    failed_records: number;
    records: FeedbackRecord[];
  }> {
    return this.request(`/api/analysis/results/${encodeURIComponent(datasetId)}`);
  }

  // Analytics & Dashboard
  async getAnalytics(params: {
    datasetId: string;
    startDate?: string;
    endDate?: string;
    sentiment?: string;
    theme?: string;
    product?: string;
    category?: string;
    search?: string;
  } | string): Promise<ExecutiveInsights> {
    const datasetId = typeof params === 'string' ? params : params.datasetId;
    const query = new URLSearchParams();
    query.set('dataset_id', datasetId);

    if (typeof params !== 'string') {
      if (params.startDate) query.set('start_date', params.startDate);
      if (params.endDate) query.set('end_date', params.endDate);
      if (params.sentiment && params.sentiment !== 'all') query.set('sentiment', params.sentiment);
      if (params.theme && params.theme !== 'all') query.set('theme', params.theme);
      if (params.product && params.product !== 'all') query.set('product', params.product);
      if (params.category && params.category !== 'all') query.set('category', params.category);
      if (params.search) query.set('search', params.search);
    }

    return this.request<ExecutiveInsights>(`/api/feedback/analytics?${query.toString()}`);
  }

  // Records Table & Explorer
  async getRecords(params: {
    datasetId: string;
    page?: number;
    limit?: number;
    search?: string;
    sentiment?: string;
    theme?: string;
    startDate?: string;
    endDate?: string;
    product?: string;
    category?: string;
  }): Promise<PaginatedRecordsResponse> {
    const query = new URLSearchParams();
    query.set('dataset_id', params.datasetId);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.sentiment && params.sentiment !== 'all') query.set('sentiment', params.sentiment);
    if (params.theme && params.theme !== 'all') query.set('theme', params.theme);
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.product && params.product !== 'all') query.set('product', params.product);
    if (params.category && params.category !== 'all') query.set('category', params.category);

    return this.request<PaginatedRecordsResponse>(`/api/feedback/records?${query.toString()}`);
  }

  // AI Insights Report
  async getAiInsights(params: {
    datasetId: string;
    startDate?: string;
    endDate?: string;
    sentiment?: string;
    theme?: string;
    product?: string;
    category?: string;
    search?: string;
  } | string): Promise<AiExecutiveReport> {
    const datasetId = typeof params === 'string' ? params : params.datasetId;
    const query = new URLSearchParams();
    query.set('dataset_id', datasetId);

    if (typeof params !== 'string') {
      if (params.startDate) query.set('start_date', params.startDate);
      if (params.endDate) query.set('end_date', params.endDate);
      if (params.sentiment && params.sentiment !== 'all') query.set('sentiment', params.sentiment);
      if (params.theme && params.theme !== 'all') query.set('theme', params.theme);
      if (params.product && params.product !== 'all') query.set('product', params.product);
      if (params.category && params.category !== 'all') query.set('category', params.category);
      if (params.search) query.set('search', params.search);
    }

    return this.request<AiExecutiveReport>(`/api/feedback/insights?${query.toString()}`);
  }

  getExcelExportUrl(params: { datasetId: string; [key: string]: any } | string): string {
    const datasetId = typeof params === 'string' ? params : params.datasetId;
    const query = new URLSearchParams();
    query.set('dataset_id', datasetId);

    if (typeof params !== 'string') {
      Object.entries(params).forEach(([k, v]) => {
        if (k !== 'datasetId' && v && v !== 'all') {
          query.set(k.replace(/([A-Z])/g, '_$1').toLowerCase(), v);
        }
      });
    }

    return `${API_BASE_URL}/api/feedback/export/excel?${query.toString()}`;
  }

  getCsvExportUrl(params: { datasetId: string; [key: string]: any } | string): string {
    const datasetId = typeof params === 'string' ? params : params.datasetId;
    const query = new URLSearchParams();
    query.set('dataset_id', datasetId);

    if (typeof params !== 'string') {
      Object.entries(params).forEach(([k, v]) => {
        if (k !== 'datasetId' && v && v !== 'all') {
          query.set(k.replace(/([A-Z])/g, '_$1').toLowerCase(), v);
        }
      });
    }

    return `${API_BASE_URL}/api/feedback/export/csv?${query.toString()}`;
  }
}

export const api = new ApiClient();

