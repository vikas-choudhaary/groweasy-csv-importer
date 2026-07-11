"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Database, MagnifyingGlass, FloppyDisk, CalendarBlank, Hash, ArrowRight, Trash, Copy } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { MappingConstellation } from '@/components/ui/MappingConstellation';

interface Mapping {
  id: string;
  name: string;
  description: string;
  sourceHeaders: string;
  normalizedSourceHeaders: string;
  ignoredColumns: string;
  confidenceThreshold: number;
  usageCount: number;
  updatedAt: string;
  lastUsedAt: string;
  mappingJson: string;
}

export default function MappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/mappings/presets`);
        const data = await res.json();
        if (data.success) {
          setMappings(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch mappings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMappings();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this preset?')) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      await fetch(`${baseUrl}/api/mappings/presets/${id}`, { method: 'DELETE' });
      setMappings(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete mapping', err);
    }
  };

  const filteredMappings = mappings.filter(m => 
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl w-full p-4 md:p-8 flex flex-col gap-8 pb-20 pt-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-(--color-foreground) mb-2">Saved Mappings</h1>
          <p className="text-(--color-foreground)/60 tracking-tight max-w-2xl text-sm">
            Manage your reusable CSV-to-CRM schema mapping configurations. These presets are automatically suggested when you upload compatible files.
          </p>
        </div>
      </div>

      <div className="bg-(--color-surface) rounded-2xl border border-(--color-border)/50 p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-foreground)/40" size={18} />
            <input 
              type="text" 
              placeholder="Search mappings by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-(--color-background) border border-(--color-border) rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
            />
          </div>
          <div className="text-sm text-(--color-foreground)/50 font-medium tracking-tight">
            {filteredMappings.length} presets
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-(--color-foreground)/40 gap-4">
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium tracking-widest uppercase">Loading Mappings...</span>
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4 w-full">
            <MappingConstellation />
            <h3 className="text-xl font-mono tracking-tight mb-2 mt-8 text-(--color-foreground)">No Mappings Found</h3>
            <p className="text-sm text-(--color-foreground)/50 max-w-sm mb-6">
              You haven't saved any mapping presets yet. Save a mapping during your next import to reuse it later.
            </p>
            <Link href="/">
              <Button>Start New Import</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMappings.map(mapping => {
              let parsedSourceHeaders: any[] = [];
              let parsedMapping: any = { mappings: [] };
              try {
                parsedSourceHeaders = typeof mapping.sourceHeaders === 'string' ? JSON.parse(mapping.sourceHeaders || '[]') : (mapping.sourceHeaders || []);
                parsedMapping = typeof mapping.mappingJson === 'string' ? JSON.parse(mapping.mappingJson || '{"mappings":[]}') : (mapping.mappingJson || {mappings: []});
              } catch (e) {}
              
              const safeSourceHeaders = Array.isArray(parsedSourceHeaders) ? parsedSourceHeaders : [];
              const safeMappings = Array.isArray(parsedMapping?.mappings) ? parsedMapping.mappings : [];
              const mappedCount = safeMappings.filter((m: any) => m.targetField).length;
              
              return (
                <Link key={mapping.id} href={`/mappings/${mapping.id}`}>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-(--color-background) border border-(--color-border)/60 rounded-xl p-5 hover:border-(--color-primary)/50 hover:bg-(--color-surface-hover) transition-all cursor-pointer flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center border border-(--color-primary)/20">
                          <FloppyDisk size={20} weight="fill" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-(--color-foreground) tracking-tight group-hover:text-(--color-primary) transition-colors line-clamp-1">{mapping.name}</h3>
                          <div className="flex gap-3 text-xs text-(--color-foreground)/50 mt-0.5 font-medium tracking-tight">
                            <span className="flex items-center gap-1"><CalendarBlank size={12}/> {new Date(mapping.updatedAt || mapping.lastUsedAt || Date.now()).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Hash size={12}/> Used {mapping.usageCount || 0} times</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(mapping.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-(--color-error)/70 hover:text-(--color-error) hover:bg-(--color-error)/10 rounded-lg transition-all"
                        title="Delete Preset"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                    
                    {mapping.description && (
                      <p className="text-sm text-(--color-foreground)/60 mb-4 line-clamp-2 leading-relaxed">
                        {mapping.description}
                      </p>
                    )}
                    
                    <div className="mt-auto pt-4 border-t border-(--color-border)/30 grid grid-cols-2 gap-3">
                      <div className="bg-(--color-surface) rounded-lg p-2.5 border border-(--color-border)/30 flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase tracking-widest text-(--color-foreground)/40 font-medium mb-1">Source Columns</span>
                        <span className="text-lg font-semibold">{safeSourceHeaders.length || safeMappings.length}</span>
                      </div>
                      <div className="bg-(--color-success)/5 rounded-lg p-2.5 border border-(--color-success)/20 flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase tracking-widest text-(--color-success)/60 font-medium mb-1">Mapped Fields</span>
                        <span className="text-lg font-semibold text-(--color-success)">{mappedCount}</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
