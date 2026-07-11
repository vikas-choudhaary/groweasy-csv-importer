import { ColumnMapping, MappingConfig, SchemaField } from './types';

const ALIAS_DICTIONARY: Record<string, string> = {
  // name aliases
  full_name: 'name', customer_name: 'name', contact_name: 'name', first_name: 'name',

  // email aliases
  mail: 'email', email_id: 'email', email_address: 'email', contact_mail: 'email',

  // mobile aliases
  phone: 'mobile_without_country_code', phone_number: 'mobile_without_country_code', 
  mobile: 'mobile_without_country_code', mobile_number: 'mobile_without_country_code',
  whatsapp: 'mobile_without_country_code', whatsapp_no: 'mobile_without_country_code',

  // country code aliases
  dial_code: 'country_code', phone_code: 'country_code', calling_code: 'country_code',

  // company aliases
  organization: 'company', organisation: 'company', business_name: 'company', org: 'company',

  // owner aliases
  owner: 'lead_owner', assigned_to: 'lead_owner', sales_rep: 'lead_owner', sales_person: 'lead_owner', agent: 'lead_owner',

  // data source aliases
  source: 'data_source', lead_source: 'data_source', acquisition_source: 'data_source',

  // crm status aliases
  status: 'crm_status', stage: 'crm_status', lead_status: 'crm_status', lead_stage: 'crm_status',

  // created at aliases
  created: 'created_at', created_date: 'created_at', signup_date: 'created_at', created_on: 'created_at',

  // description aliases
  project: 'description', campaign: 'description',

  // note aliases
  remarks: 'crm_note', notes: 'crm_note'
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
}

export function generateInitialMappings(headers: string[], targetSchema: SchemaField[], existingConfig?: MappingConfig): ColumnMapping[] {
  const schemaMap = new Set(targetSchema.map(f => f.field));
  const mappings: ColumnMapping[] = [];

  for (const header of headers) {
    // If it's already in the config, preserve it
    if (existingConfig) {
      const existing = existingConfig.mappings.find(m => m.sourceColumn === header);
      if (existing) {
        mappings.push(existing);
        continue;
      }
    }

    const norm = normalizeHeader(header);

    // 1. Exact Match
    if (schemaMap.has(norm)) {
      mappings.push({
        sourceColumn: header,
        targetField: norm,
        confidence: 1.0,
        source: 'EXACT_MATCH',
        status: 'mapped',
        reason: 'Exact column name match',
        sampleValues: [],
        manualOverride: false
      });
      continue;
    }

    // 2. Alias Match
    if (ALIAS_DICTIONARY[norm] && schemaMap.has(ALIAS_DICTIONARY[norm])) {
      mappings.push({
        sourceColumn: header,
        targetField: ALIAS_DICTIONARY[norm],
        confidence: 0.95,
        source: 'ALIAS_MATCH',
        status: 'mapped',
        reason: `Matched known alias: '${norm}' -> '${ALIAS_DICTIONARY[norm]}'`,
        sampleValues: [],
        manualOverride: false
      });
      continue;
    }

    // 3. Heuristic / Partial Match
    let matched = false;
    for (const field of schemaMap) {
      if (norm.includes(field) || field.includes(norm)) {
        // Basic heuristic: substring overlap
        // Avoid aggressive false positives
        if (norm.length > 3 && field.length > 3) {
           mappings.push({
             sourceColumn: header,
             targetField: field,
             confidence: 0.7,
             source: 'HEURISTIC',
             status: 'mapped',
             reason: `Partial name match between '${norm}' and '${field}'`,
             sampleValues: [],
             manualOverride: false
           });
           matched = true;
           break;
        }
      }
    }

    if (matched) continue;

    // UNMAPPED
    mappings.push({
      sourceColumn: header,
      targetField: null,
      confidence: 0,
      source: 'UNMAPPED',
      status: 'unmapped',
      reason: 'No match found',
      sampleValues: [],
      manualOverride: false
    });
  }

  return deduplicateMappings(mappings);
}

/**
 * Resolves duplicate target field assignments in a mapping list.
 * For each target field (except crm_note) that has multiple source columns mapped to it:
 *  - Keep the mapping with the highest confidence.
 *  - Set all lower-confidence duplicates to unmapped/null.
 * Mutates nothing — returns a new array.
 */
export function deduplicateMappings(mappings: ColumnMapping[]): ColumnMapping[] {
  // Gather winner for each target field (highest confidence among mapped, non-ignored, non-crm_note)
  const winners = new Map<string, { idx: number; confidence: number }>();

  mappings.forEach((m, idx) => {
    if (!m.targetField || m.targetField === 'crm_note' || m.source === 'IGNORED') return;
    const existing = winners.get(m.targetField);
    if (!existing || m.confidence > existing.confidence) {
      winners.set(m.targetField, { idx, confidence: m.confidence });
    }
  });

  return mappings.map((m, idx) => {
    if (!m.targetField || m.targetField === 'crm_note' || m.source === 'IGNORED') return m;
    const winner = winners.get(m.targetField);
    if (winner && winner.idx !== idx) {
      // This mapping lost — clear it to unmapped
      return {
        ...m,
        targetField: null,
        status: 'unmapped' as const,
        source: 'UNMAPPED' as const,
        reason: `Duplicate target '${m.targetField}' resolved in favour of higher-confidence mapping`,
      };
    }
    return m;
  });
}

export function applyMappingToRow(row: Record<string, unknown>, config: MappingConfig): { record: Record<string, unknown>, unresolved: Record<string, unknown> } {
  const record: Record<string, unknown> = {};
  const unresolved: Record<string, unknown> = {};

  for (const m of config.mappings) {
    if (m.source === 'IGNORED') continue;

    const val = row[m.sourceColumn];
    if (m.status === 'mapped' && m.targetField) {
      if (m.targetField === 'crm_note') {
        if (val) {
          record.crm_note = typeof record.crm_note === 'string' ? record.crm_note + '; ' + String(val) : String(val);
        }
      } else {
        record[m.targetField] = val;
      }
    } else {
      unresolved[m.sourceColumn] = val;
    }
  }

  // Any keys not explicitly in mappings are unresolved
  for (const key of Object.keys(row)) {
    if (!config.mappings.find(m => m.sourceColumn === key)) {
      unresolved[key] = row[key];
    }
  }

  return { record, unresolved };
}
