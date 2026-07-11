"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "motion/react";
import React from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-(--color-background) shadow-sm border border-transparent",
          {
            "bg-(--color-primary) text-(--color-primary-foreground) hover:bg-(--color-primary-hover)": variant === "primary",
            "bg-(--color-surface) text-(--color-foreground) hover:bg-(--color-surface-hover) border border-(--color-border)": variant === "secondary",
            "border border-(--color-border) bg-transparent hover:bg-(--color-surface)": variant === "outline",
            "bg-transparent hover:bg-(--color-surface)": variant === "ghost",
            "bg-(--color-error) text-white hover:bg-(--color-error)/90": variant === "danger",
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-5": size === "md",
            "h-12 px-8 text-lg": size === "lg",
          },
          className
        )}
        style={{ borderRadius: "var(--radius-md)" }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
