"use client";

import { motion } from "motion/react";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button } from "@/components/ui/Button";
import { DownloadSimple, Lightning, Table, ShieldCheck, ArrowsMerge } from "@phosphor-icons/react";

interface UploadWorkspaceProps {
  onFileAccepted: (file: File, headers: string[], data: Record<string, unknown>[]) => void;
  error: string | null;
}

export function UploadWorkspace({ onFileAccepted, error }: UploadWorkspaceProps) {
  
  const handleDownloadTestCsv = () => {
    const csvContent = 
`Lead Full Name,Contact Mail,WhatsApp No,Mobile 2,Campaign,Sales Person,Remarks,Lead Stage,Created On,Organisation,Location
John Doe,john.doe@example.com,9876543210,,Summer Sale,Alice,Interested in plots,NEW,2023-01-15,Acme Corp,Bangalore
Jane Smith,jane@test.com,,+91-9998887776,Winter Promo,Bob,Wants site visit,CONTACTED,12/05/2023,,Mumbai
Messy Row,,9999999999,8888888888,,,Duplicate phones,INVALID,01-01-2022,,
`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "messy-test-leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-16 w-full max-w-5xl mx-auto mt-8">
      {/* Intro Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
      >
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Ingest Data</h1>
          <p className="text-lg text-(--color-foreground)/50 tracking-tight leading-relaxed max-w-2xl">
            Upload messy exports from any source. Our AI normalizes the schema and maps it to the CRM.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTestCsv} className="shrink-0 gap-2 border-(--color-border) bg-(--color-surface) text-(--color-foreground)/80 hover:bg-(--color-surface-hover)">
          <DownloadSimple size={16} />
          Download Test CSV
        </Button>
      </motion.div>

      {/* Upload Workbench */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-mono tracking-widest uppercase text-(--color-primary)">Upload Payload</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-(--color-foreground)/40">
            <span>CSV files only</span>
            <span>Max 50MB</span>
          </div>
        </div>
        
        <FileUpload onFileAccepted={onFileAccepted} maxSizeMB={50} />
        
        <div className="mt-3 px-3 py-2 bg-[#9b87f5]/5 border border-[#9b87f5]/20 rounded-lg text-xs text-(--color-foreground)/60 tracking-tight">
          <strong className="text-[#9b87f5]">Privacy Notice:</strong> Uploaded CSV data is processed only for the current import workflow. Data is sent to Google Gemini AI for field extraction. Do not upload highly sensitive personal information to this public demonstration application.
        </div>
        
        {error && (
          <div className="mt-4 text-center text-(--color-error) text-sm font-medium bg-(--color-error)/10 p-4 rounded-xl border border-(--color-error)/20 tracking-tight backdrop-blur-sm">
            {error}
          </div>
        )}
      </motion.div>

      {/* Capability Rail */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="flex items-center gap-4 p-4 bg-(--color-surface) rounded-lg border border-(--color-border) backdrop-blur-sm">
          <div className="text-(--color-primary)"><Table size={20} weight="fill" /></div>
          <span className="text-xs font-mono tracking-wider uppercase text-(--color-foreground)/70">Arbitrary Schema</span>
        </div>
        <div className="flex items-center gap-4 p-4 bg-(--color-surface) rounded-lg border border-(--color-border) backdrop-blur-sm">
          <div className="text-(--color-primary)"><Lightning size={20} weight="fill" /></div>
          <span className="text-xs font-mono tracking-wider uppercase text-(--color-foreground)/70">Gemini Parsing</span>
        </div>
        <div className="flex items-center gap-4 p-4 bg-(--color-surface) rounded-lg border border-(--color-border) backdrop-blur-sm">
          <div className="text-(--color-primary)"><ArrowsMerge size={20} weight="fill" /></div>
          <span className="text-xs font-mono tracking-wider uppercase text-(--color-foreground)/70">Batch Processing</span>
        </div>
        <div className="flex items-center gap-4 p-4 bg-(--color-surface) rounded-lg border border-(--color-border) backdrop-blur-sm">
          <div className="text-(--color-primary)"><ShieldCheck size={20} weight="fill" /></div>
          <span className="text-xs font-mono tracking-wider uppercase text-(--color-foreground)/70">Type Validation</span>
        </div>
      </motion.div>

    </div>
  );
}
