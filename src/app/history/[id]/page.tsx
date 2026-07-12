"use client";

import React from 'react';
import { ArrowLeft, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function HistoryDetailPage() {
  // Privacy-safe public demo: import detail history is not available.
  // Import results are only accessible immediately after processing via the
  // in-memory job result (job expires after 30 minutes).
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 gap-6">
      <div className="w-16 h-16 rounded-full bg-(--color-warning)/10 border border-(--color-warning)/20 flex items-center justify-center">
        <Warning size={32} className="text-(--color-warning)" />
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl font-semibold tracking-tight">Import Details Unavailable</h2>
        <p className="text-sm text-(--color-foreground)/60 leading-relaxed">
          This is a public demonstration application. Import history is not persisted
          between sessions to protect user privacy.
        </p>
        <p className="text-sm text-(--color-foreground)/50 leading-relaxed">
          Import results are only available immediately after processing completes
          in the current browser session.
        </p>
      </div>

      <Link href="/history">
        <Button variant="outline" className="gap-2">
          <ArrowLeft size={16} />
          Back to History
        </Button>
      </Link>
    </div>
  );
}
