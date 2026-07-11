"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Warning, Trash, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ReviewWorkspace } from '@/components/csv/ReviewWorkspace';

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [importData, setImportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImport = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/imports/${id}/detail`);
        const data = await res.json();
        
        if (data.success) {
          setImportData(data.data);
        } else {
          setError(data.error || 'Failed to load import');
        }
      } catch (err) {
        setError('Network error loading import details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchImport();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this import record? This cannot be undone.')) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      await fetch(`${baseUrl}/api/imports/${id}`, { method: 'DELETE' });
      router.push('/history');
    } catch (err) {
      console.error('Failed to delete import', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-(--color-foreground)/40 gap-4">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium tracking-widest uppercase">Loading Details...</span>
      </div>
    );
  }

  if (error || !importData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 gap-4">
        <Warning size={48} className="text-(--color-error)/70" />
        <h2 className="text-xl font-semibold tracking-tight text-(--color-error)">Import Not Found</h2>
        <p className="text-sm text-(--color-foreground)/60 mb-4">{error}</p>
        <Link href="/history">
          <Button variant="outline"><ArrowLeft size={16} className="mr-2" /> Back to History</Button>
        </Link>
      </div>
    );
  }

  const summary = {
    total: importData.rowCount,
    imported: importData.importedCount || 0,
    skipped: importData.skippedCount || 0
  };

  const isFailed = importData.status === 'FAILED';

  return (
    <div className="flex flex-col w-full min-h-full">
      <div className="mx-auto max-w-7xl w-full p-4 md:p-8 flex items-center justify-between">
        <Link href="/history" className="inline-flex items-center text-sm font-medium text-(--color-foreground)/50 hover:text-(--color-foreground) transition-colors group">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to History
        </Link>
        <div className="flex gap-2">
          {isFailed && importData.retryable === 1 && (
            <Link href="/">
              <Button variant="outline" className="gap-2 border-(--color-primary)/50 text-(--color-primary) hover:bg-(--color-primary)/10">
                <ArrowClockwise size={16} /> Retry Import
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={handleDelete} className="text-(--color-error) hover:bg-(--color-error)/10 hover:border-(--color-error)/20 gap-2">
            <Trash size={16} /> Delete
          </Button>
        </div>
      </div>

      {isFailed ? (
        <div className="mx-auto max-w-2xl w-full p-8 mt-10 bg-(--color-surface) border border-(--color-error)/30 rounded-2xl flex flex-col items-center text-center gap-4">
          <Warning size={48} className="text-(--color-error)" />
          <h2 className="text-2xl font-bold tracking-tight text-(--color-error)">Import Failed</h2>
          <div className="bg-(--color-error)/5 border border-(--color-error)/20 p-4 rounded-xl text-sm text-(--color-foreground)/80 w-full text-left font-mono">
            <strong>Error Category:</strong> {importData.errorCategory || 'Unknown'}<br/><br/>
            <strong>Details:</strong> {importData.errorMessage || 'No details provided.'}
          </div>
          {importData.retryable === 1 ? (
             <p className="text-sm text-(--color-foreground)/60 mt-4">This error is retryable. You can upload the same file again to retry processing.</p>
          ) : (
             <p className="text-sm text-(--color-foreground)/60 mt-4">This error is not automatically retryable. Please check your data and configuration.</p>
          )}
        </div>
      ) : (
        <div className="w-full flex-1 relative px-4 md:px-8 pb-8">
          <ReviewWorkspace 
            summary={summary}
            parsedRecords={importData.importedRecords || []}
            skippedRecords={importData.skippedRecords || []}
            fileName={importData.filename}
            onReset={() => router.push('/history')}
          />
        </div>
      )}
    </div>
  );
}
