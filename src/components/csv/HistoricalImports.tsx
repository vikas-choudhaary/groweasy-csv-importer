"use client";

import React from "react";
import { Clock, FileArrowUp } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function HistoricalImports() {
  // Privacy-safe public demo: no persistent import history
  // Previously fetched from GET /api/imports and GET /api/imports/:id/leads
  // Those backend endpoints have been removed.
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
      <div className="w-16 h-16 rounded-full bg-(--color-surface) border border-(--color-border) flex items-center justify-center">
        <Clock size={32} className="text-(--color-foreground)/30" />
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-lg font-semibold tracking-tight">No Import History</h3>
        <p className="text-sm text-(--color-foreground)/60 leading-relaxed">
          Import history is not persisted in this public demo to protect user privacy.
          Results are only available immediately after each import completes.
        </p>
      </div>

      <Link href="/">
        <Button variant="outline" className="gap-2">
          <FileArrowUp size={16} />
          Start New Import
        </Button>
      </Link>
    </div>
  );
}
