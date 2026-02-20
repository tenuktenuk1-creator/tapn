import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VenueCard } from '@/components/venues/VenueCard';
import { VenueFilters } from '@/components/venues/VenueFilters';
import { useVenues } from '@/hooks/useVenues';
import { VenueType, PublicVenue } from '@/types/venue';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

type SortOption = 'recommended' | 'rating' | 'price_asc' | 'price_desc' | 'open_now';

const SORT_LABELS: Record<SortOption, string> = {
  recommended: 'Recommended',
  rating: 'Top Rated',
  price_asc: 'Price: Low → High',
  price_desc: 'Price: High → Low',
  open_now: 'Open Now First',
};

// Lightweight open-now check (mirrors VenueCard logic)
function isVenueOpenNow(venue: PublicVenue): boolean {
  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0) return true;
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const todayHours = venue.opening_hours[DAYS[now.getDay()]];
  if (!todayHours || todayHours.open === 'closed') return false;
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const cur = now.getHours() * 60 + now.getMinutes();
  const openMin = toMin(todayHours.open);
  const closeMin = toMin(todayHours.close);
  if (closeMin < openMin) return cur >= openMin || cur < closeMin;
  return cur >= openMin && cur < closeMin;
}

function sortVenues(venues: PublicVenue[], sort: SortOption): PublicVenue[] {
  const arr = [...venues];
  switch (sort) {
    case 'rating':
      return arr.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    case 'price_asc':
      return arr.sort((a, b) => (a.price_per_hour ?? 0) - (b.price_per_hour ?? 0));
    case 'price_desc':
      return arr.sort((a, b) => (b.price_per_hour ?? 0) - (a.price_per_hour ?? 0));
    case 'open_now':
    case 'recommended':
    default:
      return arr.sort((a, b) => {
        const aOpen = isVenueOpenNow(a) ? 1 : 0;
        const bOpen = isVenueOpenNow(b) ? 1 : 0;
        if (bOpen !== aOpen) return bOpen - aOpen;
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
  }
}

export default function VenuesPage() {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as VenueType) || 'all';

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [venueType, setVenueType] = useState<VenueType | 'all'>(initialType);
  const [city, setCity] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  const { data: venues, isLoading } = useVenues({
    search,
    venueType,
    city,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
  });

  const sortedVenues = useMemo(() => {
    if (!venues) return [];
    return sortVenues(venues as PublicVenue[], sortBy);
  }, [venues, sortBy]);

  const openCount = useMemo(
    () => (venues as PublicVenue[] | undefined)?.filter(isVenueOpenNow).length ?? 0,
    [venues]
  );

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">
            <span className="text-foreground">Discover </span>
            <span className="text-gradient">Venues</span>
          </h1>
          {!isLoading && venues && (
            <p className="text-muted-foreground text-sm">
              {venues.length} venue{venues.length !== 1 ? 's' : ''} found
              {openCount > 0 && (
                <span className="ml-2 text-green-500 font-medium">· {openCount} open now</span>
              )}
            </p>
          )}
        </div>

        <div className="mb-6">
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

        {/* Sort bar */}
        {!isLoading && (venues?.length ?? 0) > 0 && (
          <div className="flex items-center justify-end mb-4 gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
        ) : sortedVenues.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No venues found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
