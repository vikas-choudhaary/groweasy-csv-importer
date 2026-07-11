"use client";

import React, { useRef, useState, useMemo } from "react";
import { CheckCircle, WarningCircle, Checks, MagnifyingGlass, Funnel, ListDashes, CornersOut, CornersIn, DownloadSimple, X, Copy } from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ParsedCrmRecord, SkippedRecord, ImportSummary } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ImportResultsProps {
  summary: ImportSummary;
  parsedRecords: ParsedCrmRecord[];
  skippedRecords: SkippedRecord[];
  onReset: () => void;
  onReview?: () => void;
}

const CRM_FIELDS = [
  "created_at", "name", "email", "country_code", "mobile_without_country_code",
  "company", "city", "state", "country", "lead_owner",
  "crm_status", "crm_note", "data_source", "possession_time", "description"
];

/** Deterministic per-column widths. Applied to both <th> and <td> so header and body always align. */
const COL_WIDTHS: Record<string, number> = {
  _row:                          56,
  created_at:                   190,
  name:                         180,
  email:                        260,
  country_code:                 130,
  mobile_without_country_code:  240,
  company:                      180,
  city:                         150,
  state:                        180,
  country:                      150,
  lead_owner:                   240,
  crm_status:                   220,
  crm_note:                     320,
  data_source:                  200,
  possession_time:              200,
  description:                  320,
};

/** Columns where values should be truncated (long free-text). */
const TRUNCATE_COLS = new Set(["email", "crm_note", "description", "mobile_without_country_code", "lead_owner"]);

/** Total min-width of the table: sum of all column widths */
const TABLE_MIN_WIDTH = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

