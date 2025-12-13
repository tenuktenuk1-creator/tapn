import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VenueDetailHeader } from '@/components/venues/VenueDetailHeader';
import { BookingForm } from '@/components/booking/BookingForm';
import { useVenue } from '@/hooks/useVenues';
import { Skeleton } from '@/components/ui/skeleton';

export default function VenueDetailPage() {
  const { id } = useParams();
  const { data: venue, isLoading } = useVenue(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 space-y-6">
          <Skeleton className="h-[400px] rounded-2xl" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      </Layout>
    );
  }

  if (!venue) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Venue Not Found</h1>
          <p className="text-muted-foreground">The venue you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VenueDetailHeader venue={venue} />
          </div>
          <div>
            <BookingForm venue={venue} />
          </div>
        </div>
      </div>
    </Layout>
  );
}