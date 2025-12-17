import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VenueCard } from '@/components/venues/VenueCard';
import { VenueFilters } from '@/components/venues/VenueFilters';
import { useVenues } from '@/hooks/useVenues';
import { VenueType } from '@/types/venue';
import { Skeleton } from '@/components/ui/skeleton';

export default function VenuesPage() {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as VenueType) || 'all';

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [venueType, setVenueType] = useState<VenueType | 'all'>(initialType);
  const [city, setCity] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);

  const { data: venues, isLoading } = useVenues({
    search,
    venueType,
    city,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
  });

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            <span className="text-foreground">Discover </span>
            <span className="text-gradient">Venues</span>
          </h1>
        </div>

        <div className="mb-8">
          <VenueFilters
            search={search}
            venueType={venueType}
            city={city}
            priceRange={priceRange}
            onSearchChange={setSearch}
            onVenueTypeChange={setVenueType}
            onCityChange={setCity}
            onPriceRangeChange={setPriceRange}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-dark rounded-2xl overflow-hidden">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : venues?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No venues found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues?.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
