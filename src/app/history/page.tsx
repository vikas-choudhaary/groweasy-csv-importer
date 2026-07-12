"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { DataTimeline } from '@/components/ui/DataTimeline';
import { FileArrowUp } from "@phosphor-icons/react";

export default function HistoryPage() {
  // Privacy-safe public demo: No persistent import history
  // Each import session is independent to protect user privacy
  
  return (
    <div className="mx-auto max-w-4xl w-full p-4 md:p-8 flex flex-col gap-8 pb-20 pt-12">
      <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <div className="w-20 h-20 rounded-full bg-[#9b87f5]/10 border border-[#9b87f5]/20 flex items-center justify-center">
          <DataTimeline />
        </div>
        
        <div className="flex flex-col items-center gap-3 text-center max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">Import History Unavailable</h1>
          <p className="text-lg text-(--color-foreground)/60 tracking-tight leading-relaxed">
            This is a public demonstration application without authentication or user accounts.
          </p>
          <p className="text-sm text-(--color-foreground)/50 tracking-tight leading-relaxed">
            To protect user privacy, persistent import history is not available in this public demo. 
            Each import session is independent and data is not retained after the current session completes.
          </p>
        </div>

        <div className="mt-6 p-6 bg-(--color-surface) border border-(--color-border) rounded-xl max-w-xl">
          <h3 className="text-sm font-semibold mb-3 text-(--color-foreground)/80">Privacy-Safe Demo Features:</h3>
          <ul className="text-sm text-(--color-foreground)/60 space-y-2 list-disc list-inside">
            <li>CSV upload and preview</li>
            <li>AI-powered field mapping</li>
            <li>Batch processing with progress tracking</li>
            <li>Real-time import results display</li>
            <li>Duplicate detection within uploaded CSV</li>
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
