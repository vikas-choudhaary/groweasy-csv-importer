"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UploadSimple, WarningCircle, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface FileUploadProps {
  onFileAccepted: (file: File, headers: string[], sampleData: Record<string, unknown>[]) => void;
  maxSizeMB?: number;
}

export function FileUpload({ onFileAccepted, maxSizeMB = 50 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback((file: File) => {
    setError(null);
    
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Invalid format. Please upload a CSV file.");
      return;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setIsProcessing(true);

    let rowCount = 0;
    const MAX_PREVIEW_ROWS = 100;
    const previewData: Record<string, unknown>[] = [];
    let headers: string[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      step: (row, parser) => {
        if (rowCount === 0) {
          headers = row.meta.fields || [];
        }
        
        if (rowCount < MAX_PREVIEW_ROWS) {
          previewData.push(row.data as Record<string, unknown>);
          rowCount++;
        } else {
          parser.abort(); // Stop reading after we have enough for preview
        }
      },
      complete: (results) => {
        setIsProcessing(false);
        if (results.errors.length > 0 && results.errors[0].type === "Delimiter") {
           setError("Failed to parse CSV. Ensure it is properly formatted.");
           return;
        }
        
        if (headers.length === 0) {
          setError("No headers found in the CSV.");
          return;
        }

        if (previewData.length === 0) {
          setError("CSV file contains headers but no data rows.");
          return;
        }

        onFileAccepted(file, headers, previewData);
      },
      error: (err) => {
        setIsProcessing(false);
        setError(`Error reading file: ${err.message}`);
      }
    });
  }, [maxSizeMB, onFileAccepted]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <motion.div
        animate={{ 
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? "var(--color-primary)" : "var(--color-border)"
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer overflow-hidden group",
          isDragging ? "bg-(--color-primary)/5" : "bg-(--color-surface) hover:bg-(--color-surface-hover)"
        )}
      >
        <input 
          type="file" 
          accept=".csv,text/csv" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          disabled={isProcessing}
        />
        
        <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="bg-(--color-background) p-4 rounded-full shadow-sm mb-5 border border-(--color-border)/50 group-hover:shadow-md transition-shadow"
        >
          <UploadSimple size={28} className="text-(--color-primary)" weight="duotone" />
        </motion.div>
        
        <h3 className="text-lg font-semibold tracking-tight text-(--color-foreground) mb-1.5">
          Select a CSV file to import
        </h3>
        <p className="text-sm text-(--color-foreground)/50 max-w-[260px] tracking-tight leading-relaxed">
          Drag and drop your data export here, or click to browse files up to {maxSizeMB}MB.
        </p>
        
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-(--color-surface)/80 backdrop-blur-sm flex flex-col items-center justify-center z-20"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <div className="w-8 h-8 border-2 border-(--color-primary)/20 border-t-(--color-primary) rounded-full" />
              </motion.div>
              <span className="mt-4 text-sm font-medium tracking-tight">Reading file structure...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-(--color-error-bg) border border-(--color-error)/20 text-(--color-error) p-4 rounded-xl flex items-start gap-3 mt-2">
              <WarningCircle size={20} weight="fill" className="shrink-0 mt-0.5 text-(--color-error)" />
              <div className="flex-1 text-sm font-medium tracking-tight leading-relaxed">{error}</div>
              <button onClick={() => setError(null)} className="text-(--color-error)/60 hover:text-(--color-error) transition-colors">
                <X size={16} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
