import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { useUserBookings, useCancelBooking } from '@/hooks/useBookings';
import {
  Calendar, Clock, MapPin, ChevronRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, isAfter, isBefore } from 'date-fns';

function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    case 'rejected':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface BookingItemProps {
  booking: any;
  onViewDetails: () => void;
  cancelBooking: ReturnType<typeof useCancelBooking>;
}

function BookingItem({ booking, onViewDetails, cancelBooking }: BookingItemProps) {
  const venueName = booking.venue?.name || 'Unknown Venue';
  const venueAddress = booking.venue?.address || '';
  const canCancel = booking.status === 'pending';

  const handleCancel = () => {
    cancelBooking.mutate(booking.id, {
      onSuccess: () => toast.success('Booking cancelled'),
      onError: () => toast.error('Failed to cancel booking'),
    });
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-foreground truncate">{venueName}</h4>
          {getStatusBadge(booking.status)}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(booking.booking_date), 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {booking.start_time?.slice(0, 5)} – {booking.end_time?.slice(0, 5)}
          </span>
          {booking.total_price != null && (
            <span className="font-medium text-primary">
              ₮{((booking.total_price || 0) / 100).toLocaleString()}
            </span>
          )}
          {venueAddress && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {venueAddress}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2">
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={cancelBooking.isPending}
              >
                {cancelBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cancel your booking at <strong>{venueName}</strong> on{' '}
                  {format(new Date(booking.booking_date), 'MMM d, yyyy')}? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Cancel
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          className="text-primary hover:text-primary"
        >
          View
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading } = useUserBookings();
  const cancelBooking = useCancelBooking();

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const upcomingBookings = activeBookings.filter(
    b => isAfter(new Date(b.booking_date), now) || format(new Date(b.booking_date), 'yyyy-MM-dd') === todayStr
  );
  const pastBookings = bookings.filter(
    b => b.status === 'cancelled' || b.status === 'rejected' ||
      (b.status === 'confirmed' && isBefore(new Date(b.booking_date), now) &&
        format(new Date(b.booking_date), 'yyyy-MM-dd') !== todayStr)
  );

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            <span className="text-foreground">My </span>
            <span className="text-gradient">Bookings</span>
          </h1>
          <p className="text-muted-foreground">Track your upcoming and past reservations</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="mb-6 bg-secondary border border-border">
              <TabsTrigger value="upcoming">
                Upcoming
                {upcomingBookings.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold rounded-full px-1.5 py-0.5">
                    {upcomingBookings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-16 card-dark rounded-2xl">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Button onClick={() => navigate('/venues')} className="gradient-primary">
                    Browse Venues
                  </Button>
                </div>
              ) : (
                upcomingBookings.map(booking => (
                  <BookingItem
                    key={booking.id}
                    booking={booking}
                    onViewDetails={() => navigate(`/venues/${booking.venue_id}`)}
                    cancelBooking={cancelBooking}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3">
              {pastBookings.length === 0 ? (
                <div className="text-center py-16 card-dark rounded-2xl">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No past bookings</p>
                </div>
              ) : (
                pastBookings.map(booking => (
                  <BookingItem
                    key={booking.id}
                    booking={booking}
                    onViewDetails={() => navigate(`/venues/${booking.venue_id}`)}
                    cancelBooking={cancelBooking}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
