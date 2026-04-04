import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Sparkles, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  {
    label: 'Add Venue',
    icon: Plus,
    to: '/partner/venues/new',
    primary: true,
  },
  {
    label: 'Edit Menu',
    icon: BookOpen,
    to: '/partner/venues',
    primary: false,
  },
  {
    label: 'Create Promo',
    icon: Sparkles,
    to: '/partner/venues',
    primary: false,
  },
  {
    label: 'Calendar',
    icon: CalendarDays,
    to: '/partner/bookings',
    primary: false,
  },
] as const;

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {ACTIONS.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.06 + i * 0.05, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <Link
            to={action.to}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              action.primary
                ? 'gradient-primary text-white shadow-[0_4px_16px_hsl(322_100%_60%/0.3)] hover:shadow-[0_6px_24px_hsl(322_100%_60%/0.45)]'
                : 'bg-[hsl(240_10%_11%)] hover:bg-[hsl(240_10%_14%)] text-foreground/80 hover:text-foreground border border-[hsl(240_10%_16%)] hover:border-[hsl(240_10%_22%)]'
            )}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
