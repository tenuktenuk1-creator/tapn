import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, MapPin, Check, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

export type DashboardBooking = {
  id: string;
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number | null;
  status: string;
  guest_name: string | null;
  guest_email: string | null;
  created_at: string;
  venues: { name: string; city: string } | null;
};

interface ActionCenterProps {
  bookings: DashboardBooking[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  acceptingId: string | null;
  rejectingId: string | null;
}

function getUrgency(createdAt: string): 'urgent' | 'warning' | 'normal' {
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (minutes > 120) return 'urgent';
  if (minutes > 45) return 'warning';
  return 'normal';
}

const urgencyConfig = {
  urgent: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/15 text-red-400 border-red-500/25',
  },
  warning: {
    border: 'border-amber-500/35',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  },
  normal: {
    border: 'border-[hsl(240_10%_16%)]',
    bg: 'bg-[hsl(240_10%_6%)]',
    badge: '',
  },
};

export function ActionCenter({
  bookings,
  onAccept,
  onReject,
  acceptingId,
  rejectingId,
}: ActionCenterProps) {
  if (bookings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-14 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <p className="font-semibold">All caught up!</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-[180px]">
          No pending requests right now.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2.5">
      <AnimatePresence mode="popLayout">
        {bookings.map((booking, i) => {
          const urgency = getUrgency(booking.created_at);
          const config = urgencyConfig[urgency];
          const isProcessing = acceptingId === booking.id || rejectingId === booking.id;

          return (
            <motion.div
              key={booking.id}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.28, delay: i * 0.05, ease: 'easeOut' }}
              className={cn(
                'rounded-xl p-4 border transition-all',
                config.border,
                config.bg
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-semibold text-sm leading-tight truncate">
                      {booking.guest_name || 'Guest'}
                    </p>
                    {urgency !== 'normal' && (
                      <Badge
                        className={cn(
                          'text-[10px] px-1.5 py-0 h-4 shrink-0 border',
                          config.badge
                        )}
                      >
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        {urgency === 'urgent' ? 'Urgent' : 'Waiting'}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(booking.booking_date + 'T00:00:00'), 'MMM d')} •{' '}
                      {booking.start_time}–{booking.end_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {booking.guest_count}
                    </span>
                    {booking.venues?.name && (
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {booking.venues.name}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground/50 mt-1">
                    Waiting {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {booking.total_price != null && booking.total_price > 0 && (
                    <span className="text-sm font-bold text-primary">
                      ₮{booking.total_price.toLocaleString()}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isProcessing}
                      onClick={() => onReject(booking.id)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => onAccept(booking.id)}
                      className="h-7 px-2.5 text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25 hover:border-emerald-500/40"
                    >
                      {acceptingId === booking.id ? (
                        <div className="h-3 w-3 border border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
