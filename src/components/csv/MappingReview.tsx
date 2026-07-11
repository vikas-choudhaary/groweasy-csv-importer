"use client";

import React, { useState } from "react";
import { CheckCircle, WarningCircle, CaretDown, Check } from "@phosphor-icons/react";
import { motion, AnimatePresence, Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export type StandardField = 
  | "created_at" 
  | "name" 
  | "email" 
  | "country_code" 
  | "mobile_without_country_code" 
  | "company" 
  | "city" 
  | "state" 
  | "country" 
  | "lead_owner" 
  | "crm_status" 
  | "crm_note" 
  | "data_source" 
  | "possession_time" 
  | "description" 
  | "ignore";

export interface Mapping {
  csvHeader: string;
  mappedTo: StandardField;
  confidenceScore: number;
  reasoning: string;
}

interface MappingReviewProps {
  mappings: Mapping[];
  onConfirm: (finalMappings: Mapping[], savePresetName?: string) => void;
  onBack: () => void;
}

const FIELD_OPTIONS: { value: StandardField; label: string }[] = [
  { value: "created_at", label: "Created At" },
  { value: "name", label: "Full Name" },
  { value: "email", label: "Email Address" },
  { value: "country_code", label: "Country Code" },
  { value: "mobile_without_country_code", label: "Mobile (No Code)" },
  { value: "company", label: "Company" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "country", label: "Country" },
  { value: "lead_owner", label: "Lead Owner" },
  { value: "crm_status", label: "CRM Status" },
  { value: "crm_note", label: "CRM Note" },
  { value: "data_source", label: "Data Source" },
  { value: "possession_time", label: "Possession Time" },
  { value: "description", label: "Description" },
  { value: "ignore", label: "Ignore (Skip)" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

export function MappingReview({ mappings: initialMappings, onConfirm, onBack }: MappingReviewProps) {
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [presetName, setPresetName] = useState("");
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  const updateMapping = (index: number, newField: StandardField) => {
    const updated = [...mappings];
    updated[index].mappedTo = newField;
    updated[index].confidenceScore = 1.0; 
    setMappings(updated);
    setOpenDropdownIdx(null);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "text-(--color-success)";
    if (score >= 0.7) return "text-(--color-warning)";
    return "text-(--color-error)";
  };

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-(--color-border)/50 pb-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight text-(--color-foreground) mb-1.5">
            Validate Mapping
          </h2>
          <p className="text-sm text-(--color-foreground)/60 tracking-tight leading-relaxed">
            Our AI has analyzed your CSV and matched the columns to GrowEasy fields. Please review below. Any manual overrides will be locked in.
          </p>
        </div>
      </div>

      <div className="bg-(--color-surface) rounded-2xl border border-(--color-border)/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-(--color-background)/30 border-b border-(--color-border)/50">
              <tr>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50">Source Column</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50">Target Field</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50">Confidence</th>
              </tr>
            </thead>
            <motion.tbody 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-(--color-border)/30"
            >
              {mappings.map((mapping, idx) => (
                <motion.tr 
                  variants={rowVariants}
                  key={idx} 
                  className={cn(
                    "transition-colors hover:bg-(--color-surface-hover) group",
                    mapping.mappedTo === "ignore" && "opacity-60 bg-(--color-background)/20"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-(--color-foreground) tracking-tight">{mapping.csvHeader}</span>
                      {mapping.mappedTo !== "ignore" && (
                        <span className="text-xs text-(--color-foreground)/40 truncate max-w-[200px] tracking-tight" title={mapping.reasoning}>
                          {mapping.reasoning}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                        className={cn(
                          "flex items-center justify-between w-[220px] px-3 py-2 rounded-lg border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)",
                          openDropdownIdx === idx 
                            ? "border-(--color-primary) ring-1 ring-(--color-primary) bg-(--color-background)" 
                            : "border-(--color-border)/60 bg-(--color-background) hover:border-(--color-foreground)/30"
                        )}
                      >
                        <span className={cn(
                          "tracking-tight",
                          mapping.mappedTo === "ignore" ? "text-(--color-foreground)/50" : "font-medium"
                        )}>
                          {FIELD_OPTIONS.find(o => o.value === mapping.mappedTo)?.label}
                        </span>
                        <CaretDown size={14} className={cn("transition-transform text-(--color-foreground)/50", openDropdownIdx === idx && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {openDropdownIdx === idx && (
                          <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            style={{ transformOrigin: "top left" }}
                            className="absolute top-[calc(100%+4px)] left-0 w-[220px] bg-(--color-surface) border border-(--color-border)/50 rounded-xl shadow-xl z-50 overflow-hidden py-1 backdrop-blur-xl"
                          >
                            {FIELD_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => updateMapping(idx, option.value)}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-(--color-surface-hover) transition-colors tracking-tight",
                                  mapping.mappedTo === option.value && "bg-(--color-primary)/10 text-(--color-primary) font-medium"
                                )}
                              >
                                {option.label}
                                {mapping.mappedTo === option.value && <Check size={14} weight="bold" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                  <td className="px-6 py-4 tabular-nums tracking-tight">
                    {mapping.mappedTo !== "ignore" ? (
                      <div className="flex items-center gap-2">
                        {mapping.confidenceScore >= 0.9 ? (
                          <CheckCircle size={16} weight="fill" className={getConfidenceColor(mapping.confidenceScore)} />
                        ) : (
                          <WarningCircle size={16} weight="fill" className={getConfidenceColor(mapping.confidenceScore)} />
                        )}
                        <span className={cn("font-medium", getConfidenceColor(mapping.confidenceScore))}>
                          {Math.round(mapping.confidenceScore * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-(--color-foreground)/40">-</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-(--color-surface) p-4 rounded-xl border border-(--color-border)/50 shadow-sm mt-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input 
            type="checkbox" 
            checked={saveAsPreset} 
            onChange={(e) => setSaveAsPreset(e.target.checked)}
            className="w-4 h-4 rounded border-(--color-border) text-(--color-primary) focus:ring-(--color-primary)"
          />
          Save this mapping as a preset
        </label>
        
        <AnimatePresence>
          {saveAsPreset && (
            <motion.div
              initial={{ opacity: 0, width: 0, scale: 0.95 }}
              animate={{ opacity: 1, width: "auto", scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.95 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                placeholder="Preset Name (e.g., FB Ads)"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="h-9 px-3 text-sm rounded-lg border border-(--color-border) bg-(--color-background) focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Button variant="secondary" onClick={onBack}>Discard</Button>
        <Button 
          onClick={() => onConfirm(mappings, saveAsPreset ? presetName : undefined)}
          disabled={saveAsPreset && !presetName.trim()}
        >
          Confirm & Import
        </Button>
      </div>
    </div>
  );
}
