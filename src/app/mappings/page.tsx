"use client";

import React from 'react';
import { FileArrowUp } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { MappingConstellation } from '@/components/ui/MappingConstellation';

export default function MappingsPage() {
  // Privacy-safe public demo: persistent saved mappings not available
  return (
    <div className="mx-auto max-w-4xl w-full p-4 md:p-8 flex flex-col gap-8 pb-20 pt-12">
      <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <div className="w-20 h-20 rounded-full bg-[#9b87f5]/10 border border-[#9b87f5]/20 flex items-center justify-center">
          <MappingConstellation />
        </div>

        <div className="flex flex-col items-center gap-3 text-center max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">Saved Mappings Unavailable</h1>
          <p className="text-lg text-(--color-foreground)/60 tracking-tight leading-relaxed">
            This is a public demonstration application without authentication or user accounts.
          </p>
          <p className="text-sm text-(--color-foreground)/50 tracking-tight leading-relaxed">
            Persistent mapping presets are not available in this public demo to protect user privacy.
            Each import session provides fresh AI-powered mapping suggestions for your CSV.
          </p>
        </div>

        <div className="mt-6 p-6 bg-(--color-surface) border border-(--color-border) rounded-xl max-w-xl w-full">
          <h3 className="text-sm font-semibold mb-3 text-(--color-foreground)/80">Mapping features available per session:</h3>
          <ul className="text-sm text-(--color-foreground)/60 space-y-2 list-disc list-inside">
            <li>AI-powered automatic field mapping</li>
            <li>Manual mapping review and corrections</li>
            <li>Real-time mapping confidence scoring</li>
            <li>Duplicate target field detection</li>
            <li>Schema validation before import</li>
          </ul>
        </div>

        <Link href="/" className="mt-4">
          <Button className="gap-2">
            <FileArrowUp size={18} />
            Start New Import
          </Button>
        </Link>
      </div>
    </div>
  );
}
