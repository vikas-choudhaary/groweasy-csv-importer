export type RawCsvRow = Record<string, unknown>;

export interface ParsedCrmRecord {
  id?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: string;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
  [key: string]: unknown;
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

export type MappingSource = 
  | 'EXACT_MATCH'
  | 'ALIAS_MATCH'
  | 'HEURISTIC'
  | 'AI_SUGGESTION'
  | 'MANUAL'
  | 'PRESET'
  | 'UNMAPPED'
  | 'IGNORED';

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: number;
  source: MappingSource; // Kept for compatibility with preset logic
  status: 'mapped' | 'ignored' | 'unmapped' | 'conflict';
  reason: string;
  sampleValues: string[];
  manualOverride: boolean;
  suggestedTargetField?: string;
  suggestedReasoning?: string;
}

export interface MappingConfig {
  mappings: ColumnMapping[];
}

export interface SchemaField {
  field: string;
  type: string;
  required: boolean;
  description: string;
  enums: string[];
}
