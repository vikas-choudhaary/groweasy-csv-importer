"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, CheckCircle, Warning, MagnifyingGlass, Funnel, User, EnvelopeSimple, Phone, Briefcase, MapPin, Download, ArrowLeft } from "@phosphor-icons/react";
import { ParsedCrmRecord } from "@/lib/types";

interface HistoricalImport {
  id: string;
  filename: string;
  rowCount: number;
  successRate: number;
  timestamp: string;
}

export function HistoricalImports() {
  const [imports, setImports] = useState<HistoricalImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImport, setSelectedImport] = useState<HistoricalImport | null>(null);
  const [leads, setLeads] = useState<ParsedCrmRecord[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/imports`);
      const data = await res.json();
      if (data.success) {
        setImports(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch historical imports", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async (id: string) => {
    setLeadsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/imports/${id}/leads`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch leads", e);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleSelectImport = (imp: HistoricalImport) => {
    setSelectedImport(imp);
    fetchLeads(imp.id);
  };

  const handleExportCsv = () => {
    if (!selectedImport || leads.length === 0) return;
    const headers = ['name', 'email', 'country_code', 'mobile_without_country_code', 'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 'crm_note', 'data_source', 'possession_time', 'description', 'created_at'];
    const csvRows = [headers.join(',')];
    
    for (const record of leads) {
      const row = headers.map(h => {
        const val = (record as any)[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imported_${selectedImport.filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-(--color-foreground)/50">
        <div className="w-8 h-8 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin mb-4" />
        <p>Loading your past imports...</p>
      </div>
    );
  }

  if (selectedImport) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col gap-6 w-full max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-4 border-b border-(--color-border) pb-4 mt-8">
          <button 
            onClick={() => setSelectedImport(null)}
            className="p-2 hover:bg-(--color-surface-hover) rounded-full transition-colors text-(--color-foreground)/60 hover:text-(--color-foreground)"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight">{selectedImport.filename}</h2>
            <p className="text-sm text-(--color-foreground)/50">{new Date(selectedImport.timestamp).toLocaleString()} &bull; {leads.length} Records Imported</p>
          </div>
          <div className="ml-auto">
            <button onClick={handleExportCsv} className="px-4 py-2 bg-(--color-primary) text-white text-sm font-medium rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {leadsLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden mt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-(--color-surface-hover) text-(--color-foreground)/70 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Phone</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Company</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">City</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-border)">
                  {leads.slice(0, 100).map((record, idx) => (
                    <tr key={idx} className="hover:bg-(--color-surface-hover)/50 transition-colors">
                      <td className="px-4 py-3 text-(--color-foreground) font-medium">{record.name || '-'}</td>
                      <td className="px-4 py-3 text-(--color-foreground)/80">{record.email || '-'}</td>
                      <td className="px-4 py-3 text-(--color-foreground)/80">{record.mobile_without_country_code ? `${record.country_code || ''} ${record.mobile_without_country_code}` : '-'}</td>
                      <td className="px-4 py-3 text-(--color-foreground)/80">{record.company || '-'}</td>
                      <td className="px-4 py-3 text-(--color-foreground)/80">{record.city || '-'}</td>
                      <td className="px-4 py-3 text-(--color-foreground)/80">
                        {record.crm_status ? (
                          <span className="px-2 py-0.5 bg-(--color-primary)/10 text-(--color-primary) rounded text-[10px] font-semibold">{record.crm_status}</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-(--color-foreground)/50">No records found.</td></tr>
                  )}
                </tbody>
              </table>
              {leads.length > 100 && (
                 <div className="p-3 text-center text-xs text-(--color-foreground)/50 bg-(--color-surface-hover)">
                    Showing first 100 records. Export to view all.
                 </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  const filteredImports = imports.filter(i => i.filename.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-(--color-foreground)">Import History</h2>
        <p className="text-(--color-foreground)/70">View past imports and inspect their processed leads.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-foreground)/40" />
          <input 
            type="text" 
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-(--color-surface) border border-(--color-border) rounded-lg text-sm focus:outline-hidden focus:border-(--color-primary) transition-colors"
          />
        </div>
      </div>

      {filteredImports.length === 0 ? (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl flex flex-col items-center justify-center p-16 text-center">
          <Clock size={48} className="text-(--color-foreground)/20 mb-4" />
          <h3 className="text-lg font-medium text-(--color-foreground) mb-1">No imports found</h3>
          <p className="text-sm text-(--color-foreground)/60">You haven't run any successful imports yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredImports.map((imp) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={imp.id}
              onClick={() => handleSelectImport(imp)}
              className="bg-(--color-surface) hover:bg-(--color-surface-hover) border border-(--color-border) rounded-xl p-5 cursor-pointer transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group relative overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center shrink-0">
                  <CheckCircle size={20} weight="fill" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-(--color-foreground) truncate max-w-[200px] sm:max-w-[300px]" title={imp.filename}>{imp.filename}</span>
                  <span className="text-xs text-(--color-foreground)/50">{new Date(imp.timestamp).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-8 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-(--color-foreground)/50 font-medium">Rows</span>
                  <span className="text-sm font-medium">{imp.rowCount}</span>
                </div>
                
                <div className="flex flex-col flex-1 sm:w-32">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-(--color-foreground)/50 font-medium">Success</span>
                    <span className="text-xs font-semibold text-(--color-success)">{imp.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-(--color-border) rounded-full overflow-hidden">
                    <div className="h-full bg-(--color-success) rounded-full" style={{ width: `${imp.successRate}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
