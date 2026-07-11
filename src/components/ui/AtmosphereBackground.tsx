"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function AtmosphereBackground() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-(--color-background)">
      {/* Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: isDark ? 'screen' : 'multiply'
        }}
      />
      
      {/* Subtle Radial Light Fields */}
      <div 
        className="absolute -top-1/4 -left-1/4 w-[150vw] h-[150vh]"
        style={{
          background: isDark 
            ? 'radial-gradient(ellipse at 50% 0%, rgba(124, 150, 184, 0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(124, 150, 184, 0.15) 0%, transparent 60%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-[100vw] h-[100vh]"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 100% 100%, rgba(124, 150, 184, 0.05) 0%, transparent 50%)'
            : 'radial-gradient(circle at 100% 100%, rgba(124, 150, 184, 0.1) 0%, transparent 50%)',
        }}
      />
    </div>
  );
}
