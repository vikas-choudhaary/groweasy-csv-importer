"use client";

import React from 'react';
import { motion } from 'motion/react';

export function MappingConstellation() {
  return (
    <div className="relative w-full h-64 flex items-center justify-center opacity-60">
      {/* Source nodes */}
      <div className="absolute left-[20%] md:left-[30%] flex flex-col gap-6">
        {[0, 1, 2].map(i => (
          <motion.div 
            key={`src-${i}`}
            className="w-2 h-2 rounded-full bg-(--color-foreground)/40"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>
      
      {/* Target nodes */}
      <div className="absolute right-[20%] md:right-[30%] flex flex-col gap-10">
        {[0, 1].map(i => (
          <motion.div 
            key={`tgt-${i}`}
            className="w-3 h-3 rounded-md bg-(--color-primary)/60"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }}
          />
        ))}
      </div>

      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path 
          d="M 30 38 Q 50 50 70 42" 
          fill="none" 
          stroke="var(--color-primary)" 
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ strokeDashoffset: 20 }}
          animate={{ strokeDashoffset: [20, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.path 
          d="M 30 62 Q 50 50 70 58" 
          fill="none" 
          stroke="var(--color-foreground)" 
          strokeWidth="0.5"
          opacity="0.2"
        />
      </svg>
    </div>
  );
}
