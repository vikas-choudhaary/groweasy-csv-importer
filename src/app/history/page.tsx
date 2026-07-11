"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle, WarningCircle, MagnifyingGlass, Funnel, ArrowClockwise } from "@phosphor-icons/react";
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { DataTimeline } from '@/components/ui/DataTimeline';

interface ImportRecord {
  id: string;
  filename: string;
  rowCount: number;
  successRate: number;
  timestamp: string;
  status: string;
  importedCount: number;
  skippedCount: number;
  processingMode: string;
}

export default function HistoryPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "rows_desc" | "rows_asc">("date_desc");

  useEffect(() => {
    fetch(`${baseUrl}/api/imports`)
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [baseUrl]);

  const handleRetry = (record: ImportRecord) => {
    alert(`To retry importing ${record.filename}, please start a new import and re-upload the file.`);
  };

  const filteredAndSortedHistory = useMemo(() => {
    let result = history.filter(h => {
      const matchSearch = h.filename.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "" || h.status === statusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "date_asc": return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case "date_desc": return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case "rows_asc": return a.rowCount - b.rowCount;
        case "rows_desc": return b.rowCount - a.rowCount;
        default: return 0;
      }
    });

    return result;
  }, [history, searchTerm, statusFilter, sortBy]);

  const uniqueStatuses = Array.from(new Set(history.map(h => h.status).filter(Boolean)));

  // Format data for Recharts (grouping by date)
  const chartData = useMemo(() => {
    // Sort by timestamp asc first to ensure chronologically left-to-right on chart
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let acc: { date: string; rows: number }[] = [];
    for (const curr of sortedHistory) {
      const date = new Date(curr.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const existing = acc.find(a => a.date === date);
      if (existing) {
        existing.rows += curr.rowCount;
      } else {
        acc.push({ date, rows: curr.rowCount });
      }
    }

    if (acc.length === 1) {
      // Recharts needs at least 2 points to draw an area curve
      // We push a dummy point for the previous day
      const d = new Date(sortedHistory[0].timestamp);
      d.setDate(d.getDate() - 1);
      const prevDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      acc.unshift({ date: prevDate, rows: 0 });
    }

    return acc;
  }, [history]);

  const totalImports = history.length;
  const totalRows = history.reduce((acc, curr) => acc + curr.rowCount, 0);
  const avgSuccessRate = history.length ? history.reduce((acc, curr) => acc + curr.successRate, 0) / history.length : 0;

  return (
    <div className="mx-auto max-w-7xl w-full p-4 md:p-8 flex flex-col gap-8 pb-20 pt-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tighter">Import History</h1>
          <p className="text-(--color-foreground)/60 tracking-tight">
            Review your data import velocity and AI accuracy.
          </p>
        </div>
        <Link href="/">
          <Button>Start New Import</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--color-foreground)/60 uppercase tracking-widest">Total Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tracking-tighter tabular-nums">
              {isLoading ? "-" : totalImports}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--color-foreground)/60 uppercase tracking-widest">Rows Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tracking-tighter tabular-nums">
              {isLoading ? "-" : totalRows.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--color-foreground)/60 uppercase tracking-widest">Avg AI Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tracking-tighter tabular-nums flex items-center gap-2">
              {isLoading ? "-" : `${Math.round(avgSuccessRate * 100)}%`}
              {!isLoading && (
                avgSuccessRate >= 0.9 ? 
                  <CheckCircle size={24} weight="fill" className="text-(--color-success)" /> : 
                  <WarningCircle size={24} weight="fill" className="text-(--color-warning)" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="w-full h-full bg-(--color-surface-hover) animate-pulse rounded-lg" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRows" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: "var(--color-foreground)", opacity: 0.5 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: "var(--color-foreground)", opacity: 0.5 }}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)" }}
                    itemStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rows" 
                    stroke="var(--color-primary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRows)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <DataTimeline />
                <span className="text-(--color-foreground)/50 tracking-tight font-mono uppercase text-xs mt-4">
                  No data imports recorded yet.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <CardTitle>Recent Imports</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-56">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-foreground)/40" size={16} />
              <input type="text" placeholder="Search filenames..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-(--color-background) border border-(--color-border)/50 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
            </div>
            
            <div className="relative group">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none bg-(--color-background) border border-(--color-border)/50 rounded-lg pl-8 pr-6 py-1.5 text-sm outline-none w-32 cursor-pointer text-(--color-foreground)/80">
                <option value="">All Statuses</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Funnel className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-foreground)/40 pointer-events-none" size={14} />
            </div>

            <div className="relative group">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="appearance-none bg-(--color-background) border border-(--color-border)/50 rounded-lg px-3 pr-6 py-1.5 text-sm outline-none cursor-pointer text-(--color-foreground)/80">
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="rows_desc">Most Rows</option>
                <option value="rows_asc">Least Rows</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-(--color-background)/30 border-y border-(--color-border)/50">
                <tr>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50">Date</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50">Filename</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50 text-right">Status</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50 text-right">Rows</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50 text-right">Imported</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50 text-right">Success</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest font-semibold text-(--color-foreground)/50 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)/30">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-(--color-surface-hover) rounded animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-48 bg-(--color-surface-hover) rounded animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-12 bg-(--color-surface-hover) rounded animate-pulse ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-(--color-surface-hover) rounded animate-pulse ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-(--color-surface-hover) rounded animate-pulse ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-(--color-surface-hover) rounded animate-pulse ml-auto" /></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))
                ) : filteredAndSortedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-(--color-foreground)/50">
                      No imports match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-(--color-surface-hover) transition-colors border-l-2 border-transparent hover:border-(--color-primary) group">
                      <td className="px-6 py-4 text-(--color-foreground)/60 tracking-tight">
                        {new Date(record.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-medium tracking-tight flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-(--color-primary)">{record.filename}</span>
                          <span className="text-[10px] text-(--color-foreground)/40 uppercase tracking-widest">{record.processingMode || 'GEMINI'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          record.status === 'COMPLETED' ? 'bg-(--color-success)/10 text-(--color-success)' :
                          record.status === 'FAILED' ? 'bg-(--color-error)/10 text-(--color-error)' :
                          'bg-(--color-warning)/10 text-(--color-warning)'
                        }`}>
                          {record.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums tracking-tight text-(--color-foreground)/60">
                        {record.rowCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums tracking-tight font-medium text-(--color-success)">
                        {(record.importedCount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums tracking-tight">
                        <div className="flex items-center justify-end gap-2">
                          {Math.round(record.successRate * 100)}%
                          {record.successRate >= 0.9 ? (
                            <CheckCircle size={16} weight="fill" className="text-(--color-success)" />
                          ) : (
                            <WarningCircle size={16} weight="fill" className="text-(--color-warning)" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {record.status === 'FAILED' && (
                            <button onClick={() => handleRetry(record)} className="text-xs font-medium text-(--color-warning) hover:underline bg-(--color-warning)/10 px-3 py-1.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowClockwise size={12} /> Retry
                            </button>
                          )}
                          <a href={`/history/${record.id}`} className="text-xs font-medium text-(--color-primary) hover:underline bg-(--color-primary)/10 px-3 py-1.5 rounded-full inline-block">
                            View
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
