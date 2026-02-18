import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Booking } from '@/types/venue';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface BookingCardProps {
  booking: Booking;
  showActions?: boolean;
  onCancel?: (id: string) => void;
}

export function BookingCard({ booking, showActions, onCancel }: BookingCardProps) {
  const statusColors = {
    confirmed: 'bg-green-500/10 text-green-600 border-green-500/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-shrink-0 w-full md:w-24 h-20 rounded-lg overflow-hidden bg-muted">
            {booking.venue?.images?.[0] ? (
              <img
                src={booking.venue.images[0]}
                alt={booking.venue.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-muted-foreground/30">
                  {booking.venue?.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-lg">
                {booking.venue?.name || 'Unknown Venue'}
              </h3>
              <Badge className={statusColors[booking.status]}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(booking.booking_date), 'PPP')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{booking.start_time} - {booking.end_time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{booking.guest_count} guests</span>
              </div>
              {booking.venue?.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{booking.venue.city}</span>
                </div>
              )}
            </div>

            {booking.notes && (
              <p className="text-sm text-muted-foreground italic">
                "{booking.notes}"
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-lg font-semibold">
                ₮{(booking.total_price || 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {booking.payment_status}
              </div>
            </div>

            {showActions && booking.status === 'confirmed' && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                onClick={() => onCancel?.(booking.id)}
              >
                Cancel Booking
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}