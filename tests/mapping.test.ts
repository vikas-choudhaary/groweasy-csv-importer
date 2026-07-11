import { describe, test } from 'node:test';
import assert from 'node:assert';
import { generateInitialMappings, applyMappingToRow, deduplicateMappings } from '../src/lib/mapping-engine';
import { SchemaField, ColumnMapping } from '../src/lib/types';

const mockSchema: SchemaField[] = [
  { field: 'name', type: 'string', required: false, description: '', enums: [] },
  { field: 'email', type: 'string', required: false, description: '', enums: [] },
  { field: 'mobile_without_country_code', type: 'string', required: false, description: '', enums: [] },
  { field: 'company', type: 'string', required: false, description: '', enums: [] },
  { field: 'crm_note', type: 'string', required: false, description: '', enums: [] }
];

describe('Mapping Engine', () => {
  test('Exact matches map correctly', () => {
    const headers = ['name', 'email'];
    const mappings = generateInitialMappings(headers, mockSchema);
    
    assert.strictEqual(mappings.find(m => m.sourceColumn === 'name')?.targetField, 'name');
    assert.strictEqual(mappings.find(m => m.sourceColumn === 'name')?.source, 'EXACT_MATCH');
  });

  test('Aliases map correctly', () => {
    const headers = ['full_name', 'phone_number', 'organization'];
    const mappings = generateInitialMappings(headers, mockSchema);
    
    assert.strictEqual(mappings.find(m => m.sourceColumn === 'full_name')?.targetField, 'name');
    assert.strictEqual(mappings.find(m => m.sourceColumn === 'phone_number')?.targetField, 'mobile_without_country_code');
    assert.strictEqual(mappings.find(m => m.sourceColumn === 'organization')?.targetField, 'company');
  });

  test('Heuristic partial matches map correctly', () => {
    // Requires a field length > 3 and substring overlap
    // "email" -> "customer_email_address"
    const headers = ['customer_email_address'];
    const mappings = generateInitialMappings(headers, mockSchema);
    
    assert.strictEqual(mappings.find(m => m.sourceColumn === 'customer_email_address')?.targetField, 'email');
    assert.strictEqual(mappings.find(m => m.sourceColumn === 'customer_email_address')?.source, 'HEURISTIC');
  });

  test('applyMappingToRow applies deterministic overrides and filters ignored', () => {
    const row = {
      'First Name': 'John',
      'Age': 30,
      'Junk': 'Delete me',
      'Notes': 'Important note'
    };
    
    const config = {
      mappings: [
        { sourceColumn: 'First Name', targetField: 'name', source: 'MANUAL', status: 'mapped', confidence: 1 },
        { sourceColumn: 'Junk', source: 'IGNORED', status: 'ignored', confidence: 1 },
        { sourceColumn: 'Notes', targetField: 'crm_note', source: 'MANUAL', status: 'mapped', confidence: 1 },
        { sourceColumn: 'Age', source: 'UNMAPPED', status: 'unmapped', confidence: 0 }
      ]
    };
    
    // @ts-expect-error Testing with partial config
    const { record, unresolved } = applyMappingToRow(row, config);
    
    assert.strictEqual(record.name, 'John');
    assert.strictEqual(record.crm_note, 'Important note');
    
    // Ignored columns should not be in unresolved
    assert.strictEqual(unresolved['Junk'], undefined);
    
    // Unmapped should be in unresolved
    assert.strictEqual(unresolved['Age'], 30);
    
    // Mapped columns should not be in unresolved! Wait, applyMappingToRow puts mapped in record, UNMAPPED in unresolved.
    assert.strictEqual(unresolved['First Name'], undefined);
  });

  test('Bugfix 5A.4: Mock AI mode completely resolves id, name, email, phone, city, age', async () => {
    const headers = ['id', 'name', 'email', 'phone', 'city', 'age'];
    const row = {
      'id': 123,
      'name': 'Test User',
      'email': 'test@example.com',
      'phone': '1234567890',
      'city': 'New York',
      'age': 30
    };

    const targetSchema: SchemaField[] = [
      { field: 'name', type: 'string', required: false, description: '', enums: [] },
      { field: 'email', type: 'string', required: false, description: '', enums: [] },
      { field: 'mobile_without_country_code', type: 'string', required: false, description: '', enums: [] },
      { field: 'city', type: 'string', required: false, description: '', enums: [] }
    ];

    const initialMappings = generateInitialMappings(headers, targetSchema);
    
    // Simulate frontend applying the mock AI response directly to initialMappings
    const simulatedMockApiResponse = [
      { sourceColumn: 'id', targetField: '', confidence: 0, reasoning: 'Mock AI', status: 'ignored', source: 'IGNORED' },
      { sourceColumn: 'age', targetField: '', confidence: 0, reasoning: 'Mock AI', status: 'ignored', source: 'IGNORED' }
    ];

    const finalMappings = initialMappings.map(m => {
      const mockOverride = simulatedMockApiResponse.find(s => s.sourceColumn === m.sourceColumn);
      if (mockOverride && m.status === 'unmapped') {
        return {
          ...m,
          targetField: mockOverride.targetField || null,
          confidence: mockOverride.confidence,
          status: mockOverride.status,
          source: mockOverride.source
        };
      }
      return m;
    });

    const mapped = finalMappings.filter(m => m.status === 'mapped').length;
    const ignored = finalMappings.filter(m => m.status === 'ignored').length;
    const unmapped = finalMappings.filter(m => m.status === 'unmapped').length;

    assert.strictEqual(mapped, 4, 'Should have 4 mapped fields');
    assert.strictEqual(ignored, 2, 'Should have 2 ignored fields');
    assert.strictEqual(unmapped, 0, 'Should have 0 unmapped fields');

    // Test contact viability
    const mappedTargets = new Set(finalMappings.filter(m => m.targetField).map(m => m.targetField));
    const hasContact = mappedTargets.has('email') || mappedTargets.has('mobile_without_country_code');
    assert.strictEqual(hasContact, true, 'Contact viability should pass');

    // Test Live Transformation Preview (applyMappingToRow)
    // @ts-expect-error partial config
    const { record } = applyMappingToRow(row, { mappings: finalMappings });

    // Assert transformed preview contains
    assert.ok(record['name'] !== undefined, 'Should contain name');
    assert.ok(record['email'] !== undefined, 'Should contain email');
    assert.ok(record['mobile_without_country_code'] !== undefined, 'Should contain phone');
    assert.ok(record['city'] !== undefined, 'Should contain city');

    // Assert transformed preview does NOT contain
    assert.strictEqual(record['id'], undefined, 'Should NOT contain id');
    assert.strictEqual(record['phone'], undefined, 'Should NOT contain raw phone key');
    assert.strictEqual(record['age'], undefined, 'Should NOT contain age');
  });
});

