import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Camera, Clock, Building2, ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  done: boolean;
  action?: { label: string; to: string };
}

interface OnboardingChecklistProps {
  hasVenue: boolean;
  hasPhotos: boolean;
  hasAvailability: boolean;
}

export function OnboardingChecklist({
  hasVenue,
  hasPhotos,
  hasAvailability,
}: OnboardingChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: 'venue',
      label: 'Add your first venue',
      description: 'List your space so customers can find and book it.',
      icon: Building2,
      done: hasVenue,
      action: { label: 'Add Venue', to: '/partner/venues/new' },
    },
    {
      id: 'photos',
      label: 'Upload venue photos',
      description: 'High-quality photos increase bookings by up to 3×.',
      icon: Camera,
      done: hasPhotos,
      action: hasVenue ? { label: 'Add Photos', to: '/partner/venues' } : undefined,
    },
    {
      id: 'availability',
      label: 'Set availability & hours',
      description: 'Let customers know when they can book your space.',
      icon: Clock,
      done: hasAvailability,
      action: hasVenue ? { label: 'Set Hours', to: '/partner/venues' } : undefined,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-lg mx-auto"
    >
      <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-8">
        {/* Header */}
        <div className="mb-7">
          <div className="w-12 h-12 rounded-2xl icon-gradient-bg border border-primary/20 flex items-center justify-center mb-5">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-1.5">Get started on TAPN</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Complete your setup to start receiving bookings from customers.
          </p>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Setup progress</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <div className="h-2 bg-[hsl(240_10%_13%)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
                className="h-full gradient-primary rounded-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {completedCount} of {items.length} steps complete
            </p>
          </div>
        </div>

        {/* Checklist items */}
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.1, duration: 0.35, ease: 'easeOut' }}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl border transition-all',
                item.done
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-[hsl(240_10%_15%)] bg-[hsl(240_10%_6%)]'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  item.done
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'bg-[hsl(240_10%_12%)] border border-[hsl(240_10%_18%)]'
                )}
              >
                {item.done ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    item.done && 'line-through text-muted-foreground'
                  )}
                >
                  {item.label}
                </p>
                {!item.done && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {!item.done && item.action && (
                <Link to={item.action.to} className="shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-primary hover:text-primary/80 hover:bg-primary/8"
                  >
                    {item.action.label}
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
