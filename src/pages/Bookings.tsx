import { Layout } from '@/components/layout/Layout';
import { BookingCard } from '@/components/booking/BookingCard';
import { useUserBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: bookings, isLoading } = useUserBookings();

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-8">My Bookings</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : bookings?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">You haven't made any bookings yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings?.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}