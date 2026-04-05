import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PartnerApplyLayoutProps {
  step: 1 | 2 | 3 | 4;
  lastSaved?: Date | null;
  onSaveDraft?: () => void;
  children: ReactNode;
}

const STEPS = [
  { number: 1, label: 'Identity' },
  { number: 2, label: 'Venue' },
  { number: 3, label: 'Documents' },
  { number: 4, label: 'Review' },
];

function isRecentlySaved(date: Date | null | undefined): boolean {
  if (!date) return false;
  return Date.now() - date.getTime() < 10_000; // within last 10 seconds
}

export function PartnerApplyLayout({
  step,
  lastSaved,
  onSaveDraft,
  children,
}: PartnerApplyLayoutProps) {
  const saved = isRecentlySaved(lastSaved);

  return (
    <div className="min-h-screen bg-[hsl(240_10%_4%)]">
      {/* Top progress bar header */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[hsl(240_10%_4%)]/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Step indicators */}
            <div className="flex flex-1 items-center gap-0">
              {STEPS.map((s, index) => {
                const isCompleted = s.number < step;
                const isActive = s.number === step;
                const isInactive = s.number > step;

                return (
                  <div key={s.number} className="flex flex-1 items-center">
                    {/* Step circle + label */}
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={[
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                          isCompleted
                            ? 'bg-green-500/20 text-green-400'
                            : isActive
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-white/10 text-muted-foreground',
                        ].join(' ')}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span>{s.number}</span>
                        )}
                      </div>
                      <span
                        className={[
                          'hidden text-xs font-medium sm:block',
                          isActive
                            ? 'text-white'
                            : isCompleted
                            ? 'text-green-400'
                            : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {s.label}
                      </span>
                    </div>

                    {/* Connector line between steps */}
                    {index < STEPS.length - 1 && (
                      <div className="relative mx-2 flex-1">
                        <div className="h-px w-full bg-white/10" />
                        <motion.div
                          className="absolute inset-y-0 left-0 h-px bg-primary"
                          initial={{ width: '0%' }}
                          animate={{
                            width: s.number < step ? '100%' : '0%',
                          }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: save controls */}
            <div className="flex items-center gap-3">
              {/* Auto-save indicator */}
              {lastSaved && (
                <div className="hidden items-center gap-1.5 sm:flex">
                  <motion.div
                    className={[
                      'h-2 w-2 rounded-full',
                      saved ? 'bg-green-400' : 'bg-white/30',
                    ].join(' ')}
                    animate={saved ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {saved
                      ? 'Saved'
                      : `Saved ${formatRelativeTime(lastSaved)}`}
                  </span>
                </div>
              )}

              {onSaveDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSaveDraft}
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Draft
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
