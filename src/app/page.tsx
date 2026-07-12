"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadWorkspace } from "@/components/csv/UploadWorkspace";
import { CsvPreviewTable } from "@/components/csv/CsvPreviewTable";
import { ProcessingWorkspace } from "@/components/csv/ProcessingWorkspace";
import { ImportResults } from "@/components/csv/ImportResults";
import { WorkflowIndicator } from "@/components/ui/WorkflowIndicator";
import { motion, AnimatePresence } from "motion/react";
import { SchemaMappingStudio } from "@/components/csv/SchemaMappingStudio";
import { ReviewWorkspace } from "@/components/csv/ReviewWorkspace";
import { CompatibilityPrompt } from "@/components/csv/CompatibilityPrompt";
import { CinematicHome } from "@/components/ui/CinematicHome";
import { PageTransition } from "@/components/ui/PageTransition";
import { ParsedCrmRecord, SkippedRecord, ImportSummary, MappingConfig } from "@/lib/types";

export type AppState = "home" | "upload" | "preview" | "compatibility" | "mapping" | "processing" | "processing-success" | "review" | "completed" | "error";

async function safeFetchJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid or empty JSON response from server.");
  }
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("home");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("Uploaded File");
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [parsedRecords, setParsedRecords] = useState<ParsedCrmRecord[]>([]);
  const [skippedRecords, setSkippedRecords] = useState<SkippedRecord[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary>({ total: 0, imported: 0, skipped: 0 });
  const [compatibilitySuggestions, setCompatibilitySuggestions] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<any>(null);

  const [jobState, setJobState] = useState<{
    status: 'processing' | 'completed' | 'failed';
    progress: { processed: number; total: number; percentage: number };
    batchesCompleted: number;
    batchesTotal: number;
    error: string | null;
    retryable: boolean;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('groweasy_import_state');
      if (stored) {
        const state = JSON.parse(stored);
        if (state.appState && state.appState !== 'home') {
          setAppState(state.appState);
          setFileName(state.fileName || "Uploaded File");
          setHeaders(state.headers || []);
          setData(state.data || []);
          setParsedRecords(state.parsedRecords || []);
          setSkippedRecords(state.skippedRecords || []);
          setImportSummary(state.importSummary || { total: 0, imported: 0, skipped: 0 });
        }
      }
    } catch (e) {
      console.warn("Failed to restore session state", e);
    }
  }, []);

  // Listen for reset events from global header navigation
  useEffect(() => {
    const handleReset = () => {
      setAppState("home");
      setFile(null);
      setFileName("Uploaded File");
      setHeaders([]);
      setData([]);
      setParsedRecords([]);
      setSkippedRecords([]);
      setImportSummary({ total: 0, imported: 0, skipped: 0 });
      setCompatibilitySuggestions([]);
      setSelectedPreset(null);
      setJobState(null);
      setError(null);
    };

    window.addEventListener('groweasy_reset', handleReset);
    return () => window.removeEventListener('groweasy_reset', handleReset);
  }, []);

  // Save to sessionStorage on state change
  useEffect(() => {
    if (appState !== 'home') {
      try {
        sessionStorage.setItem('groweasy_import_state', JSON.stringify({
          appState,
          fileName,
          headers,
          data,
          parsedRecords,
          skippedRecords,
          importSummary
        }));
      } catch (e) {
        // Might fail if data is too large for sessionStorage, silently ignore
      }
    } else {
      sessionStorage.removeItem('groweasy_import_state');
    }
  }, [appState, fileName, headers, data, parsedRecords, skippedRecords, importSummary]);

  const handleFileAccepted = (uploadedFile: File, parsedHeaders: string[], parsedData: Record<string, unknown>[]) => {
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setHeaders(parsedHeaders);
    setData(parsedData);
    setAppState("preview");
    setError(null);
  };

  const handleProceedToMapping = async () => {
    // Privacy-safe public demo: Skip preset suggestions, go directly to mapping
    setAppState("mapping");
  };

  const handleConfirmImport = async (mappingConfig?: MappingConfig) => {
    if (!file) return;
    console.debug("[Frontend] Start import requested for:", file.name);
    setAppState("processing");
    setJobState({
      status: 'processing',
      progress: { processed: 0, total: 0, percentage: 0 },
      batchesCompleted: 0,
      batchesTotal: 0,
      error: null,
      retryable: true
    });
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const formData = new FormData();
    formData.append("file", file);
    if (mappingConfig) {
      formData.append("mappingConfig", JSON.stringify(mappingConfig));
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${baseUrl}/api/imports`, {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      console.debug("[Frontend] Start response received:", response.status);

      if (!response.ok) {
        const errData = await safeFetchJson(response).catch(() => ({}));
        const message = errData?.error?.message || errData?.error || `Server error: ${response.status}`;
        const retryable = errData?.error?.retryable ?? true;
        
        setJobState(prev => prev ? { ...prev, status: 'failed', error: message, retryable } : null);
        throw new Error(message);
      }

      if (response.status === 202) {
        const { jobId } = await safeFetchJson(response);
        console.debug("[Frontend] jobId received:", jobId);
        console.debug("[Frontend] Polling started");
        
        const pollInterval = setInterval(async () => {
          try {
            const pollRes = await fetch(`${baseUrl}/api/imports/${jobId}`, {
              signal: abortControllerRef.current?.signal
            });
            
            if (!pollRes.ok) {
              const errData = await safeFetchJson(pollRes).catch(() => ({}));
              throw new Error(errData?.error?.message || errData?.error || `Server error: ${pollRes.status}`);
            }
            
            const job = await safeFetchJson(pollRes);
            console.debug("[Frontend] Status response:", job.status);
            
            if (job.status === 'processing') {
              setJobState({
                status: 'processing',
                progress: { processed: job.processedRecords, total: job.totalRecords, percentage: job.progress },
                batchesCompleted: job.batchesCompleted || 0,
                batchesTotal: job.batchesTotal || 0,
                error: null,
                retryable: true
              });
            } else if (job.status === 'completed') {
              console.debug("[Frontend] Completed result received, waiting for animation");
              clearInterval(pollInterval);
              setParsedRecords(job.result.parsedRecords || []);
              setSkippedRecords(job.result.skippedRecords || []);
              setImportSummary(job.result.summary || { total: 0, imported: 0, skipped: 0 });
              
              setJobState(prev => ({
                status: 'completed',
                progress: { processed: job.totalRecords, total: job.totalRecords, percentage: 100 },
                batchesCompleted: job.batchesTotal || (prev?.batchesTotal || 0),
                batchesTotal: job.batchesTotal || (prev?.batchesTotal || 0),
                error: null,
                retryable: true
              }));
            } else if (job.status === 'failed') {
              console.debug("[Frontend] Failure transition (backend failed)");
              clearInterval(pollInterval);
              setJobState(prev => prev ? {
                ...prev,
                status: 'failed',
                error: job.error?.message || job.error || "AI processing failed catastrophically.",
                retryable: job.error?.retryable ?? true
              } : null);
            }
          } catch (pollErr: unknown) {
            console.debug("[Frontend] Failure transition (polling failed)");
            clearInterval(pollInterval);
            const errMsg = pollErr instanceof Error ? pollErr.message : "Polling failed";
            if (errMsg.includes('aborted')) return; // Ignore abort errors
            setJobState(prev => prev ? { ...prev, status: 'failed', error: errMsg, retryable: true } : null);
          }
        }, 2000);
        return; // wait for polling to finish
      }

      // Fallback for sync responses
      const result = await safeFetchJson(response);
      setParsedRecords(result.parsedRecords || []);
      setSkippedRecords(result.skippedRecords || []);
      setImportSummary(result.summary || { total: 0, imported: 0, skipped: 0 });
      setAppState("processing-success");
    } catch (err: unknown) {
      console.error("[Frontend] Import start error:", err);
      let errorMessage = "An error occurred during import.";
      if (err instanceof Error) {
        if (err.name === 'AbortError') return; // Ignore aborts
        errorMessage = err.message;
      }
      setError(errorMessage);
      setAppState("error");
    }
  };

  return (
    <div className="mx-auto max-w-7xl w-full p-4 md:p-8 flex flex-col gap-10 pb-20 pt-4 relative">
      {appState !== "home" && (
        <div className="flex justify-center mb-4">
          <WorkflowIndicator currentStage={appState as any} />
        </div>
      )}
      
      <div className="relative w-full flex-1">
        {appState === "home" ? (
          <CinematicHome onStartImport={() => setAppState("upload")} />
        ) : (
          <AnimatePresence mode="wait">
            {appState === "upload" && (
              <PageTransition keyId="upload">
                <UploadWorkspace onFileAccepted={handleFileAccepted} error={error} />
              </PageTransition>
            )}

            {appState === "preview" && (
              <PageTransition keyId="preview">
                <CsvPreviewTable 
                  fileName={file?.name || "Uploaded File"}
                  fileSize={file?.size || 0}
                  headers={headers} 
                  data={data} 
                  onCancel={() => { setAppState("home"); setFile(null); }} 
                  onConfirm={handleProceedToMapping} 
                />
              </PageTransition>
            )}

            {appState === "compatibility" && (
              <PageTransition keyId="compatibility">
                <CompatibilityPrompt 
                  suggestions={compatibilitySuggestions}
                  onSkip={() => setAppState("mapping")}
                  onApply={(preset) => {
                    setSelectedPreset(preset);
                    setAppState("mapping");
                  }}
                />
              </PageTransition>
            )}

            {appState === "mapping" && (
              <PageTransition keyId="mapping">
                <SchemaMappingStudio
                  headers={headers}
                  records={data}
                  onContinue={handleConfirmImport}
                  onBack={() => setAppState("preview")}
                  {...(selectedPreset ? { initialPreset: selectedPreset } : {})}
                />
              </PageTransition>
            )}

            {appState === "processing" && (
              <PageTransition keyId="processing">
                <ProcessingWorkspace 
                  fileName={file?.name || "File"}
                  headers={headers}
                  status={jobState?.status || 'processing'}
                  error={jobState?.error || null}
                  retryable={jobState?.retryable ?? true}
                  progress={jobState?.progress || { processed: 0, total: 0, percentage: 0 }}
                  batchesCompleted={jobState?.batchesCompleted || 0}
                  batchesTotal={jobState?.batchesTotal || 0}
                  onComplete={() => setAppState("processing-success")}
                  onRetry={() => handleConfirmImport()}
                  onCancel={() => { 
                    if (abortControllerRef.current) abortControllerRef.current.abort();
                    setAppState("home"); 
                    setFile(null); 
                    setJobState(null); 
                  }}
                  onBackToPreview={() => { 
                    if (abortControllerRef.current) abortControllerRef.current.abort();
                    setAppState("preview"); 
                    setJobState(null); 
                  }}
                />
              </PageTransition>
            )}

            {appState === "processing-success" && (
              <PageTransition keyId="processing-success">
                <ImportResults 
                  summary={importSummary}
                  parsedRecords={parsedRecords}
                  skippedRecords={skippedRecords}
                  onReset={() => { setAppState("home"); setFile(null); }}
                  onReview={() => setAppState("review")}
                />
              </PageTransition>
            )}

            {appState === "review" && (
              <PageTransition keyId="review">
                <ReviewWorkspace 
                  summary={importSummary}
                  parsedRecords={parsedRecords}
                  skippedRecords={skippedRecords}
                  fileName={fileName}
                  onReset={() => { setAppState("home"); setFile(null); }}
                />
              </PageTransition>
            )}



            {appState === "error" && (
              <PageTransition keyId="error">
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                  <div className="w-16 h-16 rounded-full bg-(--color-error)/10 flex items-center justify-center text-(--color-error) border border-(--color-error)/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"></path>
                    </svg>
                  </div>
                  <div className="text-center max-w-md">
                    <h2 className="text-2xl font-semibold tracking-tight text-(--color-error) mb-2">Import Failed</h2>
                    <p className="text-(--color-foreground)/70 tracking-tight text-sm mb-8">{error || "An unknown error occurred during processing."}</p>
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={() => { 
                          if (abortControllerRef.current) abortControllerRef.current.abort();
                          setAppState("upload"); setFile(null); setError(null); 
                        }} 
                        className="px-4 py-2 bg-(--color-surface) border border-(--color-border) rounded-lg text-sm font-medium hover:bg-(--color-surface-hover) transition-colors"
                      >
                        Start Over
                      </button>
                      <button 
                        onClick={() => {
                          if (abortControllerRef.current) abortControllerRef.current.abort();
                          setAppState("preview");
                        }} 
                        className="px-4 py-2 bg-(--color-primary) text-white rounded-lg text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
                      >
                        Back to Preview
                      </button>
                    </div>
                  </div>
                </div>
              </PageTransition>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
