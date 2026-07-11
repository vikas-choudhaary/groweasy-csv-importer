import { Request, Response } from 'express';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import db from '../utils/db';
import crypto from 'crypto';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: suggestionSchema,
      prompt: prompt,
      temperature: 0.1,
    });

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

// Preset CRUD

export const getPresets = (req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM mappings ORDER BY timestamp DESC').all();
    const presets = rows.map((row: unknown) => {
      const r = row as { id: string, name: string, description: string, sourceHeaders: string, usageCount: number, mappingJson: string, timestamp: string, updatedAt: string, lastUsedAt: string };
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        sourceHeaders: r.sourceHeaders,
        usageCount: r.usageCount,
        mappingJson: JSON.parse(r.mappingJson),
        timestamp: r.timestamp,
        updatedAt: r.updatedAt,
        lastUsedAt: r.lastUsedAt
      };
    });
    res.status(200).json({ success: true, data: presets });
  } catch (error) {
    console.error('[Backend] Get presets error:', error);
    res.status(500).json({ success: false, error: 'Failed to get presets' });
  }
};

export const createPreset = (req: Request, res: Response): void => {
  try {
    const { name, description, sourceHeaders, ignoredColumns, confidenceThreshold, mappingJson } = req.body;
    if (!name || !mappingJson) {
      res.status(400).json({ success: false, error: 'name and mappingJson are required' });
      return;
    }
    
    const id = crypto.randomUUID();
    const strJson = typeof mappingJson === 'string' ? mappingJson : JSON.stringify(mappingJson);
    const desc = description || '';
    const srcHeadersStr = sourceHeaders ? JSON.stringify(sourceHeaders) : '[]';
    const normHeadersStr = sourceHeaders ? JSON.stringify(sourceHeaders.map((h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))) : '[]';
    const ignoredStr = ignoredColumns ? JSON.stringify(ignoredColumns) : '[]';
    const conf = confidenceThreshold || 0;

    db.prepare(`
      INSERT INTO mappings (
        id, name, mappingJson, description, sourceHeaders, normalizedSourceHeaders, 
        ignoredColumns, confidenceThreshold, usageCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, name, strJson, desc, srcHeadersStr, normHeadersStr, ignoredStr, conf);

    res.status(201).json({ success: true, data: { id, name, mappingJson: JSON.parse(strJson) } });
  } catch (error) {
    console.error('[Backend] Create preset error:', error);
    res.status(500).json({ success: false, error: 'Failed to create preset' });
  }
};

export const updatePreset = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, description, mappingJson } = req.body;
    if (!name && !mappingJson && description === undefined) {
      res.status(400).json({ success: false, error: 'name, description or mappingJson are required to update' });
      return;
    }

    const current = db.prepare('SELECT * FROM mappings WHERE id = ?').get(id) as { name: string, description: string, mappingJson: string } | undefined;
    if (!current) {
      res.status(404).json({ success: false, error: 'Preset not found' });
      return;
    }

    const newName = name || current.name;
    const newDesc = description !== undefined ? description : current.description;
    const newJson = mappingJson ? (typeof mappingJson === 'string' ? mappingJson : JSON.stringify(mappingJson)) : current.mappingJson;

    db.prepare('UPDATE mappings SET name = ?, description = ?, mappingJson = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newName, newDesc, newJson, id);

    res.status(200).json({ success: true, data: { id, name: newName, description: newDesc, mappingJson: JSON.parse(newJson) } });
  } catch (error) {
    console.error('[Backend] Update preset error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preset' });
  }
};

export const deletePreset = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM mappings WHERE id = ?').run(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Backend] Delete preset error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete preset' });
  }
};

export const suggestPresets = (req: Request, res: Response): void => {
  try {
    const { headers } = req.query;
    if (!headers || typeof headers !== 'string') {
      res.status(400).json({ success: false, error: 'headers query parameter is required' });
      return;
    }

    const inputHeaders = headers.split(',').map(h => h.trim().toLowerCase());
    
    const rows = db.prepare('SELECT * FROM mappings').all();
    const suggestions = rows.map((row: unknown) => {
      const r = row as { id: string, name: string, mappingJson: string, timestamp: string, sourceHeaders?: string, confidenceThreshold?: number };
      const mappingJson = JSON.parse(r.mappingJson);
      
      let presetHeaders: string[] = [];
      if (r.sourceHeaders) {
        try {
          presetHeaders = JSON.parse(r.sourceHeaders).map((h: string) => h.trim().toLowerCase());
        } catch { /* ignore */ }
      }
      if (presetHeaders.length === 0) {
        presetHeaders = (mappingJson.mappings || []).map((m: { sourceColumn: string }) => m.sourceColumn.trim().toLowerCase());
      }
      
      const intersection = inputHeaders.filter(h => presetHeaders.includes(h));
      // Score based on exact matched headers / total headers
      const exactMatchCount = intersection.length;
      const expectedCount = presetHeaders.length || 1;
      const matchPercentage = exactMatchCount / expectedCount;

      return {
        id: r.id,
        name: r.name,
        mappingJson,
        timestamp: r.timestamp,
        confidenceThreshold: r.confidenceThreshold || 0.8,
        score: exactMatchCount,
        matchPercentage,
        matchedColumns: intersection,
        missingColumns: presetHeaders.filter(h => !inputHeaders.includes(h)),
        extraColumns: inputHeaders.filter(h => !presetHeaders.includes(h))
      };
    }).filter(p => p.matchPercentage >= 0.5) // Minimum 50% compatibility
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 3);

    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error('[Backend] Suggest presets error:', error);
    res.status(500).json({ success: false, error: 'Failed to suggest presets' });
  }
};

export const usePreset = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const current = db.prepare('SELECT usageCount FROM mappings WHERE id = ?').get(id) as { usageCount: number } | undefined;
    if (!current) {
      res.status(404).json({ success: false, error: 'Preset not found' });
      return;
    }

    db.prepare('UPDATE mappings SET usageCount = usageCount + 1, lastUsedAt = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Backend] Use preset error:', error);
    res.status(500).json({ success: false, error: 'Failed to use preset' });
  }
};

export const getPresetById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM mappings WHERE id = ?').get(id) as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'Preset not found' });
      return;
    }
    
    res.status(200).json({ 
      success: true, 
      data: {
        ...row,
        mappingJson: JSON.parse(row.mappingJson),
        sourceHeaders: row.sourceHeaders ? JSON.parse(row.sourceHeaders) : [],
        ignoredColumns: row.ignoredColumns ? JSON.parse(row.ignoredColumns) : []
      } 
    });
  } catch (error) {
    console.error('[Backend] Get preset error:', error);
    res.status(500).json({ success: false, error: 'Failed to get preset' });
  }
};
