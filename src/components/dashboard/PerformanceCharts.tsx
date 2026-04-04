import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface ChartDataPoint {
  date: string;
  bookings: number;
  revenue: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  type: 'bookings' | 'revenue';
}

function CustomTooltip({ active, payload, label, type }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(240_10%_11%)] border border-[hsl(240_10%_18%)] rounded-xl px-3 py-2.5 shadow-xl text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-bold text-foreground">
        {type === 'revenue'
          ? `₮${payload[0].value.toLocaleString()}`
          : `${payload[0].value} booking${payload[0].value !== 1 ? 's' : ''}`}
      </p>
    </div>
  );
}

const axisStyle = {
  fill: 'hsl(240 5% 50%)',
  fontSize: 11,
  fontFamily: 'inherit',
};

const gridStyle = { stroke: 'hsl(240 10% 14%)', strokeDasharray: '3 3' };

// Compact revenue axis labels: 100000 → "100k", 1500000 → "1.5M"
function compactRevenue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

interface PerformanceChartsProps {
  data: ChartDataPoint[];
}

export function BookingsLineChart({ data }: PerformanceChartsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5"
    >
      <div className="mb-4">
        <h3 className="font-semibold text-sm">Bookings · 7 days</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Daily reservation volume</p>
      </div>
      <ResponsiveContainer width="100%" height={148}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip type="bookings" />}
            cursor={{ stroke: 'rgba(255, 51, 153, 0.18)', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="bookings"
            stroke="hsl(322 100% 60%)"
            strokeWidth={2.5}
            dot={{ fill: 'hsl(322 100% 60%)', strokeWidth: 0, r: 3.5 }}
            activeDot={{ r: 5.5, fill: 'hsl(322 100% 60%)', stroke: 'hsl(240 10% 8%)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function RevenueBarChart({ data }: PerformanceChartsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5"
    >
      <div className="mb-4">
        <h3 className="font-semibold text-sm">Revenue · 7 days</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Confirmed revenue (₮)</p>
      </div>
      <ResponsiveContainer width="100%" height={148}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compactRevenue} />
          <Tooltip
            content={<CustomTooltip type="revenue" />}
            cursor={{ fill: 'hsl(240 10% 14%)' }}
          />
          <Bar
            dataKey="revenue"
            fill="hsl(280 85% 58%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
