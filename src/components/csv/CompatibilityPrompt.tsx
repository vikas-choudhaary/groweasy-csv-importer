"use client";

import React from "react";
import { motion } from "motion/react";
import { MagicWand, ArrowRight, X, FileCsv } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

interface PresetSuggestion {
  id: string;
  name: string;
  score: number;
  matchPercentage: number;
  matchedColumns: string[];
  missingColumns: string[];
  extraColumns: string[];
  mappingJson: any;
}

interface CompatibilityPromptProps {
  suggestions: PresetSuggestion[];
  onApply: (preset: PresetSuggestion) => void;
  onSkip: () => void;
}

export function CompatibilityPrompt({ suggestions, onApply, onSkip }: CompatibilityPromptProps) {
  const topMatch = suggestions[0];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <div className="text-center mb-4">
        <div className="w-16 h-16 rounded-full bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center mx-auto mb-6 text-(--color-primary)">
          <MagicWand size={32} weight="fill" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-(--color-foreground) mb-2">
          Mapping Match Found
        </h2>
        <p className="text-(--color-foreground)/60 tracking-tight">
          We found a saved mapping preset that matches the headers of your CSV file.
        </p>
      </div>

      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-(--color-primary)/20 to-transparent blur-3xl" />
        
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-(--color-foreground)/50 uppercase tracking-widest">
                Recommended Preset
              </span>
              <h3 className="text-xl font-bold">{topMatch.name}</h3>
            </div>
            <div className="px-3 py-1 bg-(--color-success)/10 text-(--color-success) rounded-full text-sm font-semibold border border-(--color-success)/20">
              {(topMatch.matchPercentage * 100).toFixed(0)}% Match
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-(--color-background) p-4 rounded-xl border border-(--color-border)/50 flex flex-col gap-2">
              <span className="text-sm font-medium text-(--color-success)">
                {topMatch.matchedColumns.length} Matched Headers
              </span>
              <div className="flex flex-wrap gap-1">
                {topMatch.matchedColumns.slice(0, 5).map(c => (
                  <span key={c} className="text-xs px-2 py-1 bg-(--color-surface) rounded-md text-(--color-foreground)/70">
                    {c}
                  </span>
                ))}
                {topMatch.matchedColumns.length > 5 && (
                  <span className="text-xs px-2 py-1 text-(--color-foreground)/50">
                    +{topMatch.matchedColumns.length - 5} more
                  </span>
                )}
              </div>
            </div>
            
            {(topMatch.missingColumns.length > 0 || topMatch.extraColumns.length > 0) && (
              <div className="bg-(--color-background) p-4 rounded-xl border border-(--color-border)/50 flex flex-col gap-2">
                {topMatch.missingColumns.length > 0 && (
                  <>
                    <span className="text-sm font-medium text-(--color-warning)">
                      {topMatch.missingColumns.length} Missing Headers
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {topMatch.missingColumns.slice(0, 2).map(c => (
                        <span key={c} className="text-xs px-2 py-1 bg-(--color-surface) rounded-md text-(--color-foreground)/70 line-through">
                          {c}
                        </span>
                      ))}
                      {topMatch.missingColumns.length > 2 && (
                        <span className="text-xs px-2 py-1 text-(--color-foreground)/50">
                          +{topMatch.missingColumns.length - 2} more
                        </span>
                      )}
                    </div>
                  </>
                )}
                
                {topMatch.extraColumns.length > 0 && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-(--color-foreground)/60">
                    <FileCsv size={14} />
                    {topMatch.extraColumns.length} new unrecognized columns in this CSV
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="outline" onClick={onSkip} className="gap-2">
              <X size={16} />
              Map Manually
            </Button>
            <Button onClick={() => onApply(topMatch)} className="gap-2">
              Apply Preset <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
      
      {suggestions.length > 1 && (
        <div className="text-center">
          <p className="text-sm text-(--color-foreground)/50">
            {suggestions.length - 1} other possible matches found. You can browse them in the Mapping Studio.
          </p>
        </div>
      )}
    </div>
  );
}