describe('Duplicate target mapping — deduplicateMappings', () => {
  const makeMapping = (src: string, target: string | null, confidence: number, source: ColumnMapping['source'] = 'AI_SUGGESTION'): ColumnMapping => ({
    sourceColumn: src,
    targetField: target,
    confidence,
    source,
    status: target ? 'mapped' : 'unmapped',
    reason: '',
    sampleValues: [],
    manualOverride: false,
  });

  test('no duplicates — returns mappings unchanged', () => {
    const mappings = [
      makeMapping('Full Name', 'name', 0.9),
      makeMapping('Email', 'email', 0.95),
    ];
    const result = deduplicateMappings(mappings);
    assert.strictEqual(result.find(m => m.sourceColumn === 'Full Name')?.targetField, 'name');
    assert.strictEqual(result.find(m => m.sourceColumn === 'Email')?.targetField, 'email');
  });

  test('highest-confidence mapping wins when AI produces duplicates', () => {
    const mappings = [
      makeMapping('Customer Full Name', 'name', 0.75),  // lower confidence
      makeMapping('Campaign Name', 'name', 0.90),       // higher confidence — wins
    ];
    const result = deduplicateMappings(mappings);

    const winner = result.find(m => m.targetField === 'name');
    assert.ok(winner, 'Exactly one mapping should remain for "name"');
    assert.strictEqual(winner?.sourceColumn, 'Campaign Name', 'Higher-confidence mapping should win');

    const loser = result.find(m => m.sourceColumn === 'Customer Full Name');
    assert.strictEqual(loser?.targetField, null, 'Lower-confidence mapping should be unmapped');
    assert.strictEqual(loser?.status, 'unmapped');
  });

  test('first mapping wins when confidence is equal', () => {
    // Equal confidence: earlier index wins (stable)
    const mappings = [
      makeMapping('Col A', 'email', 0.8),
      makeMapping('Col B', 'email', 0.8),
    ];
    const result = deduplicateMappings(mappings);
    assert.strictEqual(result.find(m => m.targetField === 'email')?.sourceColumn, 'Col A');
    assert.strictEqual(result.find(m => m.sourceColumn === 'Col B')?.targetField, null);
  });

  test('crm_note is exempt — multiple sources allowed', () => {
    const mappings = [
      makeMapping('Remarks', 'crm_note', 0.9),
      makeMapping('Notes', 'crm_note', 0.85),
    ];
    const result = deduplicateMappings(mappings);
    assert.strictEqual(result.filter(m => m.targetField === 'crm_note').length, 2, 'Both crm_note mappings should survive');
  });

  test('IGNORED mappings are exempt from dedup', () => {
    const mappings = [
      makeMapping('Junk', 'name', 0, 'IGNORED'),
      makeMapping('Real Name', 'name', 0.95),
    ];
    const result = deduplicateMappings(mappings);
    // The IGNORED one should stay IGNORED, the real one should stay mapped
    assert.strictEqual(result.find(m => m.sourceColumn === 'Junk')?.source, 'IGNORED');
    assert.strictEqual(result.find(m => m.sourceColumn === 'Real Name')?.targetField, 'name');
  });

  test('generateInitialMappings deduplicates heuristic collisions automatically', () => {
    // "Customer Full Name" and "Contact Full Name" both heuristically match 'name'
    const headers = ['Customer Full Name', 'Contact Full Name', 'email'];
    const schema: SchemaField[] = [
      { field: 'name', type: 'string', required: false, description: '', enums: [] },
      { field: 'email', type: 'string', required: false, description: '', enums: [] },
    ];
    const mappings = generateInitialMappings(headers, schema);

    const nameMappings = mappings.filter(m => m.targetField === 'name');
    assert.strictEqual(nameMappings.length, 1, 'Exactly one mapping should target "name" after dedup');

    const emailMapping = mappings.find(m => m.sourceColumn === 'email');
    assert.strictEqual(emailMapping?.targetField, 'email', 'email should still be mapped');
  });
});

