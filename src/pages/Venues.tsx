import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutList, Map } from 'lucide-react';
import { Drawer } from 'vaul';

import { Layout } from '@/components/layout/Layout';
import { VenueCard } from '@/components/venues/VenueCard';
import { VenueFilters } from '@/components/venues/VenueFilters';
import { MapContainer } from '@/components/map/MapContainer';
import { VenueMapPanel } from '@/components/map/VenueMapPanel';
import { useVenues } from '@/hooks/useVenues';
import { VenueType, BusyStatus, PublicVenue } from '@/types/venue';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { isVenueOpenNow, trackEvent } from '@/lib/mapUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

type SortOption = 'recommended' | 'rating' | 'price_asc' | 'price_desc' | 'open_now';
type ViewMode = 'list' | 'map';

const SORT_LABELS: Record<SortOption, string> = {
  recommended: 'Recommended',
  rating: 'Top Rated',
  price_asc: 'Price: Low → High',
  price_desc: 'Price: High → Low',
  open_now: 'Open Now First',
};

// ─── Sorting ─────────────────────────────────────────────────────────────────

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

// ─── Page component ───────────────────────────────────────────────────────────

export default function VenuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state (synced to URL) ──────────────────────────────────────────
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [venueType, setVenueType] = useState<VenueType | 'all'>(
    (searchParams.get('type') as VenueType) || 'all',
  );
  const [city, setCity] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [openNow, setOpenNow] = useState(searchParams.get('openNow') === 'true');
  const [busyFilter, setBusyFilter] = useState<BusyStatus | 'all'>(
    (searchParams.get('busy') as BusyStatus) || 'all',
  );
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  // ── Map-specific state ────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'list',
  );
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // ── Sync state → URL (replace so Back button stays clean) ────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (viewMode !== 'list') params.set('view', viewMode);
    if (search) params.set('search', search);
    if (venueType !== 'all') params.set('type', venueType);
    if (openNow) params.set('openNow', 'true');
    if (busyFilter !== 'all') params.set('busy', busyFilter);
    setSearchParams(params, { replace: true });
  }, [viewMode, search, venueType, openNow, busyFilter, setSearchParams]);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const { data: venues, isLoading } = useVenues({
    search,
    venueType,
    city,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
  });

  // ── Client-side filters (openNow, busyFilter) ─────────────────────────────
  const filteredVenues = useMemo(() => {
    if (!venues) return [];
    let result = venues as PublicVenue[];
    if (openNow) result = result.filter(isVenueOpenNow);
    if (busyFilter !== 'all') result = result.filter((v) => v.busy_status === busyFilter);
    return result;
  }, [venues, openNow, busyFilter]);

  const sortedVenues = useMemo(
    () => sortVenues(filteredVenues, sortBy),
    [filteredVenues, sortBy],
  );

  const openCount = useMemo(
    () => (venues as PublicVenue[] | undefined)?.filter(isVenueOpenNow).length ?? 0,
    [venues],
  );

  // ── View mode switch ──────────────────────────────────────────────────────
  const handleViewChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      setSelectedVenueId(null);
      trackEvent('view_changed', { mode });
    },
    [],
  );

  // ── Subcomponent: filter row + toggle (shared between views) ─────────────
  const filterRow = (
    <div className="flex gap-3 items-start flex-wrap">
      <div className="flex-1 min-w-0">
        <VenueFilters
          search={search}
          venueType={venueType}
          city={city}
          priceRange={priceRange}
          openNow={openNow}
          busyFilter={busyFilter}
          onSearchChange={setSearch}
          onVenueTypeChange={setVenueType}
          onCityChange={setCity}
          onPriceRangeChange={setPriceRange}
          onOpenNowChange={setOpenNow}
          onBusyFilterChange={setBusyFilter}
        />
      </div>

      {/* List / Map segmented toggle */}
      <div
        className="flex rounded-lg border border-border overflow-hidden flex-shrink-0 h-10"
        role="group"
        aria-label="View mode"
      >
        {(['list', 'map'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleViewChange(mode)}
            aria-pressed={viewMode === mode}
            className={`px-4 h-full text-sm font-medium flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              viewMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {mode === 'list' ? (
              <LayoutList className="h-4 w-4" aria-hidden />
            ) : (
              <Map className="h-4 w-4" aria-hidden />
            )}
            <span className="hidden sm:inline capitalize">{mode}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── MAP VIEW ──────────────────────────────────────────────────────────────
  if (viewMode === 'map') {
    return (
      <Layout hideFooter>
        {/*
          Map layout: fixed height = viewport - header (~64px).
          We use flex-col so the filter row + map area fill exactly.
        */}
        <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
          {/* Header + filter row */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-2 border-b border-border">
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-2xl font-bold">
                <span className="text-foreground">Discover </span>
                <span className="text-gradient">Venues</span>
              </h1>
              {!isLoading && (
                <p className="text-muted-foreground text-sm">
                  {sortedVenues.length} found
                  {openCount > 0 && (
                    <span className="ml-1.5 text-green-500 font-medium">
                      · {openCount} open
                    </span>
                  )}
                </p>
              )}
            </div>
            {filterRow}
          </div>

          {/* Map + panel area */}
          <div className="flex flex-1 overflow-hidden gap-3 p-3 min-h-0">
            {/* Side panel — desktop only */}
            <div className="hidden lg:flex w-80 xl:w-96 flex-shrink-0 min-h-0">
              <VenueMapPanel
                venues={sortedVenues}
                selectedVenueId={selectedVenueId}
                userLocation={userLocation}
                isLoading={isLoading}
                onVenueSelect={setSelectedVenueId}
              />
            </div>

            {/* Map */}
            <div className="flex-1 relative min-h-0">
              <MapContainer
                venues={sortedVenues}
                selectedVenueId={selectedVenueId}
                onVenueSelect={setSelectedVenueId}
                userLocation={userLocation}
                onUserLocationChange={setUserLocation}
                openNow={openNow}
                onOpenNowChange={setOpenNow}
              />

              {/* Mobile bottom bar — shows count + opens sheet */}
              <div className="lg:hidden absolute bottom-3 left-3 right-3 z-[4]">
                <Drawer.Root open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                  <Drawer.Trigger asChild>
                    <button
                      type="button"
                      className="w-full bg-background/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 flex items-center justify-between shadow-lg"
                      aria-label="Open venue list"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {isLoading
                          ? 'Loading venues…'
                          : `${sortedVenues.length} venue${sortedVenues.length !== 1 ? 's' : ''} found`}
                        {openCount > 0 && !isLoading && (
                          <span className="ml-1.5 text-green-500">
                            · {openCount} open
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-primary font-medium">
                        See list ↑
                      </span>
                    </button>
                  </Drawer.Trigger>

                  <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[50]" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[51] flex flex-col rounded-t-2xl bg-background border-t border-border max-h-[85vh]">
                      {/* Drag handle */}
                      <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 rounded-full bg-border" />
                      </div>
                      <Drawer.Title className="sr-only">Venues list</Drawer.Title>
                      <div className="flex-1 overflow-hidden">
                        <VenueMapPanel
                          venues={sortedVenues}
                          selectedVenueId={selectedVenueId}
                          userLocation={userLocation}
                          isLoading={isLoading}
                          onVenueSelect={(id) => {
                            setSelectedVenueId(id);
                            setMobileSheetOpen(false);
                          }}
                        />
                      </div>
                    </Drawer.Content>
                  </Drawer.Portal>
                </Drawer.Root>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── LIST VIEW (unchanged layout, new filter props) ────────────────────────
  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">
            <span className="text-foreground">Discover </span>
            <span className="text-gradient">Venues</span>
          </h1>
          {!isLoading && venues && (
            <p className="text-muted-foreground text-sm">
              {sortedVenues.length} venue{sortedVenues.length !== 1 ? 's' : ''} found
              {openCount > 0 && (
                <span className="ml-2 text-green-500 font-medium">
                  · {openCount} open now
                </span>
              )}
            </p>
          )}
        </div>

        {/* Filter row with toggle */}
        <div className="mb-6">{filterRow}</div>

        {/* Sort bar */}
        {!isLoading && sortedVenues.length > 0 && (
          <div className="flex items-center justify-end mb-4 gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
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

        {/* Grid */}
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
            <p className="text-muted-foreground text-lg">
              No venues found matching your criteria.
            </p>
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
