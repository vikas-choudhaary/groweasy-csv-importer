"use client";

import { Sun, Moon, Database, Question, DotsThreeVertical, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [apiReady, setApiReady] = useState<{ ok: boolean, mockMode?: boolean } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    
    // Poll API health
    const checkHealth = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/health`);
        const data = await res.json();
        setApiReady({ ok: res.ok, mockMode: data.mockMode });
      } catch {
        setApiReady({ ok: false });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-(--color-border)/50 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
        <Link 
          href="/" 
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem('groweasy_import_state');
              window.dispatchEvent(new Event('groweasy_reset'));
            }
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-(--color-primary) to-blue-400 flex items-center justify-center text-(--color-primary-foreground) shadow-sm group-hover:shadow-md transition-all">
            <Database size={16} weight="fill" />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-sm font-semibold tracking-tight text-(--color-foreground) leading-none group-hover:text-(--color-primary) transition-colors">GrowEasy</span>
            <span className="text-[10px] text-(--color-foreground)/50 tracking-widest uppercase mt-0.5">AI Import Studio</span>
          </div>
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/"
              className={`transition-colors ${pathname === '/' ? 'text-(--color-foreground)' : 'text-(--color-foreground)/50 hover:text-(--color-foreground)'}`}
            >
              Import Workspace
            </Link>
            <Link 
              href="/mappings"
              className={`transition-colors ${pathname.startsWith('/mappings') ? 'text-(--color-foreground)' : 'text-(--color-foreground)/50 hover:text-(--color-foreground)'}`}
            >
              Saved Mappings
            </Link>
            <Link 
              href="/history"
              className={`transition-colors ${pathname.startsWith('/history') ? 'text-(--color-foreground)' : 'text-(--color-foreground)/50 hover:text-(--color-foreground)'}`}
            >
              Import History
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-4 text-xs font-medium mr-4">
          <Link 
            href="/"
            className={`${pathname === '/' ? 'text-(--color-foreground)' : 'text-(--color-foreground)/50'}`}
          >
            Import
          </Link>
          <Link 
            href="/mappings"
            className={`${pathname.startsWith('/mappings') ? 'text-(--color-foreground)' : 'text-(--color-foreground)/50'}`}
          >
            Mappings
          </Link>
          <Link 
            href="/history"
            className={`${pathname.startsWith('/history') ? 'text-(--color-foreground)' : 'text-(--color-foreground)/50'}`}
          >
            History
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* API Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-(--color-border)/30 bg-(--color-surface)/50">
            <div className={`w-2 h-2 rounded-full ${
              apiReady?.ok 
                ? (apiReady.mockMode ? 'bg-[#9b87f5] animate-pulse shadow-[0_0_8px_#9b87f5]' : 'bg-(--color-success) animate-pulse shadow-[0_0_8px_var(--color-success)]') 
                : apiReady?.ok === false 
                  ? 'bg-(--color-error)' 
                  : 'bg-(--color-warning)'
            }`} />
            <span className="text-xs font-medium text-(--color-foreground)/70 tracking-tight">
              {apiReady?.ok 
                ? (apiReady.mockMode ? 'Mock AI' : 'API Ready') 
                : apiReady?.ok === false 
                  ? 'API Offline' 
                  : 'Connecting...'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="text-(--color-foreground)/70 hover:text-(--color-foreground) px-2"
              title="Help & Info"
            >
              <Question size={20} />
            </Button>
            
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-(--color-foreground)/70 hover:text-(--color-foreground) px-2"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="text-(--color-foreground)/70 hover:text-(--color-foreground) px-2 md:hidden"
            >
              <DotsThreeVertical size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowHelp(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-(--color-surface) border border-(--color-border) shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-(--color-border)/50">
                <h3 className="font-semibold tracking-tight text-lg">How it works</h3>
                <Button variant="ghost" size="sm" className="px-2 h-8" onClick={() => setShowHelp(false)}>
                  <X size={18} />
                </Button>
              </div>
              <div className="p-5 flex flex-col gap-4 text-sm text-(--color-foreground)/80 leading-relaxed tracking-tight">
                <p>
                  <strong>AI Import Studio</strong> allows you to upload any CSV file and automatically map it to the GrowEasy CRM schema using Google Gemini.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Supports up to 50MB CSV files.</li>
                  <li>Extracts exactly 15 CRM fields.</li>
                  <li>Processes rows in secure batches.</li>
                  <li>Invalid contacts are safely skipped.</li>
                </ul>
                <div className="bg-(--color-surface-hover) p-3 rounded-lg border border-(--color-border)/30 mt-2 text-xs">
                  <strong>Privacy Note:</strong> Uploaded CSV rows are sent to Gemini for semantic extraction. Only mapping context is retained.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
