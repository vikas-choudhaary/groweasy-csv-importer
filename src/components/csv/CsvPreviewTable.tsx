"use client";

import React, { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MagnifyingGlass, Eye, CornersOut, CornersIn, ListDashes, Check, X, Info } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface CsvPreviewTableProps {
  fileName: string;
  fileSize: number;
  headers: string[];
  data: Record<string, unknown>[];
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export function CsvPreviewTable({ fileName, fileSize, headers, data, onCancel, onConfirm, isProcessing }: CsvPreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(headers));
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [inspectedColumn, setInspectedColumn] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // 1. Filtering Logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return data.slice(0, 100);
    const lowerSearch = searchTerm.toLowerCase();
    // Search only across visible columns for performance and logic
    return data.filter(row => {
      return Array.from(visibleColumns).some(col => {
        const val = row[col];
        if (val == null) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    }).slice(0, 100);
  }, [data, searchTerm, visibleColumns]);

  // 2. Virtualizer
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => density === "comfortable" ? 53 : 37,
    overscan: 5,
  });

  // 3. Column Visibility Handlers
  const toggleColumn = (header: string) => {
    const newSet = new Set(visibleColumns);
    if (newSet.has(header)) newSet.delete(header);
    else newSet.add(header);
    setVisibleColumns(newSet);
  };
  const showAllColumns = () => setVisibleColumns(new Set(headers));

  // 4. Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
        setIsFullscreen(true); // Fallback to CSS fullscreen
      });
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 5. Column Inspector Logic
  const getColumnStats = (colName: string) => {
    let emptyCount = 0;
    let nonEmptyCount = 0;
    const samples = new Set<string>();
    
    // Sample from first 100 rows
    const sampleSize = Math.min(100, data.length);
    for (let i = 0; i < sampleSize; i++) {
      const val = data[i][colName];
      if (val === undefined || val === null || String(val).trim() === "") {
        emptyCount++;
      } else {
        nonEmptyCount++;
        if (samples.size < 3) samples.add(String(val));
      }
    }
    return { emptyCount, nonEmptyCount, samples: Array.from(samples) };
  };

  const activeHeaders = headers.filter(h => visibleColumns.has(h));
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "w-full flex flex-col gap-4 bg-(--color-background) transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-[100] p-6 overflow-hidden" : "relative"
      )}
    >
      {/* 1. Header & File Metadata */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-(--color-foreground) flex items-center gap-2">
            Data Preview
            {isFullscreen && (
              <span className="text-[10px] uppercase tracking-widest bg-(--color-primary)/20 text-(--color-primary) px-2 py-0.5 rounded">
                Fullscreen
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-(--color-foreground)/50 tracking-tight">
            <span className="truncate max-w-[200px] text-(--color-foreground)/80" title={fileName}>{fileName}</span>
            <span className="w-1 h-1 rounded-full bg-(--color-border)" />
            <span>{fileSizeMB} MB</span>
            <span className="w-1 h-1 rounded-full bg-(--color-border)" />
            <span>{data.length.toLocaleString()} rows</span>
            <span className="w-1 h-1 rounded-full bg-(--color-border)" />
            <span>{headers.length} columns</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-(--color-surface) p-2 rounded-xl border border-(--color-border)/50 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full md:w-64">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-foreground)/40" size={16} />
          <input 
            type="text" 
            placeholder="Search rows..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-(--color-background) border border-(--color-border)/50 rounded-lg pl-9 pr-8 py-1.5 text-sm outline-none focus:ring-2 focus:ring-(--color-primary)/50 transition-all placeholder:(text-(--color-foreground)/30)"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-foreground)/40 hover:text-(--color-foreground)">
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          
          {/* Column Visibility */}
          <div className="relative">
            <Button 
              variant={visibleColumns.size < headers.length ? "primary" : "ghost"} 
              size="sm" 
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
              className="gap-2 h-9 px-3"
            >
              <Eye size={16} />
              <span className="hidden sm:inline">Columns ({visibleColumns.size}/{headers.length})</span>
            </Button>
            <AnimatePresence>
              {showVisibilityMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowVisibilityMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-11 w-56 bg-(--color-surface) border border-(--color-border) shadow-xl rounded-xl z-50 overflow-hidden flex flex-col"
                  >
                    <div className="p-2 border-b border-(--color-border)/50 flex justify-between items-center bg-(--color-background)/50">
                      <span className="text-xs font-semibold">Toggle Columns</span>
                      <button onClick={showAllColumns} className="text-[10px] uppercase tracking-widest text-(--color-primary) hover:underline font-medium">Reset</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1 flex flex-col gap-0.5">
                      {headers.map(h => (
                        <div key={h} onClick={() => toggleColumn(h)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-(--color-surface-hover) rounded-md cursor-pointer group">
                          <div className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors", visibleColumns.has(h) ? "bg-(--color-primary) border-(--color-primary) text-white" : "border-(--color-border)/80 group-hover:border-(--color-foreground)/40")}>
                            {visibleColumns.has(h) && <Check size={12} weight="bold" />}
                          </div>
                          <span className="text-xs truncate text-(--color-foreground)/80 group-hover:text-(--color-foreground)">{h}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="w-[1px] h-4 bg-(--color-border) mx-1" />

          {/* Density Toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDensity(d => d === "comfortable" ? "compact" : "comfortable")}
            className={cn("gap-2 h-9 px-3", density === "compact" && "bg-(--color-surface-hover)")}
            title="Toggle Density"
          >
            <ListDashes size={16} />
            <span className="hidden sm:inline capitalize">{density}</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleFullscreen}
            className="gap-2 h-9 px-3"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <CornersIn size={16} /> : <CornersOut size={16} />}
          </Button>
        </div>
      </div>

      {/* 3. Table Container */}
      <div className="bg-(--color-surface) rounded-2xl border border-(--color-border)/50 overflow-hidden shadow-sm flex flex-col flex-1 relative min-h-[300px]">
        {filteredData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-(--color-foreground)/40">
            <MagnifyingGlass size={32} className="mb-3 opacity-50" />
            <p className="text-sm font-medium tracking-tight">No rows match your search.</p>
            <button onClick={() => setSearchTerm("")} className="text-xs text-(--color-primary) hover:underline mt-1">Clear search</button>
          </div>
        ) : (
          <div ref={parentRef} className={cn("overflow-auto", isFullscreen ? "h-[calc(100vh-200px)]" : "max-h-[500px]")}>
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-(--color-background) border-b border-(--color-border)/50 sticky top-0 z-20 block">
                <tr className="flex w-full">
                  <th className={cn("px-4 font-semibold text-(--color-foreground)/50 sticky left-0 bg-(--color-background) z-30 border-r border-(--color-border)/20 min-w-[50px] flex items-center justify-center text-[10px] uppercase tracking-widest", density === "compact" ? "py-2" : "py-4")}>
                    #
                  </th>
                  {activeHeaders.map((header) => (
                    <th 
                      key={header} 
                      onClick={() => setInspectedColumn(header)}
                      className={cn(
                        "px-4 font-semibold text-(--color-foreground)/70 min-w-[200px] max-w-[300px] flex items-center gap-2 group cursor-pointer hover:bg-(--color-surface-hover) transition-colors text-xs",
                        density === "compact" ? "py-2" : "py-4",
                        inspectedColumn === header && "bg-(--color-primary)/10 text-(--color-primary)"
                      )}
                    >
                      <span className="truncate flex-1">{header}</span>
                      <Info size={14} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", inspectedColumn === header && "opacity-100")} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)/30 relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const rowIdx = virtualRow.index;
                  const row = filteredData[rowIdx];
                  return (
                    <tr 
                      key={virtualRow.key} 
                      className="absolute w-full transition-colors hover:bg-(--color-surface-hover) flex group"
                      style={{
                        top: 0,
                        left: 0,
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size}px`,
                      }}
                    >
                      <td className="px-4 text-[10px] text-(--color-foreground)/30 font-mono sticky left-0 bg-(--color-surface) group-hover:bg-(--color-surface-hover) z-10 border-r border-(--color-border)/20 flex items-center justify-center min-w-[50px] transition-colors">
                        {rowIdx + 1}
                      </td>
                      {activeHeaders.map((header) => (
                        <td key={header} className="px-4 text-(--color-foreground)/90 tracking-tight flex items-center min-w-[200px] max-w-[300px] truncate text-sm">
                          {row[header] !== undefined && row[header] !== null ? String(row[header]) : (
                            <span className="text-(--color-foreground)/20 text-xs italic">empty</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Column Inspector Popover */}
      <AnimatePresence>
        {inspectedColumn && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-80 bg-(--color-surface) border border-(--color-border) shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-3 border-b border-(--color-border)/50 bg-(--color-background)/50">
              <span className="text-xs font-semibold tracking-tight text-(--color-foreground) truncate pr-4">
                Column: {inspectedColumn}
              </span>
              <button onClick={() => setInspectedColumn(null)} className="text-(--color-foreground)/50 hover:text-(--color-foreground)"><X size={14} /></button>
            </div>
            
            {(() => {
              const stats = getColumnStats(inspectedColumn);
              return (
                <div className="p-4 flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1 flex flex-col p-2 bg-(--color-background) rounded-lg border border-(--color-border)/50">
                      <span className="text-[10px] uppercase tracking-widest text-(--color-foreground)/40 mb-1">Has Data</span>
                      <span className="text-lg font-semibold tabular-nums text-(--color-success)">{stats.nonEmptyCount}</span>
                    </div>
                    <div className="flex-1 flex flex-col p-2 bg-(--color-background) rounded-lg border border-(--color-border)/50">
                      <span className="text-[10px] uppercase tracking-widest text-(--color-foreground)/40 mb-1">Empty</span>
                      <span className="text-lg font-semibold tabular-nums text-(--color-error)">{stats.emptyCount}</span>
                    </div>
                  </div>
                  
                  {stats.samples.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-(--color-foreground)/40 block mb-2">Sample Values</span>
                      <div className="flex flex-col gap-1.5">
                        {stats.samples.map((s, i) => (
                          <div key={i} className="text-xs bg-(--color-background) px-2 py-1 rounded border border-(--color-border)/30 truncate text-(--color-foreground)/80">
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Bottom Action Bar */}
      <div className="flex justify-between items-center bg-(--color-surface) p-3 md:p-4 rounded-xl border border-(--color-border)/50 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={onCancel} disabled={isProcessing} size="sm">
            Change File
          </Button>
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-(--color-foreground)/50">
            <Check size={14} className="text-(--color-success)" />
            <span>File validated</span>
          </div>
        </div>
        
        <div className="text-xs text-(--color-foreground)/40 font-medium tracking-tight hidden lg:block">
          No AI processing has occurred yet.
        </div>

        <Button onClick={onConfirm} disabled={isProcessing} size="sm" className="gap-2 px-6">
          {isProcessing ? "Processing..." : "Confirm & Process"}
        </Button>
      </div>
    </div>
  );
}