export function ImportResults({ summary, parsedRecords, skippedRecords, onReset, onReview }: ImportResultsProps) {
  const [activeTab, setActiveTab] = useState<"imported" | "skipped">("imported");
  
  // Imported Table State
  const [importedSearch, setImportedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [importedDensity, setImportedDensity] = useState<"comfortable" | "compact">("comfortable");
  const [importedFullscreen, setImportedFullscreen] = useState(false);
  
  // Skipped Table State
  const [skippedSearch, setSkippedSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [skippedDensity, setSkippedDensity] = useState<"comfortable" | "compact">("comfortable");
  
  // Row Inspector State
  const [inspectedRecord, setInspectedRecord] = useState<ParsedCrmRecord | null>(null);
  const [inspectedSkipped, setInspectedSkipped] = useState<SkippedRecord | null>(null);

  const importedContainerRef = useRef<HTMLDivElement>(null);
  const parsedParentRef = useRef<HTMLDivElement>(null);
  const skippedParentRef = useRef<HTMLDivElement>(null);

  const successRate = summary.total > 0 ? Math.round((summary.imported / summary.total) * 100) : 0;

  // Derived filters
  const uniqueStatuses = useMemo(() => Array.from(new Set(parsedRecords.map(r => r.crm_status).filter(Boolean))), [parsedRecords]);
  const uniqueSources = useMemo(() => Array.from(new Set(parsedRecords.map(r => r.data_source).filter(Boolean))), [parsedRecords]);
  const uniqueReasons = useMemo(() => Array.from(new Set(skippedRecords.map(r => r.reason).filter(Boolean))), [skippedRecords]);

  // Filter Logic
  const filteredImported = useMemo(() => {
    return parsedRecords.filter(r => {
      const matchSearch = importedSearch === "" || Object.values(r).some(v => String(v).toLowerCase().includes(importedSearch.toLowerCase()));
      const matchStatus = statusFilter === "" || r.crm_status === statusFilter;
      const matchSource = sourceFilter === "" || r.data_source === sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }, [parsedRecords, importedSearch, statusFilter, sourceFilter]);

  const filteredSkipped = useMemo(() => {
    return skippedRecords.filter(r => {
      const searchStr = skippedSearch.toLowerCase();
      const matchSearch = skippedSearch === "" || r.reason.toLowerCase().includes(searchStr) || JSON.stringify(r.originalRecord).toLowerCase().includes(searchStr);
      const matchReason = reasonFilter === "" || r.reason === reasonFilter;
      return matchSearch && matchReason;
    });
  }, [skippedRecords, skippedSearch, reasonFilter]);

  // Virtualizers
  // eslint-disable-next-line react-hooks/incompatible-library
  const parsedVirtualizer = useVirtualizer({
    count: filteredImported.length,
    getScrollElement: () => parsedParentRef.current,
    estimateSize: () => importedDensity === "comfortable" ? 53 : 37,
    overscan: 5,
  });

  const skippedVirtualizer = useVirtualizer({
    count: filteredSkipped.length,
    getScrollElement: () => skippedParentRef.current,
    estimateSize: () => skippedDensity === "comfortable" ? 53 : 37,
    overscan: 5,
  });

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      importedContainerRef.current?.requestFullscreen().catch(() => setImportedFullscreen(true));
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => setImportedFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // CSV Exports
  const downloadImportedCsv = () => {
    if (parsedRecords.length === 0) return;
    const headerRow = CRM_FIELDS.join(",");
    const rows = parsedRecords.map(r => CRM_FIELDS.map(f => {
      const val = r[f as keyof ParsedCrmRecord] ?? "";
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(","));
    triggerDownload([headerRow, ...rows].join("\n"), "imported_records.csv");
  };

  const downloadSkippedCsv = () => {
    if (skippedRecords.length === 0) return;
    const headerRow = "SourceRowIndex,Reason,OriginalData";
    const rows = skippedRecords.map(r => {
      const escapedReason = r.reason.replace(/"/g, '""');
      const escapedData = JSON.stringify(r.originalRecord).replace(/"/g, '""');
      return `${r.sourceRowIndex},"${escapedReason}","${escapedData}"`;
    });
    triggerDownload([headerRow, ...rows].join("\n"), "skipped_records.csv");
  };

  const triggerDownload = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full flex flex-col gap-8">
      
      {/* 1. Summary Area */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
        <div className="flex justify-between items-end border-b border-(--color-border)/50 pb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-(--color-foreground) mb-1 flex items-center gap-2">
              <CheckCircle size={28} className="text-(--color-success)" weight="fill" />
              Review Import Results
            </h2>
            <p className="text-sm text-(--color-foreground)/60 tracking-tight">
              Data successfully processed and aligned with CRM constraints.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onReset} variant="outline" size="sm" className="hidden md:flex">Import Another File</Button>
            {onReview && (
              <Button onClick={onReview} variant="primary" size="sm" className="hidden md:flex">Review Results</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-(--color-surface)/50 rounded-xl border border-(--color-border)/30 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-medium text-(--color-foreground)/50">Total Processed</span>
            <span className="text-3xl font-semibold tabular-nums tracking-tight">{summary.total.toLocaleString()}</span>
          </div>
          <div className="p-4 bg-(--color-success-bg) rounded-xl border border-(--color-success)/20 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-medium text-(--color-success)">Successfully Imported</span>
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-(--color-success)">{summary.imported.toLocaleString()}</span>
          </div>
          <div className="p-4 bg-(--color-error-bg) rounded-xl border border-(--color-error)/20 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-medium text-(--color-error)">Skipped Records</span>
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-(--color-error)">{summary.skipped.toLocaleString()}</span>
          </div>
          <div className="p-4 bg-(--color-surface)/50 rounded-xl border border-(--color-border)/30 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-medium text-(--color-foreground)/50">Success Rate</span>
            <span className="text-3xl font-semibold tabular-nums tracking-tight">{successRate}%</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Tabs */}
      <div className="flex border-b border-(--color-border)/50 gap-6">
        <button 
          onClick={() => setActiveTab("imported")}
          className={cn(
            "pb-3 text-sm font-semibold tracking-tight transition-all relative flex items-center gap-2",
            activeTab === "imported" ? "text-(--color-foreground)" : "text-(--color-foreground)/40 hover:text-(--color-foreground)/70"
          )}
        >
          <Checks size={18} weight={activeTab === "imported" ? "fill" : "regular"} />
          Imported ({summary.imported})
          {activeTab === "imported" && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-(--color-primary) rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab("skipped")}
          className={cn(
            "pb-3 text-sm font-semibold tracking-tight transition-all relative flex items-center gap-2",
            activeTab === "skipped" ? "text-(--color-error)" : "text-(--color-foreground)/40 hover:text-(--color-foreground)/70"
          )}
        >
          <WarningCircle size={18} weight={activeTab === "skipped" ? "fill" : "regular"} />
          Skipped ({summary.skipped})
          {activeTab === "skipped" && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-(--color-error) rounded-t-full" />}
        </button>
      </div>

      {/* 3. Table Workspaces */}
      <AnimatePresence mode="wait">
        {activeTab === "imported" && (
          <motion.div key="imported" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 justify-between bg-(--color-surface) p-2 rounded-xl border border-(--color-border)/50 shadow-sm">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-56">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-foreground)/40" size={16} />
                  <input type="text" placeholder="Search records..." value={importedSearch} onChange={(e) => setImportedSearch(e.target.value)} className="w-full bg-(--color-background) border border-(--color-border)/50 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
                </div>
                
                <div className="relative group">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none bg-(--color-background) border border-(--color-border)/50 rounded-lg pl-8 pr-6 py-1.5 text-sm outline-none w-32 cursor-pointer text-(--color-foreground)/80">
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
                  </select>
                  <Funnel className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-foreground)/40 pointer-events-none" size={14} />
                </div>
                
                <div className="relative group">
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="appearance-none bg-(--color-background) border border-(--color-border)/50 rounded-lg pl-8 pr-6 py-1.5 text-sm outline-none w-36 cursor-pointer text-(--color-foreground)/80">
                    <option value="">All Sources</option>
                    {uniqueSources.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
                  </select>
                  <Funnel className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-foreground)/40 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
                <Button variant="ghost" size="sm" onClick={() => setImportedDensity(d => d === "comfortable" ? "compact" : "comfortable")} className="h-9 px-3 gap-2" title="Toggle Density">
                  <ListDashes size={16} />
                  <span className="hidden lg:inline capitalize">{importedDensity}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-9 px-3 gap-2" title="Fullscreen">
                  {importedFullscreen ? <CornersIn size={16} /> : <CornersOut size={16} />}
                </Button>
                <div className="w-[1px] h-4 bg-(--color-border) mx-1 hidden md:block" />
                <Button variant="primary" size="sm" onClick={downloadImportedCsv} className="h-9 px-3 gap-2">
                  <DownloadSimple size={16} />
                  <span className="hidden md:inline">Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Table */}
            <div ref={importedContainerRef} className={cn("bg-(--color-surface) rounded-2xl border border-(--color-border)/50 overflow-hidden shadow-sm flex flex-col flex-1 relative transition-all duration-300", importedFullscreen ? "fixed inset-0 z-[100] p-6" : "")}>
              <div ref={parsedParentRef} className={cn("overflow-auto", importedFullscreen ? "h-[calc(100vh-80px)]" : "max-h-[500px]")}>
                {filteredImported.length === 0 ? (
                  <div className="p-12 text-center text-(--color-foreground)/50 text-sm">No records match your filters.</div>
                ) : (
                  <table className="text-left text-sm" style={{ minWidth: TABLE_MIN_WIDTH, tableLayout: 'fixed', width: '100%' }}>
                    <thead className="bg-(--color-background) border-b border-(--color-border)/50 sticky top-0 z-10 block" style={{ minWidth: TABLE_MIN_WIDTH }}>
                      <tr className="flex w-full" style={{ minWidth: TABLE_MIN_WIDTH }}>
                        <th
                          className={cn("px-4 font-semibold text-(--color-foreground)/50 sticky left-0 bg-(--color-background) z-20 border-r border-(--color-border)/20 flex items-center justify-center text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap", importedDensity === "compact" ? "py-2" : "py-4")}
                          style={{ width: COL_WIDTHS._row, minWidth: COL_WIDTHS._row }}
                        >
                          #
                        </th>
                        {CRM_FIELDS.map((field) => (
                          <th
                            key={field}
                            className={cn("px-4 font-semibold text-(--color-foreground)/70 flex items-center text-xs uppercase tracking-widest shrink-0 whitespace-nowrap overflow-hidden", importedDensity === "compact" ? "py-2" : "py-4")}
                            style={{ width: COL_WIDTHS[field], minWidth: COL_WIDTHS[field] }}
                          >
                            <span className="truncate">{field}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--color-border)/30 relative" style={{ height: `${parsedVirtualizer.getTotalSize()}px`, minWidth: TABLE_MIN_WIDTH }}>
                      {parsedVirtualizer.getVirtualItems().map((virtualRow) => {
                        const rowIdx = virtualRow.index;
                        const record = filteredImported[rowIdx];
                        return (
                          <tr
                            key={virtualRow.key}
                            onClick={() => setInspectedRecord(record)}
                            className="absolute flex cursor-pointer group transition-colors hover:bg-(--color-surface-hover)"
                            style={{ top: 0, left: 0, transform: `translateY(${virtualRow.start}px)`, height: `${virtualRow.size}px`, width: '100%', minWidth: TABLE_MIN_WIDTH }}
                          >
                            <td
                              className="px-4 text-[10px] text-(--color-foreground)/40 font-mono sticky left-0 bg-(--color-surface) group-hover:bg-(--color-surface-hover) z-10 border-r border-(--color-border)/20 flex items-center justify-center transition-colors shrink-0"
                              style={{ width: COL_WIDTHS._row, minWidth: COL_WIDTHS._row }}
                            >
                              {rowIdx + 1}
                            </td>
                            {CRM_FIELDS.map((field) => {
                              const raw = record[field as keyof ParsedCrmRecord];
                              const display = raw != null ? String(raw) : null;
                              const truncate = TRUNCATE_COLS.has(field);
                              return (
                                <td
                                  key={field}
                                  className="px-4 text-(--color-foreground)/90 tracking-tight flex items-center text-sm shrink-0 overflow-hidden"
                                  style={{ width: COL_WIDTHS[field], minWidth: COL_WIDTHS[field] }}
                                  title={display ?? undefined}
                                >
                                  {display != null
                                    ? <span className={truncate ? "truncate block w-full" : "whitespace-nowrap"}>{display}</span>
                                    : <span className="text-(--color-foreground)/20 text-xs italic">empty</span>
                                  }
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "skipped" && (
          <motion.div key="skipped" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            
            {/* Toolbar Skipped */}
            <div className="flex flex-col md:flex-row gap-3 justify-between bg-(--color-error-bg)/50 p-2 rounded-xl border border-(--color-error)/30 shadow-sm">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-56">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-error)/50" size={16} />
                  <input type="text" placeholder="Search skips..." value={skippedSearch} onChange={(e) => setSkippedSearch(e.target.value)} className="w-full bg-(--color-background) border border-(--color-error)/30 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-(--color-error)/50 text-(--color-error)" />
                </div>
                
                <div className="relative group">
                  <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="appearance-none bg-(--color-background) border border-(--color-error)/30 rounded-lg pl-8 pr-6 py-1.5 text-sm outline-none w-32 cursor-pointer text-(--color-error)">
                    <option value="">All Reasons</option>
                    {uniqueReasons.map(r => <option key={String(r)} value={String(r)}>{String(r).slice(0, 20)}...</option>)}
                  </select>
                  <Funnel className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-error)/50 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
                <Button variant="ghost" size="sm" onClick={() => setSkippedDensity(d => d === "comfortable" ? "compact" : "comfortable")} className="h-9 px-3 gap-2 text-(--color-error) hover:bg-(--color-error)/10">
                  <ListDashes size={16} />
                </Button>
                <Button variant="danger" size="sm" onClick={downloadSkippedCsv} className="h-9 px-3 gap-2">
                  <DownloadSimple size={16} />
                  <span className="hidden md:inline">Export Skipped</span>
                </Button>
              </div>
            </div>

            {/* Skipped Table */}
            <div className="bg-(--color-error-bg) rounded-2xl border border-(--color-error)/20 overflow-hidden shadow-sm flex flex-col relative">
              <div ref={skippedParentRef} className="overflow-auto max-h-[500px]">
                {filteredSkipped.length === 0 ? (
                  <div className="p-12 text-center text-(--color-error)/50 text-sm">No skipped records match filters.</div>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                    <thead className="bg-(--color-error)/10 border-b border-(--color-error)/20 sticky top-0 z-10 block">
                      <tr className="flex w-full">
                        <th className={cn("px-4 font-semibold text-(--color-error)/70 min-w-[80px] flex items-center text-[10px] uppercase tracking-widest", skippedDensity === "compact" ? "py-2" : "py-4")}>Row</th>
                        <th className={cn("px-4 font-semibold text-(--color-error)/70 min-w-[300px] flex items-center text-xs uppercase tracking-widest", skippedDensity === "compact" ? "py-2" : "py-4")}>Reason</th>
                        <th className={cn("px-4 font-semibold text-(--color-error)/70 flex-1 flex items-center text-xs uppercase tracking-widest", skippedDensity === "compact" ? "py-2" : "py-4")}>Original Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--color-error)/20 relative" style={{ height: `${skippedVirtualizer.getTotalSize()}px` }}>
                      {skippedVirtualizer.getVirtualItems().map((virtualRow) => {
                        const idx = virtualRow.index;
                        const skip = filteredSkipped[idx];
                        return (
                          <tr 
                            key={virtualRow.key} 
                            onClick={() => setInspectedSkipped(skip)}
                            className="absolute w-full transition-colors hover:bg-(--color-error)/10 flex cursor-pointer"
                            style={{ top: 0, left: 0, transform: `translateY(${virtualRow.start}px)`, height: `${virtualRow.size}px` }}
                          >
                            <td className="px-4 text-xs font-mono text-(--color-error)/80 min-w-[80px] flex items-center">{skip.sourceRowIndex}</td>
                            <td className="px-4 text-sm font-medium text-(--color-error) min-w-[300px] flex items-center truncate">{skip.reason}</td>
                            <td className="px-4 text-xs text-(--color-error)/70 truncate flex-1 flex items-center">{JSON.stringify(skip.originalRecord)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Row Inspector Sheets */}
      <AnimatePresence>
        {(inspectedRecord || inspectedSkipped) && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setInspectedRecord(null); setInspectedSkipped(null); }} />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative w-full max-w-md bg-(--color-surface) border-l border-(--color-border) h-full flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-(--color-border)/50 flex justify-between items-center bg-(--color-background)">
                <h3 className="font-semibold tracking-tight">Record Inspector</h3>
                <Button variant="ghost" size="sm" className="px-2" onClick={() => { setInspectedRecord(null); setInspectedSkipped(null); }}><X size={18} /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                
                {inspectedRecord && (
                  <>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1 gap-2" onClick={() => copyToClipboard(JSON.stringify(inspectedRecord, null, 2))}>
                        <Copy size={14} /> Copy JSON
                      </Button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <h4 className="text-[10px] uppercase tracking-widest text-(--color-foreground)/40 font-medium">Mapped CRM Fields</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {CRM_FIELDS.map(f => {
                          const val = inspectedRecord[f as keyof ParsedCrmRecord];
                          return (
                            <div key={f} className="flex flex-col p-2 bg-(--color-background) rounded-lg border border-(--color-border)/30">
                              <span className="text-[10px] text-(--color-foreground)/50 font-mono mb-1">{f}</span>
                              <span className="text-sm font-medium break-words">{val != null ? String(val) : <span className="italic opacity-30">null</span>}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {inspectedSkipped && (
                  <>
                    <div className="p-3 bg-(--color-error-bg) border border-(--color-error)/30 rounded-lg flex flex-col gap-1 text-(--color-error)">
                      <span className="text-[10px] uppercase tracking-widest font-medium opacity-70">Row {inspectedSkipped.sourceRowIndex} Skip Reason</span>
                      <span className="text-sm font-medium">{inspectedSkipped.reason}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <h4 className="text-[10px] uppercase tracking-widest text-(--color-foreground)/40 font-medium">Original CSV Data Snapshot</h4>
                      <pre className="bg-(--color-background) p-3 rounded-lg border border-(--color-border)/30 text-xs text-(--color-foreground)/70 overflow-x-auto font-mono">
                        {JSON.stringify(inspectedSkipped.originalRecord, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
