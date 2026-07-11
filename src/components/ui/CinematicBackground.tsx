"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

/* eslint-disable react-hooks/set-state-in-effect */

export function CinematicBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 bg-(--color-background) pointer-events-none -z-50" />;
  }

  // We generate static structural SVGs that rotate/translate smoothly
  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden bg-(--color-background) flex items-center justify-center transition-colors duration-300">
      {/* Central subtle violet glow */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 4 }}
        className="absolute w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-(--color-primary) blur-[120px]"
      />
      
      {/* 3D abstract geometric data prism container */}
      <motion.div 
        className="relative w-full h-full max-w-[1200px] opacity-[0.25]"
        animate={{
          rotateY: [0, 5, 0, -5, 0],
          rotateX: [0, -2, 0, 2, 0]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ perspective: '1000px' }}
      >
        {/* Glass planes */}
        <motion.div 
          className="absolute inset-0 m-auto w-[60%] h-[40%] border border-(--color-primary)/30 bg-(--color-foreground)/[0.02] backdrop-blur-sm"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{
            transform: [
              'rotateZ(15deg) translateZ(-100px)',
              'rotateZ(20deg) translateZ(-50px)',
              'rotateZ(15deg) translateZ(-100px)'
            ]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        <motion.div 
          className="absolute inset-0 m-auto w-[50%] h-[50%] border border-(--color-border-strong) bg-(--color-primary)/[0.02]"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{
            transform: [
              'rotateZ(-10deg) translateZ(50px)',
              'rotateZ(-5deg) translateZ(100px)',
              'rotateZ(-10deg) translateZ(50px)'
            ]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Floating Data Nodes */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <g stroke="currentColor" strokeWidth="0.05" fill="none" opacity="0.3">
            <motion.path 
              d="M 20 40 L 40 50 L 60 40 L 80 60" 
              animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }} 
              transition={{ duration: 15, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
            />
            <motion.path 
              d="M 30 70 L 50 60 L 70 80" 
              animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }} 
              transition={{ duration: 20, repeat: Infinity, times: [0, 0.3, 0.7, 1], delay: 5 }}
            />
          </g>
          
          {/* Sparse moving data points */}
          <g fill="var(--color-primary)">
            <motion.circle r="0.2" cx="20" cy="40" animate={{ cy: [40, 30, 40] }} transition={{ duration: 10, repeat: Infinity }} />
            <motion.circle r="0.2" cx="40" cy="50" animate={{ cy: [50, 60, 50] }} transition={{ duration: 12, repeat: Infinity }} />
            <motion.circle r="0.2" cx="60" cy="40" animate={{ cy: [40, 35, 40] }} transition={{ duration: 14, repeat: Infinity }} />
            <motion.circle r="0.2" cx="80" cy="60" animate={{ cy: [60, 70, 60] }} transition={{ duration: 16, repeat: Infinity }} />
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
