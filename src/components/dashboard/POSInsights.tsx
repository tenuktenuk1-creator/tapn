import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp, TrendingDown, Link2 } from 'lucide-react';

// Placeholder type — extend when POS data is available
interface MenuItemData {
  name: string;
  orders: number;
  trend: 'up' | 'down';
}

interface POSInsightsProps {
  topItems?: MenuItemData[];
  lowItems?: MenuItemData[];
}

export function POSInsights({ topItems, lowItems }: POSInsightsProps) {
  const hasData = (topItems?.length ?? 0) > 0 || (lowItems?.length ?? 0) > 0;

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
        className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5 h-full flex flex-col"
      >
        <h3 className="font-semibold text-sm mb-1">Menu & POS</h3>
        <p className="text-xs text-muted-foreground mb-4">Top & low performing items</p>

        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-4">
            <ShoppingBag className="h-5 w-5 text-primary/70" />
          </div>
          <p className="font-medium text-sm mb-1">No menu data yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
            Connect your menu to track best sellers and slow movers.
          </p>
          <button className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            <Link2 className="h-3 w-3" />
            Set up menu
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.65 }}
      className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5 h-full"
    >
      <h3 className="font-semibold text-sm mb-1">Menu & POS</h3>
      <p className="text-xs text-muted-foreground mb-4">Top & low performing items</p>

      {topItems && topItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Top selling
          </p>
          <div className="space-y-2">
            {topItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground/80 truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{item.orders} orders</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowItems && lowItems.length > 0 && (
        <div className="border-t border-[hsl(240_10%_13%)] pt-4">
          <p className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Low performing
          </p>
          <div className="space-y-2">
            {lowItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground/60 truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{item.orders} orders</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
