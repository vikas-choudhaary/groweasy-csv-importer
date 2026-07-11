"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FloppyDisk } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';

interface SaveMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  metrics: {
    mappedCount: number;
    ignoredCount: number;
    unmappedCount: number;
  };
}

export function SaveMappingDialog({ isOpen, onClose, onSave, metrics }: SaveMappingDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-(--color-surface) border border-(--color-border) shadow-2xl rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-(--color-border)/50">
            <h3 className="font-semibold tracking-tight text-lg flex items-center gap-2">
              <FloppyDisk size={20} className="text-(--color-primary)" />
              Save Mapping Preset
            </h3>
            <Button variant="ghost" size="sm" className="px-2 h-8" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
          
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Preset Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Salesforce Leads Export"
                className="w-full bg-(--color-background) border border-(--color-border) rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
                autoFocus
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description <span className="text-xs text-(--color-foreground)/50 font-normal">(Optional)</span></label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of file is this for?"
                className="w-full bg-(--color-background) border border-(--color-border) rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 min-h-[80px] resize-none"
              />
            </div>

            <div className="bg-(--color-surface-hover) p-3 rounded-lg border border-(--color-border)/50 flex gap-4 text-sm mt-2">
              <div className="flex flex-col">
                <span className="text-(--color-foreground)/60 text-xs">Mapped</span>
                <span className="font-semibold">{metrics.mappedCount}</span>
              </div>
              <div className="w-px bg-(--color-border)" />
              <div className="flex flex-col">
                <span className="text-(--color-foreground)/60 text-xs">Ignored</span>
                <span className="font-semibold">{metrics.ignoredCount}</span>
              </div>
              <div className="w-px bg-(--color-border)" />
              <div className="flex flex-col">
                <span className="text-(--color-foreground)/60 text-xs">Unmapped</span>
                <span className="font-semibold">{metrics.unmappedCount}</span>
              </div>
            </div>
          </div>
          
          <div className="p-5 border-t border-(--color-border)/50 flex justify-end gap-3 bg-(--color-surface-hover)/30">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              disabled={!name.trim()} 
              onClick={() => {
                onSave(name.trim(), description.trim());
                onClose();
              }}
              className="gap-2"
            >
              <FloppyDisk size={18} />
              Save Preset
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
