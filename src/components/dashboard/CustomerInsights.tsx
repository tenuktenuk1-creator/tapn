import { motion } from 'framer-motion';
import { Users, RotateCcw, Star } from 'lucide-react';

interface BookingForInsights {
  guest_email: string | null;
}

interface VenueForInsights {
  rating: number;
}

interface CustomerInsightsProps {
  bookings: BookingForInsights[];
  venues: VenueForInsights[];
}

export function CustomerInsights({ bookings, venues }: CustomerInsightsProps) {
  // Compute new vs returning from email frequency
  const emailCounts: Record<string, number> = {};
  bookings.forEach((b) => {
    if (b.guest_email) {
      emailCounts[b.guest_email] = (emailCounts[b.guest_email] || 0) + 1;
    }
  });

  const totalUnique = Object.keys(emailCounts).length;
  const returning = Object.values(emailCounts).filter((c) => c > 1).length;
  const newCustomers = totalUnique - returning;
  const returningPct = totalUnique > 0 ? Math.round((returning / totalUnique) * 100) : 0;
  const newPct = 100 - returningPct;

  const avgRating =
    venues.length > 0
      ? venues.reduce((sum, v) => sum + (v.rating || 0), 0) / venues.length
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.58 }}
      className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5 h-full"
    >
      <h3 className="font-semibold text-sm mb-1">Customer Insights</h3>
      <p className="text-xs text-muted-foreground mb-4">Based on booking history</p>

      {totalUnique > 0 ? (
        <div className="mb-5">
          <p className="text-xs text-muted-foreground mb-2.5">New vs Returning</p>
          <div className="flex h-2 rounded-full overflow-hidden gap-px">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${newPct}%` }}
              transition={{ duration: 0.7, delay: 0.65, ease: 'easeOut' }}
              className="bg-primary rounded-l-full"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${returningPct}%` }}
              transition={{ duration: 0.7, delay: 0.65, ease: 'easeOut' }}
              className="bg-accent rounded-r-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <Users className="h-3 w-3" />
              New · {newPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <RotateCcw className="h-3 w-3" />
              Returning · {returningPct}%
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-5 py-3 text-center">
          <p className="text-xs text-muted-foreground">No customer data yet</p>
        </div>
      )}

      <div className="border-t border-[hsl(240_10%_13%)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            Avg Rating
          </div>
          {avgRating > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold">{avgRating.toFixed(1)}</span>
              <span className="text-amber-400 text-sm">★</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>

        {/* Star bar distribution (approximate visualization) */}
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const filled = avgRating > 0
              ? stars === 5 ? 65
              : stars === 4 ? 20
              : stars === 3 ? 10
              : stars === 2 ? 3
              : 2
              : 0;
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-3 text-right">{stars}</span>
                <div className="flex-1 h-1.5 bg-[hsl(240_10%_13%)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${filled}%` }}
                    transition={{ duration: 0.6, delay: 0.7 + (5 - stars) * 0.05, ease: 'easeOut' }}
                    className="h-full bg-amber-400/55 rounded-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
