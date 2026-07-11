"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function PageTransition({ children, keyId }: { children: React.ReactNode, keyId: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyId}
        initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -14, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
