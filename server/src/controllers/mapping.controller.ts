import { Request, Response } from 'express';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function isQuotaError(err: any): boolean {
  if (!err) return false;

  if (err.statusCode === 429) return true;
  if (err.code === 429) return true;
  if (err.status === 'RESOURCE_EXHAUSTED') return true;
  if (typeof err.message === 'string' && (err.message.includes('quota exceeded') || err.message.includes('RESOURCE_EXHAUSTED'))) return true;

  if (err.cause && isQuotaError(err.cause)) return true;
  if (err.lastError && isQuotaError(err.lastError)) return true;
  if (err.data?.error && isQuotaError(err.data.error)) return true;
  if (Array.isArray(err.errors)) {
    for (const e of err.errors) {
      if (isQuotaError(e)) return true;
    }
  }

  return false;
}

export const suggestMappings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unresolvedColumns, targetSchema, sampleRecords } = req.body;

    if (!unresolvedColumns || !targetSchema) {
      res.status(400).json({ success: false, error: 'unresolvedColumns and targetSchema are required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY && process.env.AI_MOCK_MODE !== 'true') {
      res.status(500).json({ success: false, error: 'GEMINI_API_KEY is not configured.' });
      return;
    }

    console.log(`[mapping] request received`);
    console.log(`[mapping] headers: [${unresolvedColumns.join(', ')}]`);
    console.log(`[mapping] mode: ${process.env.AI_MOCK_MODE === 'true' ? 'mock' : 'gemini'}`);

    if (process.env.AI_MOCK_MODE === 'true') {
      const suggestions = (unresolvedColumns as string[]).map(col => {
        const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        let targetField = '';
        let confidence = 0;
        let reasoning = 'No clear mapping found for this column';

        const aliasMap: Record<string, string> = {
          full_name: 'name', customer_name: 'name', contact_name: 'name', name: 'name',
          email: 'email', email_address: 'email', mail: 'email', customer_email: 'email',
          phone: 'mobile_without_country_code', phone_number: 'mobile_without_country_code', mobile: 'mobile_without_country_code', mobile_number: 'mobile_without_country_code', contact_number: 'mobile_without_country_code',
          dial_code: 'country_code', country_code: 'country_code', phone_code: 'country_code',
          organization: 'company', organisation: 'company', business: 'company', company_name: 'company',
          town: 'city', city_name: 'city', location_city: 'city', city: 'city',
          province: 'state', region: 'state', state_name: 'state', state: 'state',
          nation: 'country', country_name: 'country', country: 'country',
          owner: 'lead_owner', sales_owner: 'lead_owner', assigned_to: 'lead_owner', lead_owner: 'lead_owner',
          status: 'crm_status', lead_status: 'crm_status', pipeline_status: 'crm_status', crm_status: 'crm_status',
          source: 'data_source', lead_source: 'data_source', channel: 'data_source', data_source: 'data_source',
          created: 'created_at', created_date: 'created_at', creation_date: 'created_at', timestamp: 'created_at', created_at: 'created_at'
        };

        if (aliasMap[norm]) {
          targetField = aliasMap[norm];
          confidence = norm === targetField ? 0.98 : 0.90;
          reasoning = `Mock AI recognized alias mapping from '${col}' to '${targetField}'`;
        } else if (norm.includes('name') || norm.includes('user')) {
          targetField = 'name';
          confidence = 0.75;
          reasoning = `Mock AI heuristic matched substring 'name' or 'user' to 'name'`;
        } else if (['id', 'age', 'random_notes', 'garbage_column'].includes(norm)) {
          // Leave targetField blank to indicate it shouldn't be mapped
          confidence = 0;
          reasoning = `Mock AI determined '${col}' is irrelevant to CRM schema`;
        }

        return {
          sourceColumn: col,
          targetField,
          confidence,
          reasoning,
          status: targetField ? 'mapped' : 'ignored',
          source: targetField ? 'ALIAS_MATCH' : 'IGNORED',
          manualOverride: false,
          sampleValues: []
        };
      }).filter(sug => sug.targetField !== ''); // Rule 3: Do not map if it doesn't belong

      console.log(`[mapping] generated mappings: ${JSON.stringify(suggestions)}`);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`[mapping] response sent`);
      res.status(200).json({ success: true, data: suggestions });
      return;
    }

    const prompt = `
You are an expert data mapping assistant. The user is mapping a CSV file to a CRM schema.
Some columns could not be mapped deterministically.
Your task is to suggest mappings for the UNRESOLVED columns into the TARGET SCHEMA fields.

UNRESOLVED COLUMNS:
${unresolvedColumns.join(', ')}

TARGET SCHEMA:
${JSON.stringify(targetSchema, null, 2)}

SAMPLE DATA ROWS:
${JSON.stringify(sampleRecords, null, 2)}

Rules:
1. Only suggest mappings for the provided unresolved columns.
2. Only use valid target schema fields.
3. If a column clearly does not belong to any target schema field, DO NOT map it (omit it from results, or map it to nothing if impossible).
4. Provide a confidence score between 0.0 and 1.0.
5. Provide a brief 1-sentence reasoning for your suggestion.
`;

    const suggestionSchema = z.object({
      suggestions: z.array(z.object({
        sourceColumn: z.string(),
        targetField: z.string(),
        confidence: z.number().min(0).max(1),
        reasoning: z.string()
      }))
    });

    console.log(`[DIAGNOSIS] API Key Prefix: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 10) : 'undefined'}`);
    const exactModelId = 'gemini-3.5-flash';
    console.log(`[DIAGNOSIS] Model Identifier being used: ${exactModelId}`);

    let object;
    try {
      const result = await generateObject({
        model: google(exactModelId),
        schema: suggestionSchema,
        prompt: prompt,
        temperature: 0.1,
      });
      object = result.object;
    } catch (error: any) {
      if (isQuotaError(error)) {
        res.status(429).json({
          error: 'Gemini API quota exceeded. Please wait about a minute and try again.'
        });
        return;
      }
      throw error;
    }

    const formattedSuggestions = object.suggestions.map(sug => ({
      sourceColumn: sug.sourceColumn,
      targetField: sug.targetField,
      confidence: sug.confidence,
      reasoning: sug.reasoning,
      status: sug.targetField ? 'mapped' : 'ignored',
      source: 'AI_SUGGESTION',
      manualOverride: false,
      sampleValues: []
    }));

    console.log(`[mapping] generated mappings: ${JSON.stringify(formattedSuggestions)}`);
    console.log(`[mapping] response sent`);
    res.status(200).json({ success: true, data: formattedSuggestions });
  } catch (error: unknown) {
    console.error('[Backend] Suggestion error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate suggestions' });
  }
};

export const validateMapping = (req: Request, res: Response): void => {
  // Simple validation: check if required fields are mapped (though right now none are strictly required)
  // Check for duplicates
  const { mappings } = req.body;
  if (!mappings || !Array.isArray(mappings)) {
    res.status(400).json({ success: false, error: 'mappings array is required' });
    return;
  }

  const errors: string[] = [];
  const targetCounts: Record<string, number> = {};

  for (const m of mappings) {
    if (m.targetField) {
      if (m.targetField !== 'crm_note') { // crm_note can have multiple mappings merged if we wanted to, but generally we avoid duplicates
        targetCounts[m.targetField] = (targetCounts[m.targetField] || 0) + 1;
      }
    }
  }

  for (const [field, count] of Object.entries(targetCounts)) {
    if (count > 1) {
      errors.push(`Target field '${field}' is mapped to multiple source columns.`);
    }
  }

  res.status(200).json({ success: true, valid: errors.length === 0, errors });
};

// Dead preset handlers removed (routes no longer exposed in privacy-safe public demo):
// - getPresets
// - createPreset
// - updatePreset
// - deletePreset
// - suggestPresets
// - usePreset
// - getPresetById
