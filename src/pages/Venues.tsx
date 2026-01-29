import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VenueCardWithDistance } from '@/components/venues/VenueCardWithDistance';
import { VenueMap } from '@/components/venues/VenueMap';
import { MapFilters } from '@/components/venues/MapFilters';
import { LocationBanner } from '@/components/venues/LocationBanner';
import { useVenues } from '@/hooks/useVenues';
import { useGeolocation } from '@/hooks/useGeolocation';
import { VenueType, BusyStatus, PublicVenue } from '@/types/venue';
import { Skeleton } from '@/components/ui/skeleton';
import { sortByDistance } from '@/lib/geo';

export default function VenuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as VenueType) || 'all';
  const initialView = (searchParams.get('view') as 'list' | 'map') || 'list';

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [venueType, setVenueType] = useState<VenueType | 'all'>(initialType);
  const [busyStatus, setBusyStatus] = useState<BusyStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(initialView);

  const { 
    latitude, 
    longitude, 
    loading: locationLoading, 
    isUsingDefault,
    requestLocation,
  } = useGeolocation();

  const { data: venues, isLoading } = useVenues({
    search,
    venueType,
    city: '',
    minPrice: 0,
    maxPrice: 500000,
  });

  // Update URL when view mode changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('view', viewMode);
    setSearchParams(params, { replace: true });
  }, [viewMode, searchParams, setSearchParams]);

  // Process venues with distance and filtering
  const processedVenues = useMemo(() => {
    if (!venues) return [];

    // Filter by busy status
    let filtered = venues as PublicVenue[];
    if (busyStatus !== 'all') {
      filtered = filtered.filter(v => v.busy_status === busyStatus);
    }

    // Sort by distance if we have user location
    if (latitude && longitude) {
      return sortByDistance(filtered, latitude, longitude);
    }

    return filtered.map(v => ({ ...v, distance: undefined }));
  }, [venues, busyStatus, latitude, longitude]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleVenueTypeChange = useCallback((value: VenueType | 'all') => {
    setVenueType(value);
  }, []);

  const handleBusyStatusChange = useCallback((value: BusyStatus | 'all') => {
    setBusyStatus(value);
  }, []);

  const handleViewModeChange = useCallback((value: 'list' | 'map') => {
    setViewMode(value);
  }, []);

  const userLocation = latitude && longitude 
    ? { lat: latitude, lng: longitude } 
    : null;

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            <span className="text-foreground">Discover </span>
            <span className="text-gradient">Venues</span>
          </h1>
          <p className="text-muted-foreground">
            Find the perfect spot for your night out
          </p>
        </div>

        {/* Location Banner */}
        {isUsingDefault && !locationLoading && (
          <div className="mb-6">
            <LocationBanner 
              onRequestLocation={requestLocation}
              isLoading={locationLoading}
            />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <MapFilters
            search={search}
            venueType={venueType}
            busyStatus={busyStatus}
            viewMode={viewMode}
            onSearchChange={handleSearchChange}
            onVenueTypeChange={handleVenueTypeChange}
            onBusyStatusChange={handleBusyStatusChange}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        {/* Content */}
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
        ) : processedVenues.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              No venues found matching your criteria.
            </p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[600px]">
            <VenueMap 
              venues={processedVenues}
              userLocation={userLocation}
              className="h-full"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedVenues.map((venue) => (
              <VenueCardWithDistance key={venue.id} venue={venue} />
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && processedVenues.length > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Showing {processedVenues.length} venue{processedVenues.length !== 1 ? 's' : ''}
            {!isUsingDefault && ' sorted by distance'}
          </div>
        )}
      </div>
    </Layout>
  );
}
