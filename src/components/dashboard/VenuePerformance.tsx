import { motion } from 'framer-motion';
import { Star, MessageSquare, Eye, TrendingUp } from 'lucide-react';

interface VenueData {
  name: string;
  rating: number;
  review_count: number;
  is_active: boolean;
}

interface VenuePerformanceProps {
  venues: VenueData[];
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delay?: number;
}

function StatRow({ icon, label, value, delay = 0 }: StatRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center justify-between py-2.5 border-b border-[hsl(240_10%_13%)] last:border-0"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </motion.div>
  );
}

export function VenuePerformance({ venues }: VenuePerformanceProps) {
  const activeVenues = venues.filter((v) => v.is_active);
  const avgRating =
    venues.length > 0
      ? venues.reduce((sum, v) => sum + (v.rating || 0), 0) / venues.length
      : 0;
  const totalReviews = venues.reduce((sum, v) => sum + (v.review_count || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5 h-full"
    >
      <h3 className="font-semibold text-sm mb-1">Venue Performance</h3>
      <p className="text-xs text-muted-foreground mb-4">Across all your venues</p>

      <StatRow
        icon={<Star className="h-3.5 w-3.5 text-amber-400" />}
        label="Avg Rating"
        value={
          avgRating > 0 ? (
            <span className="flex items-center gap-1">
              {avgRating.toFixed(1)}
              <span className="text-amber-400">★</span>
            </span>
          ) : (
            <span className="text-muted-foreground font-normal">—</span>
          )
        }
        delay={0.55}
      />
      <StatRow
        icon={<MessageSquare className="h-3.5 w-3.5 text-blue-400" />}
        label="Total Reviews"
        value={totalReviews > 0 ? totalReviews : <span className="text-muted-foreground font-normal">—</span>}
        delay={0.6}
      />
      <StatRow
        icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
        label="Active Venues"
        value={`${activeVenues.length} / ${venues.length}`}
        delay={0.65}
      />
      <StatRow
        icon={<Eye className="h-3.5 w-3.5 text-primary" />}
        label="Profile Views"
        value={<span className="text-muted-foreground font-normal text-xs">Coming soon</span>}
        delay={0.7}
      />
    </motion.div>
  );
}
