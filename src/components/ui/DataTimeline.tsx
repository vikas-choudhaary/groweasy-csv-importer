"use client";

import React from 'react';
import { motion } from 'motion/react';

export function DataTimeline() {
  return (
    <div className="relative w-full h-32 flex items-center justify-center overflow-hidden opacity-50">
      <div className="absolute inset-x-0 h-[1px] bg-(--color-border) top-1/2 -translate-y-1/2" />
      
      {[0, 1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-(--color-primary) top-1/2 -translate-y-1/2"
          initial={{ left: "-10%" }}
          animate={{ left: "110%" }}
          transition={{ duration: 8, repeat: Infinity, delay: i * 2, ease: "linear" }}
        />
      ))}
      
      {/* Chart-like vertical bars moving */}
      <div className="absolute inset-0 flex items-end justify-around pb-4 px-20">
        {[40, 60, 30, 80, 50, 70, 20].map((h, i) => (
          <motion.div
            key={`bar-${i}`}
            className="w-1 bg-(--color-foreground)/10 rounded-t-sm"
            style={{ height: `${h}%` }}
            animate={{ height: [`${h}%`, `${h * 0.8}%`, `${h}%`] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
