"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Database, ArrowRight } from '@phosphor-icons/react';
import { AnimatedWords } from './AnimatedWords';
import { ScrollReveal } from './ScrollReveal';
import { Button } from './Button';

export function CinematicHome({ onStartImport }: { onStartImport: () => void }) {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex flex-col justify-center px-6 md:px-12 max-w-7xl mx-auto">
        <div className="max-w-3xl z-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center gap-2 text-(--color-primary) text-xs font-mono tracking-widest uppercase mb-6"
          >
            <Database weight="fill" />
            <span>AI Import Studio / CSV → CRM</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[110px] font-bold tracking-tighter text-(--color-foreground) leading-[0.9] mb-8 font-serif"
          >
            GrowEasy
          </motion.h1>

          <div className="text-3xl md:text-5xl font-medium tracking-tight text-(--color-foreground)/90 leading-tight mb-8">
            <AnimatedWords text="Turn messy CSV files into clean CRM data." />
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-lg md:text-xl text-(--color-foreground)/60 max-w-xl leading-relaxed mb-10"
          >
            Upload inconsistent customer data. Let AI understand the schema. Review every transformation. Import clean CRM records with confidence.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <Button size="lg" onClick={onStartImport} className="h-14 px-8 text-base bg-(--color-foreground) text-(--color-background) hover:bg-(--color-foreground)/90 group">
              Start Import
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="ghost" className="h-14 px-8 text-base border border-(--color-border) hover:bg-(--color-surface)">
              See how it works
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="flex flex-wrap gap-4 mt-12 text-[10px] font-mono text-(--color-foreground)/40 uppercase tracking-widest"
          >
            <span>• AI-assisted schema mapping</span>
            <span>• Validation before import</span>
            <span>• Reusable mapping presets</span>
            <span>• Local import history</span>
          </motion.div>
        </div>
      </section>

      {/* Scroll Sections */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col gap-[160px] py-[100px]">
        
        {/* Section 1 */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <div className="text-(--color-primary) font-mono text-xs tracking-widest uppercase mb-4">01 / Ingest</div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Drop the file.<br/>Keep the structure.</h2>
              <p className="text-lg text-(--color-foreground)/60 leading-relaxed max-w-md">
                Preview CSV records before processing and inspect the source data exactly as it arrived.
              </p>
            </div>
            <div className="flex-1 w-full flex justify-center">
              <div className="w-full max-w-md h-64 border border-(--color-border) bg-(--color-surface) rounded-xl flex flex-col overflow-hidden backdrop-blur-md opacity-80">
                <div className="h-10 border-b border-(--color-border) bg-white/[0.02] flex items-center px-4 font-mono text-xs text-(--color-foreground)/50">source_data.csv</div>
                <div className="flex-1 p-4 flex flex-col gap-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex gap-2 w-full">
                      <div className="h-4 bg-(--color-foreground)/10 rounded w-1/4" />
                      <div className="h-4 bg-(--color-foreground)/5 rounded w-1/2" />
                      <div className="h-4 bg-(--color-foreground)/10 rounded w-1/4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 2 */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row-reverse items-center gap-16">
            <div className="flex-1">
              <div className="text-(--color-primary) font-mono text-xs tracking-widest uppercase mb-4">02 / Understand</div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">AI reads the schema.<br/>You stay in control.</h2>
              <p className="text-lg text-(--color-foreground)/60 leading-relaxed max-w-md">
                GrowEasy suggests CRM field mappings, confidence scores, and transformations while keeping every decision reviewable.
              </p>
            </div>
            <div className="flex-1 w-full flex justify-center relative h-64">
              <div className="absolute left-1/4 flex flex-col gap-6 justify-center h-full">
                {['first_name', 'email_address', 'phone_num'].map((t,i) => (
                  <div key={i} className="font-mono text-sm text-(--color-foreground)/50 bg-(--color-surface) px-3 py-1 rounded border border-(--color-border)">{t}</div>
                ))}
              </div>
              <div className="absolute right-1/4 flex flex-col gap-6 justify-center h-full">
                {['firstName', 'email', 'mobile'].map((t,i) => (
                  <div key={i} className="font-mono text-sm text-(--color-primary) bg-(--color-primary)/10 px-3 py-1 rounded border border-(--color-primary)/30">{t}</div>
                ))}
              </div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <path d="M 40% 30% Q 50% 50% 60% 30%" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                <path d="M 40% 50% Q 50% 50% 60% 50%" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                <path d="M 40% 70% Q 50% 50% 60% 70%" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              </svg>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 3 */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <div className="text-(--color-primary) font-mono text-xs tracking-widest uppercase mb-4">03 / Transform</div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Watch raw data<br/>become usable data.</h2>
            </div>
            <div className="flex-1 w-full flex justify-center">
              <div className="flex flex-col gap-4 w-full max-w-sm">
                <div className="p-4 border border-(--color-border) rounded-lg bg-(--color-surface) opacity-60 flex justify-between font-mono text-sm">
                  <span className="text-(--color-error)">jsmith(at)gmail.com</span>
                  <span className="text-(--color-foreground)/40">→</span>
                  <span className="text-(--color-success)">jsmith@gmail.com</span>
                </div>
                <div className="p-4 border border-(--color-border) rounded-lg bg-(--color-surface) opacity-80 flex justify-between font-mono text-sm">
                  <span className="text-(--color-error)">+1 (555) 123 4567</span>
                  <span className="text-(--color-foreground)/40">→</span>
                  <span className="text-(--color-success)">15551234567</span>
                </div>
                <div className="p-4 border border-(--color-border) rounded-lg bg-(--color-surface) opacity-100 flex justify-between font-mono text-sm">
                  <span className="text-(--color-error)">new york city</span>
                  <span className="text-(--color-foreground)/40">→</span>
                  <span className="text-(--color-success)">New York</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 4 */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row-reverse items-center gap-16">
            <div className="flex-1">
              <div className="text-(--color-primary) font-mono text-xs tracking-widest uppercase mb-4">04 / Review</div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Nothing enters your CRM<br/>without a final look.</h2>
              <p className="text-lg text-(--color-foreground)/60 leading-relaxed max-w-md">
                Review imported and skipped records, inspect validation results, and export clean datasets.
              </p>
            </div>
            <div className="flex-1 w-full flex justify-center">
              <div className="w-full max-w-md h-48 border border-(--color-border) bg-(--color-surface) rounded-xl backdrop-blur-md opacity-80 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-(--color-success)" />
                <div className="text-center">
                  <div className="text-4xl font-bold text-(--color-success) mb-2">99.8%</div>
                  <div className="text-sm text-(--color-foreground)/50 font-mono">SUCCESS RATE</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 5 (Final CTA) */}
        <ScrollReveal>
          <div className="flex flex-col items-center justify-center text-center py-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-10 max-w-3xl leading-tight">
              Your CSV is messy.<br/><span className="text-(--color-foreground)/50">Your workflow does not have to be.</span>
            </h2>
            <Button size="lg" onClick={onStartImport} className="h-16 px-10 text-lg bg-(--color-primary) text-white hover:bg-(--color-primary-hover) group shadow-[0_0_40px_rgba(146,129,247,0.3)] hover:shadow-[0_0_60px_rgba(146,129,247,0.5)] transition-all">
              Start New Import
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </ScrollReveal>

      </div>
    </div>
  );
}
