"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface WorkflowIndicatorProps {
  currentStage: "upload" | "preview" | "mapping" | "processing" | "success" | "failed";
}

const STAGES = [
  { id: "upload", label: "01 Upload" },
  { id: "process", label: "02 Map & Process" },
  { id: "review", label: "03 Review" }
];

export function WorkflowIndicator({ currentStage }: WorkflowIndicatorProps) {
  const activeIndex = 
    currentStage === "upload" ? 0 : 
    (currentStage === "preview" || currentStage === "mapping" || currentStage === "processing" || currentStage === "failed") ? 1 : 2;

  return (
    <div className="flex items-center gap-3 md:gap-6">
      {STAGES.map((stage, idx) => {
        const isPast = idx < activeIndex;
        const isActive = idx === activeIndex;
        
        return (
          <div key={stage.id} className="flex items-center gap-3 md:gap-6">
            <div className="flex flex-col relative">
              <span className={cn(
                "text-[10px] md:text-xs font-medium uppercase tracking-widest transition-colors duration-300",
                isActive ? "text-(--color-primary)" : 
                isPast ? "text-(--color-foreground)/70" : "text-(--color-foreground)/30"
              )}>
                {stage.label}
              </span>
              
              {/* Animated underline indicator */}
              <div className="absolute -bottom-1.5 left-0 w-full h-[2px] bg-(--color-border) rounded-full overflow-hidden">
                {(isPast || isActive) && (
                  <motion.div
                    className="h-full bg-(--color-primary)"
                    initial={{ width: "0%" }}
                    animate={{ width: isPast ? "100%" : "60%" }}
                    transition={{ ease: "easeInOut", duration: 0.6 }}
                  />
                )}
              </div>
            </div>
            
            {/* Connector line between stages */}
            {idx < STAGES.length - 1 && (
              <div className="w-4 md:w-8 h-[1px] bg-(--color-border)" />
            )}
          </div>
        );
      })}
    </div>
  );
}
