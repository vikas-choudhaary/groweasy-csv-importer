"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, CircleNotch, Lightning, XCircle, Warning, Clock, ArrowsClockwise, Database } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ProcessingWorkspaceProps {
  fileName: string;
  headers: string[];
  status: 'processing' | 'completed' | 'failed';
  progress: { processed: number; total: number; percentage: number };
  batchesCompleted: number;
  batchesTotal: number;
  error: string | null;
  retryable?: boolean;
  onComplete: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onBackToPreview: () => void;
}

const CRM_FIELDS = [
  "created_at", "name", "email", "country_code", "mobile_without_country_code",
  "company", "city", "state", "country", "lead_owner", "crm_status",
  "crm_note", "data_source", "possession_time", "description"
];

const TIMELINE_STAGES = [
  "Source accepted",
  "Batches prepared",
  "AI extraction",
  "Server validation",
  "Results ready"
];

export function ProcessingWorkspace({ 
  fileName, headers, status, progress, 
  batchesCompleted, batchesTotal, error, retryable = true,
  onComplete, onRetry, onCancel, onBackToPreview 
}: ProcessingWorkspaceProps) {
  
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState("00:00");
  const [events, setEvents] = useState<string[]>(['System initialized', 'Job queued for processing']);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showArch, setShowArch] = useState(false);

  // Derive Elapsed Time
  useEffect(() => {
    const timer = setInterval(() => {
      if (status === 'completed' || status === 'failed') return;
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, status]);

  // Derive Event Log
  const prevBatchesTotal = useRef(0);
  const prevBatchesCompleted = useRef(0);
  const prevProcessed = useRef(0);
  const hasCompletedEvent = useRef(false);

  useEffect(() => {
    if (batchesTotal > 0 && prevBatchesTotal.current === 0) {
      setEvents(prev => [`Prepared ${batchesTotal} batches for AI`, 'Source CSV accepted', ...prev]);
      prevBatchesTotal.current = batchesTotal;
    }
  }, [batchesTotal]);

  useEffect(() => {
    if (batchesCompleted > prevBatchesCompleted.current) {
      setEvents(prev => [`Batch ${batchesCompleted} extraction and validation complete`, ...prev]);
      prevBatchesCompleted.current = batchesCompleted;
    }
  }, [batchesCompleted]);

  useEffect(() => {
    if (progress.processed > prevProcessed.current) {
      if (progress.processed === progress.total && progress.total > 0 && !hasCompletedEvent.current) {
        setEvents(prev => [`All ${progress.total} records successfully processed`, ...prev]);
        hasCompletedEvent.current = true;
      }
      prevProcessed.current = progress.processed;
    }
  }, [progress.processed, progress.total]);

  useEffect(() => {
    if (status === 'completed') {
      setEvents(prev => ['Transformation finalized', 'Results ready for review', ...prev]);
    } else if (status === 'failed') {
      setEvents(prev => [`Processing failed: ${error}`, ...prev]);
    }
  }, [status, error]);

  // Completion Sequence
  useEffect(() => {
    if (status === 'completed' && !isCompleting) {
      setIsCompleting(true);
      // No automatic transition, wait for user to click "Review Results"
    }
  }, [status, isCompleting]);

  // If retrying occurs (detected by error disappearing or status changing back to processing)
  useEffect(() => {
    if (status === 'processing' && error === null && events[0]?.includes('failed')) {
      setEvents(prev => ['Retry initiated', ...prev]);
    }
  }, [status, error, events]);

  const clearLog = () => setEvents([]);

  // Data flow animation variants based on status
  const isError = status === 'failed';
  const isDone = status === 'completed' || isCompleting;

  return (
    <div className="flex flex-col gap-6 md:gap-10 w-full max-w-6xl mx-auto py-6">
      
      {/* 1. Processing Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <motion.span 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border",
            isError ? "text-(--color-error) bg-(--color-error)/10 border-(--color-error)/20" :
            isDone ? "text-(--color-success) bg-(--color-success)/10 border-(--color-success)/20" :
            "text-(--color-primary) bg-(--color-primary)/10 border-(--color-primary)/20"
          )}
        >
          {isError ? "Transformation Interrupted" : isDone ? "Transformation Complete" : "AI Transformation in Progress"}
        </motion.span>
        
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {isError ? "Error structuring data." : isDone ? "Import ready for review." : "Structuring your data."}
        </h2>
        <p className="text-(--color-foreground)/60 max-w-lg text-sm md:text-base">
          {isError ? "An error occurred during AI extraction or server validation. You can retry or return to the preview." :
           isDone ? "Your source records have been normalized and validated against the GrowEasy CRM schema. Please review the results." :
           "Your source records are being extracted, normalized, and validated against the GrowEasy CRM schema."}
        </p>
        
        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <button 
                onClick={onComplete}
                className="px-6 py-3 bg-(--color-primary) text-white font-semibold rounded-xl shadow-lg hover:bg-(--color-primary)/90 transition-all flex items-center gap-2"
              >
                Review Results <CheckCircle size={20} weight="fill" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Transformation Field */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-(--color-surface) rounded-2xl border border-(--color-border)/50 shadow-sm flex flex-col relative overflow-hidden min-h-[450px]"
      >
        {/* Error Overlay */}
        <AnimatePresence>
          {isError && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              className="absolute inset-0 bg-(--color-surface)/80 z-30 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-(--color-error)/10 flex items-center justify-center text-(--color-error) border border-(--color-error)/20 mb-6 relative">
                <XCircle size={32} weight="fill" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full border border-(--color-error)"
                />
              </div>
              <h3 className="text-xl font-semibold text-(--color-error) mb-2">Processing Halted</h3>
              <p className="text-sm text-(--color-foreground)/70 max-w-md mb-8">{error}</p>
              
              <div className="flex flex-wrap justify-center gap-3">
                <button 
                  onClick={onCancel}
                  className="px-4 py-2 bg-transparent border border-(--color-border) rounded-lg text-sm font-medium hover:bg-(--color-surface-hover) transition-colors"
                >
                  Start Over
                </button>
                <button 
                  onClick={onBackToPreview}
                  className="px-4 py-2 bg-transparent border border-(--color-border) rounded-lg text-sm font-medium hover:bg-(--color-surface-hover) transition-colors"
                >
                  Back to Preview
                </button>
                <button 
                  onClick={onRetry}
                  disabled={!retryable}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-opacity",
                    retryable ? "bg-(--color-primary) text-white hover:opacity-90" : "bg-(--color-surface-hover) text-(--color-foreground)/40 cursor-not-allowed border border-(--color-border)"
                  )}
                >
                  <ArrowsClockwise size={16} /> Retry Extraction
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top telemetry bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-(--color-border)/30 bg-(--color-surface)/50 z-20">
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono tracking-tight font-semibold">{fileName}</span>
            <span className="text-xs text-(--color-foreground)/50 px-2 py-0.5 rounded bg-(--color-background) border border-(--color-border)/50">
              {progress.total} rows
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-(--color-foreground)/70">
            <Clock size={16} /> <span className="tabular-nums">{elapsed}</span>
          </div>
        </div>

        {/* 3 Zones */}
        <div className="flex flex-col md:flex-row flex-1 p-6 gap-8 z-10 relative">
          
          {/* Animated SVG Path connections (background) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
             <svg width="100%" height="100%" preserveAspectRatio="none">
               <motion.path 
                 d="M 25% 50% Q 35% 50% 40% 50%" 
                 stroke="currentColor" strokeWidth="1" fill="none"
                 className={cn(isError ? "text-(--color-error)/30" : isDone ? "text-(--color-success)/30" : "text-(--color-primary)/30")}
                 strokeDasharray="4 4"
                 animate={!isError && !isDone ? { strokeDashoffset: -20 } : { strokeDashoffset: 0 }}
                 transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
               />
               <motion.path 
                 d="M 60% 50% Q 65% 50% 75% 50%" 
                 stroke="currentColor" strokeWidth="1" fill="none"
                 className={cn(isError ? "text-(--color-error)/30" : isDone ? "text-(--color-success)/30" : "text-(--color-primary)/30")}
                 strokeDasharray="4 4"
                 animate={!isError && !isDone ? { strokeDashoffset: -20 } : { strokeDashoffset: 0 }}
                 transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
               />
             </svg>
          </div>

          {/* Left: Source */}
          <div className="flex flex-col w-full md:w-[25%] z-10">
            <h4 className="text-[10px] uppercase tracking-widest text-(--color-foreground)/50 font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-(--color-border)" /> Source Columns
            </h4>
            <div className="flex flex-col gap-2 relative h-[300px] overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-(--color-surface) to-transparent z-10" />
              <div className="flex flex-col gap-2 relative">
                {headers.length > 0 ? headers.map((h, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    key={i} 
                    className="text-xs font-mono text-(--color-foreground)/80 bg-(--color-background)/50 border border-(--color-border)/50 rounded px-3 py-2 truncate shadow-sm transition-all hover:border-(--color-primary)/50 cursor-default"
                  >
                    {h}
                  </motion.div>
                )) : (
                  <div className="text-xs text-(--color-foreground)/40 italic">No headers found</div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Engine Pipeline */}
          <div className="flex-1 flex flex-col items-center justify-center z-10 py-8 md:py-0 w-full max-w-sm px-4">
             <div className="w-full flex flex-col gap-8">
               
               <div className="relative h-16 w-full flex items-center justify-between">
                 <div className="absolute left-0 right-0 h-[1px] bg-(--color-border)" />
                 
                 {/* Animated data particles */}
                 {!isDone && !isError && (
                   <motion.div 
                     className="absolute w-2 h-2 rounded-full bg-(--color-primary) shadow-[0_0_10px_var(--color-primary)] z-0"
                     initial={{ left: "0%" }}
                     animate={{ left: "100%" }}
                     transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                   />
                 )}
                 
                 {/* Progress Fill Line */}
                 <motion.div 
                   className="absolute left-0 h-[1px] bg-(--color-primary) z-0 shadow-[0_0_10px_var(--color-primary)]"
                   initial={{ width: '0%' }}
                   animate={{ width: `${progress.percentage}%` }}
                   transition={{ duration: 0.5, ease: "easeOut" }}
                 />

                 {/* Node 1: Ingest */}
                 <div className="z-10 bg-(--color-surface) border border-(--color-border) p-3 rounded-xl relative shadow-lg backdrop-blur-sm">
                    <Database weight="fill" className={isDone || progress.percentage > 0 ? "text-(--color-primary)" : "text-(--color-foreground)/40"} />
                 </div>

                 {/* Node 2: AI Process */}
                 <div className="z-10 bg-(--color-surface) border border-(--color-border) p-3 rounded-xl relative shadow-lg backdrop-blur-sm">
                    <Lightning weight="fill" className={!isDone && !isError ? "text-(--color-primary) animate-pulse" : isDone ? "text-(--color-primary)" : "text-(--color-foreground)/40"} />
                 </div>

                 {/* Node 3: Complete */}
                 <div className="z-10 bg-(--color-surface) border border-(--color-border) p-3 rounded-xl relative shadow-lg backdrop-blur-sm">
                    <CheckCircle weight="fill" className={isDone ? "text-(--color-success)" : isError ? "text-(--color-error)" : "text-(--color-foreground)/40"} />
                 </div>
               </div>

               <div className="flex flex-col items-center justify-center mt-2">
                {isDone ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-(--color-success) text-2xl font-mono tracking-widest uppercase">
                    Processed
                  </motion.div>
                ) : isError ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-(--color-error) text-2xl font-mono tracking-widest uppercase">
                    Failed
                  </motion.div>
                ) : (
                  <>
                    <span className="text-6xl font-mono tracking-tighter text-(--color-foreground)">
                      {Math.round(progress.percentage || 0)}<span className="text-2xl text-(--color-foreground)/40 ml-1">%</span>
                    </span>
                    <span className="text-xs font-mono tracking-widest text-(--color-foreground)/50 mt-3 uppercase">
                      {progress.processed} / {progress.total} RECORDS
                    </span>
                  </>
                )}
               </div>
             </div>
          </div>

          {/* Right: CRM Schema */}
          <div className="flex flex-col w-full md:w-[25%] z-10 items-end">
            <h4 className="text-[10px] uppercase tracking-widest text-(--color-foreground)/50 font-bold mb-4 flex items-center justify-end gap-2 w-full">
               Target Schema <span className="w-2 h-2 rounded-full bg-(--color-border)" />
            </h4>
            <div className="flex flex-col gap-1.5 w-full relative h-[300px] overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-(--color-surface) to-transparent z-10" />
              <div className="flex flex-col gap-1.5 items-end pr-1">
                {CRM_FIELDS.map((f, i) => {
                  // Reveal fields gradually based on percentage, full resolution at 100%
                  const threshold = (i / CRM_FIELDS.length) * 100;
                  const isResolved = progress.percentage > threshold || isDone;
                  
                  return (
                    <div 
                      key={f} 
                      className={cn(
                        "text-[11px] font-mono px-3 py-1.5 rounded transition-all duration-700 ease-in-out whitespace-nowrap cursor-default",
                        isResolved 
                          ? "text-(--color-foreground) bg-(--color-background) border border-(--color-border)/50 shadow-sm hover:border-(--color-primary)/50" 
                          : "text-(--color-foreground)/30 bg-transparent border border-transparent"
                      )}
                    >
                      {f}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      </motion.div>

      {/* 3. Progress Timeline */}
      <div className="flex items-center justify-between px-2 md:px-8 relative pt-2">
        <div className="absolute top-1/2 left-8 right-8 h-[1px] bg-(--color-border)/50 -translate-y-1/2 z-0" />
        {TIMELINE_STAGES.map((stage, idx) => {
          // Determine stage state based on derived truth
          let stageState = 'upcoming'; // upcoming, active, done, error
          if (isError) {
             stageState = idx <= 3 ? (idx === 2 || idx === 3 ? 'error' : 'done') : 'upcoming'; // Extraction/validation errored
          } else if (isDone) {
             stageState = 'done';
          } else {
             if (idx === 0) stageState = progress.total > 0 ? 'done' : 'active';
             else if (idx === 1) stageState = batchesTotal > 0 ? 'done' : progress.total > 0 ? 'active' : 'upcoming';
             else if (idx === 2 || idx === 3) stageState = batchesTotal > 0 ? 'active' : 'upcoming';
             else if (idx === 4) stageState = 'upcoming';
          }

          return (
            <div key={idx} className="flex flex-col items-center gap-2 z-10 bg-(--color-background) px-2">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center bg-(--color-background)",
                stageState === 'done' ? "border-(--color-success) text-(--color-success)" :
                stageState === 'active' ? "border-(--color-primary) border-t-transparent animate-spin" :
                stageState === 'error' ? "border-(--color-error) bg-(--color-error)/10" :
                "border-(--color-border)"
              )}>
                {stageState === 'done' && <div className="w-1.5 h-1.5 bg-(--color-success) rounded-full" />}
              </div>
              <span className={cn(
                "text-[9px] uppercase tracking-widest font-semibold hidden md:block transition-colors",
                stageState === 'done' ? "text-(--color-foreground)" :
                stageState === 'active' ? "text-(--color-primary)" :
                stageState === 'error' ? "text-(--color-error)" :
                "text-(--color-foreground)/40"
              )}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Grid: Batches & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Left Col: Batches & Arch */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Batch Activity Strip */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] uppercase tracking-widest text-(--color-foreground)/50 font-bold px-1">Batch Activity</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {batchesTotal === 0 ? (
                <div className="text-xs text-(--color-foreground)/40 italic px-2">Preparing batches...</div>
              ) : (
                Array.from({ length: batchesTotal }).map((_, i) => {
                  let bState = 'queued';
                  if (i < batchesCompleted) bState = 'complete';
                  else if (i === batchesCompleted) bState = isError ? 'error' : isDone ? 'complete' : 'processing';

                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-shrink-0 px-3 py-2 rounded-lg border flex flex-col gap-1 min-w-[100px] transition-colors",
                        bState === "complete" ? "bg-(--color-success-bg) border-(--color-success)/20" :
                        bState === "processing" ? "bg-(--color-primary)/5 border-(--color-primary)/30 shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.1)]" :
                        bState === "error" ? "bg-(--color-error)/5 border-(--color-error)/30" :
                        "bg-(--color-surface) border-(--color-border)/30 opacity-60"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-mono tracking-tight font-bold">B{String(i + 1).padStart(2, '0')}</span>
                        {bState === "complete" && <CheckCircle size={12} className="text-(--color-success)" weight="fill" />}
                        {bState === "processing" && <CircleNotch size={12} className="text-(--color-primary) animate-spin" />}
                        {bState === "error" && <Warning size={12} className="text-(--color-error)" weight="fill" />}
                      </div>
                      <span className={cn(
                        "text-[9px] uppercase tracking-widest font-semibold",
                        bState === "complete" ? "text-(--color-success)" :
                        bState === "processing" ? "text-(--color-primary)" : 
                        bState === "error" ? "text-(--color-error)" :
                        "text-(--color-foreground)/40"
                      )}>
                        {bState}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Architecture Diagram */}
          <div className="bg-(--color-surface)/50 rounded-xl border border-(--color-border)/30 overflow-hidden">
            <button 
              onClick={() => setShowArch(!showArch)}
              className="w-full flex justify-between items-center p-4 hover:bg-(--color-surface-hover) transition-colors text-left"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-(--color-foreground)/70">
                <Lightning size={14} className="text-(--color-primary)" weight="fill" />
                What is happening in the background?
              </div>
              <span className="text-[10px] uppercase font-bold text-(--color-foreground)/40">{showArch ? 'Collapse' : 'Expand'}</span>
            </button>
            <AnimatePresence>
              {showArch && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 overflow-hidden border-t border-(--color-border)/30 pt-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase font-bold text-(--color-foreground)/60 mb-4">
                    <span className="px-2 py-1 bg-(--color-background) rounded border border-(--color-border)/50 hover:border-(--color-primary) transition-colors cursor-help" title="Uploaded file parsed in browser">CSV</span>
                    <span>→</span>
                    <span className="px-2 py-1 bg-(--color-background) rounded border border-(--color-border)/50 hover:border-(--color-primary) transition-colors cursor-help" title="Sent to backend server">Express</span>
                    <span>→</span>
                    <span className="px-2 py-1 bg-(--color-background) rounded border border-(--color-border)/50 hover:border-(--color-primary) transition-colors cursor-help" title="Divided into small manageable chunks">Batch Queue</span>
                    <span>→</span>
                    <span className="px-2 py-1 bg-(--color-primary)/10 text-(--color-primary) rounded border border-(--color-primary)/30 hover:bg-(--color-primary)/20 transition-colors cursor-help" title="AI extracts semantic meaning and shapes data">Gemini AI</span>
                    <span>→</span>
                    <span className="px-2 py-1 bg-(--color-background) rounded border border-(--color-border)/50 hover:border-(--color-primary) transition-colors cursor-help" title="Strict Zod validation enforces types and rules">Validation</span>
                    <span>→</span>
                    <span className="px-2 py-1 bg-(--color-success)/10 text-(--color-success) rounded border border-(--color-success)/30 hover:bg-(--color-success)/20 transition-colors cursor-help" title="Clean records returned to user">Review</span>
                  </div>
                  <p className="text-xs text-(--color-foreground)/60 leading-relaxed max-w-2xl">
                    Records are batched to respect token limits. Gemini AI intelligently maps unstructured columns (like &quot;Mobile 2&quot;) into the CRM schema. The server then strictly validates types and formats (e.g. valid emails, enums), skipping malformed records safely.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Col: Live Event Log */}
        <div className="lg:col-span-1 h-[250px] lg:h-auto">
          <div className="bg-(--color-surface) border border-(--color-border)/50 rounded-xl flex flex-col h-full max-h-[300px]">
             <div className="flex justify-between items-center p-3 border-b border-(--color-border)/30 bg-(--color-background)/50">
               <span className="text-[10px] font-bold uppercase tracking-widest text-(--color-foreground)/50 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-(--color-primary) animate-pulse" /> Process Log
               </span>
               <button onClick={clearLog} className="text-[9px] uppercase font-bold hover:text-(--color-primary) transition-colors text-(--color-foreground)/40 px-2 py-1">Clear View</button>
             </div>
             <div className="p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1">
                {events.map((e, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                     key={events.length - i} 
                     className={cn(
                       "text-[11px] font-mono tracking-tight pb-2 border-b border-(--color-border)/30 last:border-0",
                       e.toLowerCase().includes('fail') || e.toLowerCase().includes('error') ? "text-(--color-error)" :
                       e.toLowerCase().includes('complete') || e.toLowerCase().includes('ready') ? "text-(--color-success)" :
                       e.toLowerCase().includes('retry') ? "text-(--color-warning)" :
                       "text-(--color-foreground)/70"
                     )}
                   >
                     <span className="text-(--color-foreground)/30 mr-2 select-none">&gt;</span> {e}
                   </motion.div>
                ))}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
