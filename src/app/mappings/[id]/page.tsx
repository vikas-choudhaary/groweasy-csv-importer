"use client";

import React from 'react';
import { ArrowLeft, Database } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function MappingDetailPage() {
  // Privacy-safe public demo: saved mapping presets are not available.
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 gap-6">
      <div className="w-16 h-16 rounded-full bg-[#9b87f5]/10 border border-[#9b87f5]/20 flex items-center justify-center">
        <Database size={32} className="text-[#9b87f5]" />
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl font-semibold tracking-tight">Mapping Preset Unavailable</h2>
        <p className="text-sm text-(--color-foreground)/60 leading-relaxed">
          This is a public demonstration application. Saved mapping presets are not
          persisted between sessions to protect user privacy.
        </p>
        <p className="text-sm text-(--color-foreground)/50 leading-relaxed">
          AI-powered mapping suggestions are provided fresh for each import session.
        </p>
      </div>

      <Link href="/mappings">
        <Button variant="outline" className="gap-2">
          <ArrowLeft size={16} />
          Back to Mappings
        </Button>
      </Link>
    </div>
  );
}
