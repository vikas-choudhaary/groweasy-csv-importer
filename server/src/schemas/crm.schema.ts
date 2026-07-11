import { z } from 'zod';

export const crmStatusEnum = z.enum([
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
  ''
]);

export const dataSourceEnum = z.enum([
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
  ''
]);

export const aiCrmRecordSchema = z.object({
  created_at: z.string().describe('Valid parsable date string or empty string ""'),
  name: z.string().describe('Full name of the lead or ""'),
  email: z.string().describe('Primary email address or ""'),
  country_code: z.string().describe('Numeric country code (e.g. "91") or ""'),
  mobile_without_country_code: z.string().describe('Mobile number without country code or ""'),
  company: z.string().describe('Company name or ""'),
  city: z.string().describe('City name or ""'),
  state: z.string().describe('State name or ""'),
  country: z.string().describe('Country name or ""'),
  lead_owner: z.string().describe('Name of the lead owner or ""'),
  crm_status: z.string().describe('EXACTLY one of: "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE". If no match, use ""'),
  crm_note: z.string().describe('Miscellaneous notes, secondary emails, or secondary phones or ""'),
  data_source: z.string().describe('EXACTLY one of: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots". If no match, use ""'),
  possession_time: z.string().describe('Possession time or ""'),
  description: z.string().describe('Description or ""'),
});

const coerceString = z.any().optional().transform(v => (v === undefined || v === null) ? '' : String(v).trim());

export const serverSideCrmRecordSchema = z.object({
  created_at: coerceString,
  name: coerceString,
  email: coerceString,
  country_code: coerceString,
  mobile_without_country_code: coerceString,
  company: coerceString,
  city: coerceString,
  state: coerceString,
  country: coerceString,
  lead_owner: coerceString,
  crm_status: z.union([crmStatusEnum, z.string()]).optional().default('').transform(val => {
    const valid = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
    return valid.includes(val) ? val : '';
  }),
  crm_note: coerceString,
  data_source: z.union([dataSourceEnum, z.string(), z.any()]).optional().default('').transform(val => {
    const valid = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];
    return valid.includes(val as string) ? val : '';
  }),
  possession_time: coerceString,
  description: coerceString,
});

export const aiExtractionResponseSchema = z.object({
  records: z.array(aiCrmRecordSchema),
});

