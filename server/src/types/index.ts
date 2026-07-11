export interface ParsedCrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  sourceRowIndex: number;
  originalRecord: Record<string, unknown>;
  reason: string;
}

export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
}

export interface ImportResponse {
  parsedRecords: ParsedCrmRecord[];
  skippedRecords: SkippedRecord[];
  summary: ImportSummary;
}

export interface JobState {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  batchesTotal: number;
  batchesCompleted: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  result?: ImportResponse;
}
