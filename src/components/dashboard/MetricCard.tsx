import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  subLabel?: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  index?: number;
  loading?: boolean;
  /** React Router path — renders card as a Link */
  to?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  subLabel,
  icon: Icon,
  colorClass,
  bgClass,
  index = 0,
  loading,
  to,
}: MetricCardProps) {
  const isUp = trend !== undefined && trend >= 0;
  const isClickable = !!to;

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
      whileHover={isClickable ? { scale: 1.025, y: -4 } : { scale: 1.02, y: -3 }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 bg-[hsl(240_10%_8%)] border transition-all duration-300',
        isClickable
          ? 'border-[hsl(240_10%_15%)] hover:border-primary/30 hover:shadow-[0_12px_40px_-8px_hsl(322_100%_60%/0.18)] cursor-pointer group'
          : 'border-[hsl(240_10%_15%)] hover:border-[hsl(240_10%_22%)] hover:shadow-[0_8px_32px_-8px_hsl(322_100%_60%/0.12)] cursor-default'
      )}
    >
      {/* Background ambient glow */}
      <div
        className={cn('absolute -top-4 -right-4 w-28 h-28 rounded-full blur-2xl opacity-[0.08]', bgClass)}
      />

      {/* Clickable card: subtle overlay on hover */}
      {isClickable && (
        <div className="absolute inset-0 bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
      )}

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgClass)}>
            <Icon className={cn('h-5 w-5', colorClass)} />
          </div>
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 + 0.2 }}
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                  isUp
                    ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                    : 'text-red-400 bg-red-400/10 border border-red-400/20'
                )}
              >
                {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </motion.div>
            )}
            {isClickable && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all duration-200" />
            )}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="h-9 w-28 bg-white/5 rounded-lg animate-pulse mb-1" />
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.08 + 0.15 }}
              className="text-3xl font-bold tracking-tight leading-none"
            >
              {value}
            </motion.p>
          )}
          <p className="text-sm font-medium text-foreground/60 mt-1.5">{title}</p>
          {subLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>
          )}
        </div>

        {/* View details text for clickable cards */}
        {isClickable && (
          <div className="mt-3 pt-3 border-t border-[hsl(240_10%_12%)] flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/50 group-hover:text-primary/50 transition-colors">
              View details
            </span>
            <div className={cn('w-4 h-px transition-all duration-300', colorClass, 'opacity-0 group-hover:opacity-100 group-hover:w-8')} />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (to) {
    return <Link to={to} className="block">{cardContent}</Link>;
  }

  return cardContent;
}
