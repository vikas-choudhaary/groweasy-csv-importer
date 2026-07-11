"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle, Key, Lock, WarningCircle } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

const SettingsSchema = z.object({
  geminiKey: z.string().min(1, "API Key is required").min(10, "Key seems too short to be valid"),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

export default function SettingsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setHasKey(data.hasKey);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const onSubmit = async (data: SettingsFormValues) => {
    setApiError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save settings");
      }

      setHasKey(true);
      setIsSaved(true);
      reset(); // Clear the input field for security
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save settings.";
      setApiError(errorMessage);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20 pt-4 max-w-3xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tighter">Settings</h1>
        <p className="text-(--color-foreground)/60 tracking-tight">
          Manage your workspace preferences and integrations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-(--color-primary)/10 rounded-lg text-(--color-primary)">
              <Key size={20} weight="fill" />
            </div>
            <div>
              <CardTitle>AI Integration</CardTitle>
              <CardDescription>Configure your Google Gemini API key to enable intelligent CSV mapping.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[120px] bg-(--color-surface-hover) animate-pulse rounded-lg" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {hasKey && (
                <div className="flex items-center gap-2 text-sm text-(--color-success) bg-(--color-success-bg) p-3 rounded-lg border border-(--color-success)/20 mb-2">
                  <CheckCircle size={18} weight="fill" />
                  <span className="font-medium tracking-tight">API Key is currently configured and active.</span>
                </div>
              )}
              
              <div className="relative">
                <Input
                  {...register("geminiKey")}
                  type="password"
                  label="Google Gemini API Key"
                  placeholder={hasKey ? "Enter a new key to replace the existing one" : "Enter your API key..."}
                  error={errors.geminiKey?.message}
                  className="pl-10"
                />
                <Lock size={16} className="absolute left-4 top-9 text-(--color-foreground)/40" />
              </div>
              
              <p className="text-xs text-(--color-foreground)/50 tracking-tight">
                Your key is stored securely in the local SQLite database and is never exposed to the client.
              </p>

              <AnimatePresence>
                {apiError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 text-sm text-(--color-error) mt-2">
                      <WarningCircle size={16} weight="fill" />
                      <span>{apiError}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 mt-2">
                <Button type="submit" disabled={isSubmitting} className="w-32 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isSubmitting ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      </motion.div>
                    ) : isSaved ? (
                      <motion.div key="saved" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
                        <CheckCircle size={18} weight="bold" /> Saved
                      </motion.div>
                    ) : (
                      <motion.span key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        Save Key
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
