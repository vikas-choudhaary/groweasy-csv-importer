import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Robot, FileCsv, CheckCircle, Question, ArrowsLeftRight, Lightning, MagicWand, FileArrowUp, Check, Play, Warning, Trash, FloppyDisk, CalendarBlank, Hash, ArrowLeft, ArrowRight, FolderOpen, UserList, MagnifyingGlass, Funnel, PencilSimple, X, Link, LinkBreak } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { MappingConfig, ColumnMapping, SchemaField } from '@/lib/types';
import { generateInitialMappings, applyMappingToRow, deduplicateMappings } from '@/lib/mapping-engine';
import { cn } from '@/lib/utils';
import { SaveMappingDialog } from './SaveMappingDialog';

interface SchemaMappingStudioProps {
  headers: string[];
  records: Record<string, unknown>[];
  onContinue: (mappingConfig: MappingConfig) => void;
  onBack: () => void;
  initialPreset?: { id: string, name: string, mappingJson: { mappings: ColumnMapping[] } };
}

export function SchemaMappingStudio({ headers, records, onContinue, onBack, initialPreset }: SchemaMappingStudioProps) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [presets, setPresets] = useState<Array<{ id: string, name: string, mappingJson: { mappings: ColumnMapping[] } }>>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [previewRowIndex, setPreviewRowIndex] = useState(0);

  // New states for Phase 5A.3 completion
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNRESOLVED' | 'MAPPED' | 'IGNORED'>('ALL');
  const [sortMode, setSortMode] = useState<'ORIGINAL' | 'CONFIDENCE'>('ORIGINAL');
  const [aiThreshold, setAiThreshold] = useState<number>(0.8);
  const [suggestedPresets, setSuggestedPresets] = useState<Array<{ id: string, name: string, mappingJson: { mappings: ColumnMapping[] } }>>([]);

  // Load schema and presets
  useEffect(() => {
    const loadData = async () => {
      try {
        const [schemaRes, presetsRes, suggestRes] = await Promise.all([
          fetch(`${baseUrl}/api/schema/metadata`),
          fetch(`${baseUrl}/api/mappings/presets`),
          fetch(`${baseUrl}/api/mappings/presets/suggest?headers=${encodeURIComponent(headers.join(','))}`)
        ]);
        
        const schemaData = await schemaRes.json();
        const presetsData = await presetsRes.json();
        const suggestData = await suggestRes.json();
        
        let initialMap: ColumnMapping[] = [];
        if (schemaData.success) {
          setSchema(schemaData.data);
          initialMap = generateInitialMappings(headers, schemaData.data);
          setMappings(initialMap);
        }
        
        if (presetsData.success) {
          setPresets(presetsData.data);
        }

        if (suggestData.success) {
          setSuggestedPresets(suggestData.data);
        }
        
        // Auto-fetch AI mappings for unresolved columns on mount
        if (schemaData.success) {
          if (initialPreset) {
            if (initialPreset.mappingJson && initialPreset.mappingJson.mappings) {
              const presetMap = new Map(initialPreset.mappingJson.mappings.map((m: ColumnMapping) => [m.sourceColumn, m]));
              const newMappings = headers.map(h => {
                if (presetMap.has(h)) {
                  const pm = presetMap.get(h)!;
                  return { ...pm, source: 'PRESET', status: pm.targetField ? 'mapped' : (pm.status === 'ignored' ? 'ignored' : 'unmapped'), reason: 'Loaded from compatibility preset', sampleValues: [], manualOverride: false } as unknown as ColumnMapping;
                }
                return { sourceColumn: h, targetField: null, confidence: 0, source: 'UNMAPPED', status: 'unmapped', reason: 'No mapping found', sampleValues: [], manualOverride: false } as unknown as ColumnMapping;
              });
              setMappings(newMappings);
            }
          } else {
            const unresolved = initialMap.filter(m => m.source === 'UNMAPPED').map(m => m.sourceColumn);
            if (unresolved.length > 0) {
            setIsGenerating(true);
            try {
              const res = await fetch(`${baseUrl}/api/mappings/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  unresolvedColumns: unresolved,
                  targetSchema: schemaData.data,
                  sampleRecords: records.slice(0, 3)
                })
              });
              const mapData = await res.json();
              if (mapData.success && mapData.data) {
                setMappings(prev => {
                  const next = [...prev];
                  for (const sug of mapData.data) {
                    const idx = next.findIndex(m => m.sourceColumn === sug.sourceColumn);
                    if (idx >= 0 && !next[idx].manualOverride && (sug.confidence >= aiThreshold || sug.status === 'ignored' || !sug.targetField)) {
                      next[idx] = {
                        ...next[idx],
                        targetField: sug.targetField || null,
                        confidence: sug.confidence,
                        source: sug.source || 'AI_SUGGESTION',
                        status: sug.status || (sug.targetField ? 'mapped' : 'ignored'),
                        reason: sug.reasoning || sug.reason,
                        suggestedTargetField: sug.targetField || null,
                        suggestedReasoning: sug.reasoning || sug.reason
                      };
                    }
                  }
                  return deduplicateMappings(next);
                });
              }
            } catch (err) {
              console.error('Initial auto map failed', err);
            } finally {
              setIsGenerating(false);
            }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load mapping studio data', e);
      }
    };
    loadData();
  }, [headers]);

  // Derived Stats
  const mappedCount = mappings.filter(m => !!m.targetField).length;
  const ignoredCount = mappings.filter(m => m.source === 'IGNORED').length;
  const unmappedCount = mappings.length - mappedCount - ignoredCount;
  const confidenceSum = mappings.reduce((acc, m) => acc + (m.confidence || 0), 0);
  const averageConfidence = mappings.length > 0 ? (confidenceSum / mappings.length) : 0;
  const estimatedAiRequests = Math.ceil(unmappedCount > 0 ? records.length / 25 : 0);

  // Derive validation errors instead of using useEffect
  const validationErrors: string[] = [];
  const targetCounts: Record<string, number> = {};
  const mappedTargets = new Set<string>();

  for (const m of mappings) {
    if (m.targetField) {
      mappedTargets.add(m.targetField);
      if (m.targetField !== 'crm_note') {
        targetCounts[m.targetField] = (targetCounts[m.targetField] || 0) + 1;
      }
    }
  }

  for (const [field, count] of Object.entries(targetCounts)) {
    if (count > 1) {
      validationErrors.push(`Duplicate target: '${field}'`);
    }
  }

  for (const f of schema) {
    if (f.required && !mappedTargets.has(f.field)) {
      validationErrors.push(`Missing required field: '${f.field}'`);
    }
  }

  if (mappedCount === 0) {
    validationErrors.push("At least one column must be mapped.");
  }
  if (!mappedTargets.has('email') && !mappedTargets.has('mobile_without_country_code')) {
    validationErrors.push("At least Email or Mobile Number must be mapped to ensure contactability.");
  }

  const handleAutoMap = async () => {
    const unresolved = mappings.filter(m => m.source === 'UNMAPPED').map(m => m.sourceColumn);
    if (unresolved.length === 0) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`${baseUrl}/api/mappings/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unresolvedColumns: unresolved,
          targetSchema: schema,
          sampleRecords: records.slice(0, 3)
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMappings(prev => {
          const next = [...prev];
          for (const sug of data.data) {
            const idx = next.findIndex(m => m.sourceColumn === sug.sourceColumn);
            if (idx >= 0 && !next[idx].manualOverride && (sug.confidence >= aiThreshold || sug.status === 'ignored' || !sug.targetField)) {
              next[idx] = {
                ...next[idx],
                targetField: sug.targetField || null,
                confidence: sug.confidence,
                source: sug.source || 'AI_SUGGESTION',
                status: sug.status || (sug.targetField ? 'mapped' : 'ignored'),
                reason: sug.reasoning || sug.reason,
                sampleValues: [],
                manualOverride: false,
                suggestedTargetField: sug.targetField || null,
                suggestedReasoning: sug.reasoning || sug.reason
              };
            }
          }
          return deduplicateMappings(next);
        });
      }
    } catch (e) {
      console.error('Auto map failed', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualMap = (sourceColumn: string, targetField: string | undefined) => {
    setMappings(prev => {
      let next = prev.map(m => {
        if (m.sourceColumn === sourceColumn) {
          if (!targetField) {
            return { ...m, targetField: null, source: 'UNMAPPED' as const, status: 'unmapped' as const, confidence: 0, reason: 'Manually cleared', manualOverride: true };
          }
          return { ...m, targetField, source: 'MANUAL' as const, status: 'mapped' as const, confidence: 1.0, reason: 'Manually mapped', manualOverride: true };
        }
        // If another column was already mapped to this targetField, unmap it (unless it's crm_note)
        if (targetField && targetField !== 'crm_note' && m.targetField === targetField && m.sourceColumn !== sourceColumn) {
          return { ...m, targetField: null, source: 'UNMAPPED' as const, status: 'unmapped' as const, reason: `Unmapped: target '${targetField}' reassigned to '${sourceColumn}'`, manualOverride: false };
        }
        return m;
      });
      return next;
    });
  };

  const handleIgnore = (sourceColumn: string) => {
    setMappings(prev => prev.map(m => 
      m.sourceColumn === sourceColumn 
        ? { ...m, targetField: null, source: 'IGNORED', status: 'ignored', confidence: 1.0, reason: 'Explicitly ignored', manualOverride: true } 
        : m
    ));
  };

  const handleSavePreset = async (name: string, description: string) => {
    try {
      const ignoredColumns = mappings.filter(m => m.source === 'IGNORED').map(m => m.sourceColumn);
      const res = await fetch(`${baseUrl}/api/mappings/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          description,
          sourceHeaders: headers,
          ignoredColumns,
          confidenceThreshold: aiThreshold,
          mappingJson: { mappings } 
        })
      });
      const data = await res.json();
      if (data.success) {
        setPresets([data.data, ...presets]);
      }
    } catch (e) {
      console.error('Save preset failed', e);
    }
  };

  const handleLoadPreset = (preset: { id: string, name: string, mappingJson: { mappings: ColumnMapping[] } }) => {
    if (preset.mappingJson && preset.mappingJson.mappings) {
      // Reconcile headers
      const presetMap = new Map(preset.mappingJson.mappings.map((m: ColumnMapping) => [m.sourceColumn, m]));
      const newMappings = headers.map(h => {
        if (presetMap.has(h)) {
          const pm = presetMap.get(h)!;
          return { ...pm, source: 'PRESET', status: pm.targetField ? 'mapped' : 'unmapped', reason: 'Loaded from preset', sampleValues: [], manualOverride: false } as ColumnMapping;
        }
        return { sourceColumn: h, targetField: null, confidence: 0, source: 'UNMAPPED', status: 'unmapped', reason: 'No mapping found', sampleValues: [], manualOverride: false } as ColumnMapping;
      });
      setMappings(newMappings);
      setShowPresets(false);
    }
  };

  const getSourceStats = (col: string) => {
    const total = records.length;
    let empty = 0;
    const samples = new Set<string>();
    for (const r of records) {
      const val = r[col];
      if (val === undefined || val === null || val === '') empty++;
      else if (samples.size < 3) samples.add(String(val));
    }
    return { empty, nullPercent: ((empty / total) * 100).toFixed(0), samples: Array.from(samples) };
  };

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this preset?')) return;
    try {
      await fetch(`${baseUrl}/api/mappings/presets/${id}`, { method: 'DELETE' });
      setPresets(presets.filter(p => p.id !== id));
      setSuggestedPresets(suggestedPresets.filter(p => p.id !== id));
    } catch (e) { console.error('Delete failed', e); }
  };

  const handleRenamePreset = async (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt('Enter new name:', currentName);
    if (!name || name === currentName) return;
    try {
      const res = await fetch(`${baseUrl}/api/mappings/presets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        setPresets(presets.map(p => p.id === id ? { ...p, name } : p));
        setSuggestedPresets(suggestedPresets.map(p => p.id === id ? { ...p, name } : p));
      }
    } catch (e) { console.error('Rename failed', e); }
  };

  const handleRestoreSuggestion = (sourceColumn: string) => {
    setMappings(prev => prev.map(m => {
      if (m.sourceColumn === sourceColumn && m.suggestedTargetField) {
        return {
          ...m,
          targetField: m.suggestedTargetField,
          source: 'AI_SUGGESTION',
          status: 'mapped',
          reason: m.suggestedReasoning || 'Restored AI suggestion',
          manualOverride: false
        };
      }
      return m;
    }));
  };

  const filteredMappings = mappings.filter(m => {
    if (filterMode === 'UNRESOLVED' && m.source !== 'UNMAPPED') return false;
    if (filterMode === 'MAPPED' && !m.targetField) return false;
    if (filterMode === 'IGNORED' && m.source !== 'IGNORED') return false;
    if (searchTerm && !m.sourceColumn.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortMode === 'CONFIDENCE') return b.confidence - a.confidence;
    return 0; // Original order preserved by default
  });

  return (
    <div className="flex flex-col h-full bg-[#0B0D11] text-white">
      {/* TOP SUMMARY BAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B0D11]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white">
            <ArrowLeft weight="bold" />
          </button>
          <div>
            <h1 className="text-xl font-medium tracking-tight">Schema Mapping</h1>
            <p className="text-sm text-white/40">{records.length} rows • {headers.length} columns</p>
          </div>
          
          <div className="h-8 w-[1px] bg-white/10" />
          
          <div className="flex gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-white/40">Mapped</span>
              <span className="text-emerald-400 font-medium">{mappedCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40">Ignored</span>
              <span className="text-white/40 font-medium">{ignoredCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40">Unmapped</span>
              <span className="text-amber-400 font-medium">{unmappedCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40">Confidence</span>
              <span className="text-blue-400 font-medium">{(averageConfidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[10px] uppercase tracking-widest text-white/40">AI Threshold: {aiThreshold * 100}%</span>
            <input 
              type="range" min="0" max="1" step="0.1" 
              value={aiThreshold} 
              onChange={(e) => setAiThreshold(parseFloat(e.target.value))} 
              className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <button 
            onClick={() => setShowPresets(!showPresets)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FolderOpen weight="bold" /> Presets
          </button>
          <button 
            onClick={() => setIsSaveDialogOpen(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FloppyDisk weight="bold" /> Save
          </button>
          <div className="flex flex-col items-center">
            <button 
              onClick={handleAutoMap}
              disabled={isGenerating || unmappedCount === 0}
              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <MagicWand weight="bold" className={isGenerating ? "animate-pulse" : ""} /> AI Suggest
            </button>
            {unmappedCount > 0 && <span className="text-[9px] text-indigo-400/60 mt-1">~{estimatedAiRequests} requests</span>}
          </div>
          <button 
            onClick={() => onContinue({ mappings })}
            disabled={validationErrors.length > 0}
            className="px-6 py-2 bg-white text-black hover:bg-white/90 rounded-lg text-sm font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ArrowRight weight="bold" />
          </button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center gap-3 text-sm text-red-400">
          <Warning weight="bold" />
          <div className="flex gap-4">
            {validationErrors.map((err, idx) => (
              <span key={idx}>{err}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Presets Overlay */}
        <AnimatePresence>
          {showPresets && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 right-10 z-20 w-80 bg-[#12151C] border border-white/10 rounded-xl shadow-2xl p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Saved Presets</h3>
                <button onClick={() => setShowPresets(false)}><X className="text-white/40 hover:text-white" /></button>
              </div>

              {suggestedPresets.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] uppercase tracking-widest text-emerald-400/80 mb-2">Suggested (Header Match)</h4>
                  <div className="flex flex-col gap-2">
                    {suggestedPresets.map(p => (
                      <div key={p.id} className="group flex items-center justify-between p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-colors">
                        <button onClick={() => handleLoadPreset(p)} className="flex-1 text-left text-sm text-emerald-400">{p.name}</button>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => handleRenamePreset(p.id, p.name, e)} className="text-white/40 hover:text-white"><PencilSimple /></button>
                          <button onClick={(e) => handleDeletePreset(p.id, e)} className="text-red-400/60 hover:text-red-400"><Trash /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-2">All Presets</h4>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {presets.length === 0 ? (
                  <p className="text-sm text-white/40">No presets saved yet.</p>
                ) : (
                  presets.map(p => (
                    <div key={p.id} className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                      <button onClick={() => handleLoadPreset(p)} className="flex-1 text-left text-sm">{p.name}</button>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleRenamePreset(p.id, p.name, e)} className="text-white/40 hover:text-white"><PencilSimple /></button>
                        <button onClick={(e) => handleDeletePreset(p.id, e)} className="text-red-400/60 hover:text-red-400"><Trash /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SOURCE INVENTORY */}
        <div className="flex-1 border-r border-white/5 overflow-y-auto p-6 scrollbar-hide flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Database /> Source Columns
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input 
                  type="text" 
                  placeholder="Search columns..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-white/30 outline-none w-40 transition-all"
                />
              </div>
              <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                <select 
                  value={filterMode} 
                  onChange={e => setFilterMode(e.target.value as 'ALL' | 'UNRESOLVED' | 'MAPPED' | 'IGNORED')}
                  className="bg-transparent text-xs pl-2 pr-1 py-1 outline-none appearance-none"
                >
                  <option value="ALL">All Columns</option>
                  <option value="UNRESOLVED">Unresolved</option>
                  <option value="MAPPED">Mapped</option>
                  <option value="IGNORED">Ignored</option>
                </select>
                <Funnel className="my-auto mx-1 text-white/40" />
              </div>
              <select 
                value={sortMode} 
                onChange={e => setSortMode(e.target.value as 'ORIGINAL' | 'CONFIDENCE')}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none"
              >
                <option value="ORIGINAL">Original Order</option>
                <option value="CONFIDENCE">Sort by Confidence</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {filteredMappings.map((m, i) => {
              const stats = getSourceStats(m.sourceColumn);
              const isMapped = !!m.targetField;
              const isIgnored = m.source === 'IGNORED';
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  key={m.sourceColumn}
                  onClick={() => setSelectedColumn(m.sourceColumn)}
                  className={cn(
                    "p-4 rounded-xl border border-white/5 bg-[#12151C] hover:bg-[#1A1E27] cursor-pointer transition-all group",
                    selectedColumn === m.sourceColumn && "ring-1 ring-white/20 bg-[#1A1E27]",
                    isIgnored && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isMapped ? <Link className="text-emerald-400" /> : isIgnored ? <LinkBreak className="text-white/20" /> : <Warning className="text-amber-400" />}
                      <span className="font-medium text-white group-hover:text-white transition-colors">{m.sourceColumn}</span>
                    </div>
                    {isMapped && (
                      <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                        {m.targetField}
                      </div>
                    )}
                    {isIgnored && (
                      <div className="px-2 py-1 rounded bg-white/5 text-white/40 text-xs font-medium">
                        IGNORED
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>{stats.nullPercent}% null</span>
                    <div className="flex gap-2">
                      {stats.samples.map((s, idx) => (
                        <span key={idx} className="truncate max-w-[100px] bg-white/5 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* TARGET SCHEMA PANEL */}
        <div className="w-80 border-r border-white/5 overflow-y-auto p-6 bg-[#0E1015] scrollbar-hide">
          <h2 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider flex items-center gap-2">
            <UserList /> Target CRM Schema
          </h2>
          <div className="flex flex-col gap-4">
            {schema.map(f => {
              const mappedColumns = mappings.filter(m => m.targetField === f.field);
              return (
                <div key={f.field} className="p-3 rounded-lg border border-white/5 bg-[#12151C]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{f.field}</span>
                    {f.required && <span className="text-[10px] uppercase text-amber-400 font-bold tracking-wider">Req</span>}
                  </div>
                  <p className="text-xs text-white/40 mb-3">{f.description}</p>
                  
                  {mappedColumns.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {mappedColumns.map(m => (
                        <span key={m.sourceColumn} className="text-xs px-2 py-1 rounded bg-white/10 text-white/80">
                          {m.sourceColumn}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-white/20 italic">Not mapped</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* INSPECTOR PANEL */}
        <div className="w-[400px] overflow-y-auto bg-[#12151C] p-6 relative border-l border-white/5">
          {selectedColumn ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedColumn}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium">{selectedColumn}</h3>
                  <button onClick={() => setSelectedColumn(null)} className="text-white/40 hover:text-white">✕</button>
                </div>
                
                {(() => {
                  const m = mappings.find(m => m.sourceColumn === selectedColumn);
                  if (!m) return null;
                  
                  return (
                    <div className="flex flex-col gap-6">
                      {/* Mapping Actions */}
                      <div className="p-4 rounded-xl border border-white/10 bg-[#1A1E27]">
                        <label className="text-xs font-medium text-white/60 uppercase tracking-wider block mb-2">Map to Target Field</label>
                        <select 
                          value={m.targetField || ''} 
                          onChange={(e) => handleManualMap(selectedColumn, e.target.value)}
                          className="w-full bg-[#0B0D11] border border-white/10 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-white/30 outline-none transition-shadow"
                        >
                          <option value="">-- Select Target Field --</option>
                          {schema.map(f => (
                            <option key={f.field} value={f.field}>{f.field}</option>
                          ))}
                        </select>
                        
                        <div className="mt-4 flex gap-2">
                          {m.suggestedTargetField && m.targetField !== m.suggestedTargetField && (
                            <button 
                              onClick={() => handleRestoreSuggestion(selectedColumn)}
                              className="flex-1 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium transition-colors"
                            >
                              Restore AI Suggestion
                            </button>
                          )}
                          <button 
                            onClick={() => handleManualMap(selectedColumn, undefined)}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors"
                          >
                            Clear
                          </button>
                          <button 
                            onClick={() => handleIgnore(selectedColumn)}
                            className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                      
                      {/* Mapping Status */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/40">Status</span>
                          <span className={cn("font-medium", m.targetField ? "text-emerald-400" : m.source === 'IGNORED' ? "text-white/40" : "text-amber-400")}>
                            {m.source.replace('_', ' ')}
                          </span>
                        </div>
                        {m.confidence > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/40">Confidence</span>
                            <span>{(m.confidence * 100).toFixed(0)}%</span>
                          </div>
                        )}
                        {m.reason && (
                          <div className="p-3 bg-white/5 rounded-lg text-xs text-white/60 leading-relaxed border border-white/5">
                            {m.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/20">
              <Link weight="light" className="text-6xl mb-4" />
              <p className="text-sm">Select a column to inspect</p>
            </div>
          )}
        </div>
      </div>
      
      {/* TRANSFORMATION PREVIEW (Bottom Panel) */}
      <div className="h-48 border-t border-white/5 bg-[#0B0D11] p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Live Transformation Preview</h3>
          <div className="flex items-center gap-2 text-xs">
            <button 
              onClick={() => setPreviewRowIndex(Math.max(0, previewRowIndex - 1))}
              className="px-2 py-1 bg-white/5 rounded hover:bg-white/10"
            >
              Prev
            </button>
            <span className="text-white/40">Row {previewRowIndex + 1} of {records.length}</span>
            <button 
              onClick={() => setPreviewRowIndex(Math.min(records.length - 1, previewRowIndex + 1))}
              className="px-2 py-1 bg-white/5 rounded hover:bg-white/10"
            >
              Next
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="flex-1 bg-[#12151C] rounded-lg border border-white/5 p-3 overflow-y-auto text-xs font-mono scrollbar-hide">
             <div className="text-white/40 mb-2">Source Row</div>
             {records[previewRowIndex] && Object.entries(records[previewRowIndex]).map(([k, v]) => (
               <div key={k} className="flex gap-2 mb-1">
                 <span className="text-white/30 w-32 truncate shrink-0">{k}:</span>
                 <span className="text-emerald-300/70 truncate">{String(v || '')}</span>
               </div>
             ))}
          </div>
          
          <div className="flex-1 bg-[#12151C] rounded-lg border border-white/5 p-3 overflow-y-auto text-xs font-mono scrollbar-hide">
             <div className="text-white/40 mb-2">Transformed CRM Record</div>
             {(() => {
               if (!records[previewRowIndex]) return null;
               const { record } = applyMappingToRow(records[previewRowIndex], { mappings });
               
               if (Object.keys(record).length === 0) {
                 return (
                   <div className="h-full flex items-center justify-center text-white/30 italic">
                     No fields are currently mapped.
                   </div>
                 );
               }

               return (
                 <div className="space-y-3">
                   <div>
                     {Object.entries(record).map(([k, v]) => (
                       <div key={k} className="flex gap-2 mb-1">
                         <span className="text-white/60 w-32 truncate shrink-0">{k}:</span>
                         <span className="text-emerald-400">{String(v || '')}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               );
             })()}
          </div>
        </div>
      </div>
      
      <SaveMappingDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSavePreset}
        metrics={{ mappedCount, ignoredCount, unmappedCount }}
      />
    </div>
  );
}
