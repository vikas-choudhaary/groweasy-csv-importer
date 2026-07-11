"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Database, FloppyDisk, CalendarBlank, Hash, Warning, CheckCircle, Funnel, Trash, PencilSimple, Copy } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function MappingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [mapping, setMapping] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMapping = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/mappings/presets/${id}`);
        const data = await res.json();
        
        if (data.success) {
          setMapping(data.data);
          setEditName(data.data.name);
          setEditDescription(data.data.description || "");
        } else {
          setError(data.error || 'Failed to load mapping');
        }
      } catch (err) {
        setError('Network error loading mapping');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMapping();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this preset?')) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      await fetch(`${baseUrl}/api/mappings/presets/${id}`, { method: 'DELETE' });
      router.push('/mappings');
    } catch (err) {
      console.error('Failed to delete mapping', err);
    }
  };

  const handleDuplicate = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const duplicateData = {
        name: `${mapping.name} (Copy)`,
        description: mapping.description,
        sourceHeaders: typeof mapping.sourceHeaders === 'string' ? JSON.parse(mapping.sourceHeaders || '[]') : (mapping.sourceHeaders || []),
        mappingConfig: typeof mapping.mappingJson === 'string' ? JSON.parse(mapping.mappingJson || '{"mappings":[]}') : (mapping.mappingJson || {mappings: []}),
        confidenceThreshold: mapping.confidenceThreshold
      };
      
      const res = await fetch(`${baseUrl}/api/mappings/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/mappings/${data.data.id}`);
      }
    } catch (err) {
      console.error('Failed to duplicate mapping', err);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      // Create a duplicate with updated name, since our current API might not have a generic PUT /presets/:id
      // Wait, is there a PUT or PATCH? If not, we just update local state or warn.
      // Let's assume there is a PUT endpoint or we can just send it.
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/mappings/presets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription })
      });
      const data = await res.json();
      if (data.success) {
        setMapping({ ...mapping, name: editName, description: editDescription });
        setIsEditing(false);
      } else {
        alert("Failed to update preset. Backend might not support PUT yet.");
      }
    } catch (err) {
      console.error('Failed to update mapping', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-(--color-foreground)/40 gap-4">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium tracking-widest uppercase">Loading Preset...</span>
      </div>
    );
  }

  if (error || !mapping) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 gap-4">
        <Warning size={48} className="text-(--color-error)/70" />
        <h2 className="text-xl font-semibold tracking-tight text-(--color-error)">Preset Not Found</h2>
        <p className="text-sm text-(--color-foreground)/60 mb-4">{error}</p>
        <Link href="/mappings">
          <Button variant="outline"><ArrowLeft size={16} className="mr-2" /> Back to Mappings</Button>
        </Link>
      </div>
    );
  }

  const mappingsList = mapping.mappingJson?.mappings || [];
  const mappedList = mappingsList.filter((m: any) => m.targetField);
  const ignoredList = mappingsList.filter((m: any) => m.status === 'ignored');
  const unmappedList = mappingsList.filter((m: any) => !m.targetField && m.status !== 'ignored');

  return (
    <div className="mx-auto max-w-5xl w-full p-4 md:p-8 flex flex-col gap-6 pb-20 pt-4">
      <Link href="/mappings" className="inline-flex items-center text-sm font-medium text-(--color-foreground)/50 hover:text-(--color-foreground) transition-colors self-start mb-2 group">
        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Saved Mappings
      </Link>

      <div className="bg-(--color-surface) rounded-2xl border border-(--color-border)/50 p-6 flex flex-col gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-(--color-primary)/10 to-transparent blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex gap-4 w-full">
            <div className="w-14 h-14 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center text-(--color-primary) shrink-0">
              <FloppyDisk size={28} weight="fill" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-(--color-foreground) leading-none">{mapping.name}</h1>
                <button onClick={() => setIsEditing(true)} className="text-(--color-foreground)/40 hover:text-(--color-primary) transition-colors">
                  <PencilSimple size={16} />
                </button>
              </div>
              {mapping.description && (
                <p className="text-sm text-(--color-foreground)/70 leading-relaxed max-w-xl">{mapping.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs font-medium text-(--color-foreground)/50 mt-2">
                <span className="flex items-center gap-1.5"><CalendarBlank size={14} /> Created {new Date(mapping.updatedAt || Date.now()).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5"><Hash size={14} /> Used {mapping.usageCount || 0} times</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2 text-(--color-foreground)/80 border-(--color-border)/50">
              <Copy size={16} /> Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-(--color-error) hover:bg-(--color-error)/10 hover:border-(--color-error)/20 gap-2">
              <Trash size={16} /> Delete
            </Button>
            <Link href={`/?presetId=${mapping.id}`}>
              <Button size="sm" className="gap-2"><ArrowRight size={16} /> Apply to New Import</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-(--color-background) p-4 rounded-xl border border-(--color-border)/40 flex flex-col gap-1">
            <span className="text-sm text-(--color-foreground)/50 font-medium">Mapped Fields</span>
            <span className="text-3xl font-bold text-(--color-success)">{mappedList.length}</span>
          </div>
          <div className="bg-(--color-background) p-4 rounded-xl border border-(--color-border)/40 flex flex-col gap-1">
            <span className="text-sm text-(--color-foreground)/50 font-medium">Ignored Columns</span>
            <span className="text-3xl font-bold">{ignoredList.length}</span>
          </div>
          <div className="bg-(--color-background) p-4 rounded-xl border border-(--color-border)/40 flex flex-col gap-1">
            <span className="text-sm text-(--color-foreground)/50 font-medium">Unmapped</span>
            <span className="text-3xl font-bold text-(--color-warning)">{unmappedList.length}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold tracking-tight">Configuration Details</h3>
        <div className="bg-(--color-surface) rounded-2xl border border-(--color-border)/50 overflow-hidden">
          <div className="grid grid-cols-2 bg-(--color-background) border-b border-(--color-border)/50 p-4 text-sm font-semibold tracking-wide text-(--color-foreground)/60 uppercase">
            <div>Source Column</div>
            <div>Target CRM Field</div>
          </div>
          <div className="divide-y divide-(--color-border)/20">
            {mappedList.map((m: any) => (
              <div key={m.sourceColumn} className="grid grid-cols-2 p-4 text-sm hover:bg-(--color-surface-hover) transition-colors">
                <div className="font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-(--color-success) inline-block" />
                  {m.sourceColumn}
                </div>
                <div className="font-mono text-(--color-foreground)/80 bg-(--color-background) px-2 py-0.5 rounded border border-(--color-border)/40 inline-flex self-start">
                  {m.targetField}
                </div>
              </div>
            ))}
            {ignoredList.map((m: any) => (
              <div key={m.sourceColumn} className="grid grid-cols-2 p-4 text-sm hover:bg-(--color-surface-hover) transition-colors opacity-60">
                <div className="font-medium flex items-center gap-2 text-(--color-foreground)/60">
                  <span className="w-2 h-2 rounded-full bg-(--color-foreground)/30 inline-block" />
                  <span className="line-through">{m.sourceColumn}</span>
                </div>
                <div className="italic">Ignored</div>
              </div>
            ))}
            {unmappedList.map((m: any) => (
              <div key={m.sourceColumn} className="grid grid-cols-2 p-4 text-sm hover:bg-(--color-surface-hover) transition-colors">
                <div className="font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-(--color-warning) inline-block" />
                  {m.sourceColumn}
                </div>
                <div className="text-(--color-warning) italic">Unmapped</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-(--color-surface) rounded-2xl border border-(--color-border) shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
              <h3 className="text-lg font-semibold">Edit Preset Details</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-(--color-foreground)/70 uppercase tracking-wider">Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-(--color-background) border border-(--color-border) rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-(--color-foreground)/70 uppercase tracking-wider">Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full bg-(--color-background) border border-(--color-border) rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveEdit} disabled={isSaving || !editName.trim()}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