describe('Duplicate target mapping — manual reassignment', () => {
  test('handleManualMap semantics: mapping function unmaps the previous holder', () => {
    // Simulate what handleManualMap does in the component
    const applyManualMap = (mappings: ColumnMapping[], sourceColumn: string, targetField: string | undefined): ColumnMapping[] => {
      return mappings.map(m => {
        if (m.sourceColumn === sourceColumn) {
          if (!targetField) {
            return { ...m, targetField: null, source: 'UNMAPPED' as const, status: 'unmapped' as const, confidence: 0, reason: 'Manually cleared', manualOverride: true };
          }
          return { ...m, targetField, source: 'MANUAL' as const, status: 'mapped' as const, confidence: 1.0, reason: 'Manually mapped', manualOverride: true };
        }
        if (targetField && targetField !== 'crm_note' && m.targetField === targetField && m.sourceColumn !== sourceColumn) {
          return { ...m, targetField: null, source: 'UNMAPPED' as const, status: 'unmapped' as const, reason: `Unmapped: target '${targetField}' reassigned to '${sourceColumn}'`, manualOverride: false };
        }
        return m;
      });
    };

    const initial: ColumnMapping[] = [
      { sourceColumn: 'Name Col A', targetField: 'name', confidence: 0.9, source: 'AI_SUGGESTION', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
      { sourceColumn: 'Name Col B', targetField: null, confidence: 0, source: 'UNMAPPED', status: 'unmapped', reason: '', sampleValues: [], manualOverride: false },
    ];

    // User manually maps "Name Col B" -> "name"
    const result = applyManualMap(initial, 'Name Col B', 'name');

    // "Name Col B" now owns "name"
    assert.strictEqual(result.find(m => m.sourceColumn === 'Name Col B')?.targetField, 'name');
    assert.strictEqual(result.find(m => m.sourceColumn === 'Name Col B')?.source, 'MANUAL');

    // "Name Col A" is now unmapped
    assert.strictEqual(result.find(m => m.sourceColumn === 'Name Col A')?.targetField, null);
    assert.strictEqual(result.find(m => m.sourceColumn === 'Name Col A')?.status, 'unmapped');

    // No duplicates remain
    const nameMappings = result.filter(m => m.targetField === 'name');
    assert.strictEqual(nameMappings.length, 1, 'Exactly one mapping for "name" after reassignment');
  });

  test('validation errors array is empty when no duplicates exist', () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Name', targetField: 'name', confidence: 1, source: 'EXACT_MATCH', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
      { sourceColumn: 'Email', targetField: 'email', confidence: 1, source: 'EXACT_MATCH', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
    ];
    const targetCounts: Record<string, number> = {};
    for (const m of mappings) {
      if (m.targetField && m.targetField !== 'crm_note') {
        targetCounts[m.targetField] = (targetCounts[m.targetField] || 0) + 1;
      }
    }
    const errors = Object.entries(targetCounts).filter(([, c]) => c > 1).map(([f]) => `Duplicate target: '${f}'`);
    assert.strictEqual(errors.length, 0);
  });

  test('validation errors array contains duplicate when two sources map to same target', () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Col A', targetField: 'name', confidence: 0.9, source: 'AI_SUGGESTION', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
      { sourceColumn: 'Col B', targetField: 'name', confidence: 0.7, source: 'HEURISTIC', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
    ];
    const targetCounts: Record<string, number> = {};
    for (const m of mappings) {
      if (m.targetField && m.targetField !== 'crm_note') {
        targetCounts[m.targetField] = (targetCounts[m.targetField] || 0) + 1;
      }
    }
    const errors = Object.entries(targetCounts).filter(([, c]) => c > 1).map(([f]) => `Duplicate target: '${f}'`);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes('name'));
  });

  test('Continue button remains disabled while duplicate target errors exist (logic check)', () => {
    // Simulate the validationErrors derivation that gates the Continue button
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'A', targetField: 'name', confidence: 0.9, source: 'AI_SUGGESTION', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
      { sourceColumn: 'B', targetField: 'name', confidence: 0.7, source: 'HEURISTIC', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
      { sourceColumn: 'C', targetField: 'email', confidence: 1, source: 'EXACT_MATCH', status: 'mapped', reason: '', sampleValues: [], manualOverride: false },
    ];

    const validationErrors: string[] = [];
    const targetCounts: Record<string, number> = {};
    for (const m of mappings) {
      if (m.targetField && m.targetField !== 'crm_note') {
        targetCounts[m.targetField] = (targetCounts[m.targetField] || 0) + 1;
      }
    }
    for (const [field, count] of Object.entries(targetCounts)) {
      if (count > 1) validationErrors.push(`Duplicate target: '${field}'`);
    }

    const continueDisabled = validationErrors.length > 0;
    assert.strictEqual(continueDisabled, true, 'Continue must be disabled when duplicates exist');
  });
});
