import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { BookingCard } from '@/components/booking/BookingCard';
import { useUserBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: bookings, isLoading } = useUserBookings();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" />;

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Failed to cancel booking');
      } else {
        toast.success('Booking cancelled. Refund will be processed.');
        queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      }
    } catch (err) {
      toast.error('Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">
            <span className="text-foreground">My </span>
            <span className="text-gradient">Bookings</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            All your confirmed venue bookings
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : bookings?.length === 0 ? (
          <div className="text-center py-20 card-dark rounded-2xl">
            <p className="text-muted-foreground text-lg">You haven't made any bookings yet.</p>
            <p className="text-muted-foreground text-sm mt-2">
              Browse venues and pay to instantly confirm your booking.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings?.map((booking) => (
              <div key={booking.id} className={cancellingId === booking.id ? 'opacity-50' : ''}>
                <BookingCard 
                  booking={booking} 
                  showActions={true}
                  onCancel={handleCancelBooking}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
