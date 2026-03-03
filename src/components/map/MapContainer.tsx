import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  memo,
} from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useMapSaved } from '@/hooks/useMapSaved';
import { useMapCache } from '@/hooks/useMapCache';
import { PublicVenue } from '@/types/venue';
import {
  BUSY_HEX,
  DEFAULT_CENTER,
  trackEvent,
  clusterMarkerIcon,
  buildAvatarDataUrl,
  createInitialsSvg,
  applyMapFilters,
  MapFilterState,
  DEFAULT_MAP_FILTERS,
} from '@/lib/mapUtils';
import { MapControls } from './MapControls';
import { MapFiltersBar } from './MapFiltersBar';
import { MapMarkerPreview } from './MapMarkerPreview';
import { MapCompareSheet } from './MapCompareSheet';
import { MapLegend } from './MapLegend';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Search, WifiOff } from 'lucide-react';

// ─── Dark map style (preserved from original) ─────────────────────────────────

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f0f1e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1a1a30' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f0f22' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1e1e36' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d1b4e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#6b21a8' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c084fc' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111118' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050510' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e1e35' }] },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MapContainerProps {
  venues: PublicVenue[];
  selectedVenueId: string | null;
  onVenueSelect: (id: string | null) => void;
  userLocation: { lat: number; lng: number } | null;
  onUserLocationChange: (loc: { lat: number; lng: number } | null) => void;
  openNow: boolean;
  onOpenNowChange: (value: boolean) => void;
  isLoading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MapContainer = memo(function MapContainer({
  venues,
  selectedVenueId,
  onVenueSelect,
  userLocation,
  onUserLocationChange,
  openNow,
  onOpenNowChange,
  isLoading,
}: MapContainerProps) {
  const { isLoading: mapsLoading, isReady, isError, error } = useGoogleMaps();
  const { isSaved, toggleSave, savedIds } = useMapSaved();
  const { cachedVenues, updateCache, isOffline } = useMapCache();

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const mapDivRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Maps API refs ───────────────────────────────────────────────────────────
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const projOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Icon cache (venue data URL per venueId+state key) ──────────────────────
  const avatarCache = useRef<Map<string, string>>(new Map());

  // ── Stable callback refs ────────────────────────────────────────────────────
  const onVenueSelectRef = useRef(onVenueSelect);
  useEffect(() => { onVenueSelectRef.current = onVenueSelect; }, [onVenueSelect]);

  const venuesRef = useRef(venues);
  useEffect(() => { venuesRef.current = venues; }, [venues]);

  const savedIdsRef = useRef(savedIds);
  useEffect(() => { savedIdsRef.current = savedIds; }, [savedIds]);

  // ── Local filter state ──────────────────────────────────────────────────────
  // openNow syncs with parent; other filters are map-only.
  const [localFilters, setLocalFilters] = useState<MapFilterState>({
    ...DEFAULT_MAP_FILTERS,
    openNow,
  });

  // Sync parent openNow into local filters
  useEffect(() => {
    setLocalFilters((f) => ({ ...f, openNow }));
  }, [openNow]);

  // When local openNow chip changes, propagate to parent
  const handleFiltersChange = useCallback(
    (next: MapFilterState) => {
      setLocalFilters(next);
      if (next.openNow !== openNow) onOpenNowChange(next.openNow);
    },
    [openNow, onOpenNowChange],
  );

  // ── Display venues: parent-filtered → local-filtered ───────────────────────
  const displayVenues = useMemo(
    () => applyMapFilters(venues, localFilters),
    [venues, localFilters],
  );

  // Fallback to cache when offline
  const effectiveVenues = useMemo(
    () => (isOffline && venues.length === 0 ? (cachedVenues as PublicVenue[]) : displayVenues),
    [isOffline, venues.length, cachedVenues, displayVenues],
  );

  // Update offline cache whenever we have fresh data
  useEffect(() => {
    if (!isOffline && venues.length > 0) updateCache(venues);
  }, [venues, isOffline, updateCache]);

  // ── Preview state (above-marker popup) ─────────────────────────────────────
  // projTick: incremented via OverlayView.draw() to re-evaluate pixel position
  const [projTick, setProjTick] = useState(0);

  const previewVenue = useMemo(
    () => (selectedVenueId ? effectiveVenues.find((v) => v.id === selectedVenueId) ?? null : null),
    [selectedVenueId, effectiveVenues],
  );

  // Compute pixel position of the preview anchor
  const previewPos = useMemo(() => {
    if (!previewVenue || previewVenue.latitude == null || previewVenue.longitude == null) return null;
    const proj = projOverlayRef.current?.getProjection();
    if (!proj) return null;
    const pt = proj.fromLatLngToDivPixel(
      new google.maps.LatLng(previewVenue.latitude, previewVenue.longitude),
    );
    return pt ? { x: pt.x, y: pt.y } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewVenue, projTick]);

  // ── Compare state ───────────────────────────────────────────────────────────
  const [compareVenues, setCompareVenues] = useState<PublicVenue[]>([]);

  const addToCompare = useCallback((venue: PublicVenue) => {
    setCompareVenues((prev) =>
      prev.length >= 3 || prev.find((v) => v.id === venue.id)
        ? prev
        : [...prev, venue],
    );
    trackEvent('compare_added', { venueId: venue.id });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setCompareVenues((prev) => prev.filter((v) => v.id !== id));
    trackEvent('compare_removed', { venueId: id });
  }, []);

  // ── Re-search area state ────────────────────────────────────────────────────
  const lastSearchBoundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [boundsFilteredIds, setBoundsFilteredIds] = useState<Set<string> | null>(null);

  const handleResearch = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    if (!bounds) return;
    setResearchLoading(true);
    lastSearchBoundsRef.current = bounds;
    setShowResearch(false);

    const ids = new Set(
      venuesRef.current
        .filter(
          (v) =>
            v.latitude != null &&
            v.longitude != null &&
            bounds.contains({ lat: v.latitude!, lng: v.longitude! }),
        )
        .map((v) => v.id),
    );
    setBoundsFilteredIds(ids);
    setResearchLoading(false);
    trackEvent('research_area_clicked');
  }, []);

  // Venues filtered by re-search bounds (null = show all)
  const venuesInView = useMemo(() => {
    if (!boundsFilteredIds) return effectiveVenues;
    return effectiveVenues.filter((v) => boundsFilteredIds.has(v.id));
  }, [effectiveVenues, boundsFilteredIds]);

  // ── Fullscreen state ────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cssFallbackFs, setCssFallbackFs] = useState(false);
  const [fullscreenSupported] = useState(() => !!document.fullscreenEnabled);

  // ── Avatar icon helpers ─────────────────────────────────────────────────────

  function iconCacheKey(id: string, sel: boolean, saved: boolean) {
    return `${id}_${sel ? 1 : 0}_${saved ? 1 : 0}`;
  }

  function getSyncFallbackIcon(venue: PublicVenue, isSelected: boolean, isSavedVenue: boolean): google.maps.Icon {
    const size = isSelected ? 56 : 44;
    const url = createInitialsSvg(venue, size, undefined, isSelected, isSavedVenue);
    return { url, scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size / 2, size / 2) };
  }

  async function getAvatarIcon(
    venue: PublicVenue,
    isSelected: boolean,
    isSavedVenue: boolean,
  ): Promise<google.maps.Icon> {
    const key = iconCacheKey(venue.id, isSelected, isSavedVenue);
    const size = isSelected ? 56 : 44;

    if (avatarCache.current.has(key)) {
      const url = avatarCache.current.get(key)!;
      return { url, scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size / 2, size / 2) };
    }

    // Generate async — may use canvas (CORS-permissive) or SVG fallback
    try {
      const url = await buildAvatarDataUrl(venue, {
        isSelected,
        isSaved: isSavedVenue,
        color: BUSY_HEX[venue.busy_status],
      });
      avatarCache.current.set(key, url);
      return { url, scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size / 2, size / 2) };
    } catch {
      const url = createInitialsSvg(venue, size, undefined, isSelected, isSavedVenue);
      avatarCache.current.set(key, url);
      return { url, scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size / 2, size / 2) };
    }
  }

  // Async: update a single marker's icon when its state changes
  async function refreshMarkerIcon(venue: PublicVenue, isSelected: boolean, isSavedVenue: boolean) {
    const marker = markersRef.current.get(venue.id);
    if (!marker) return;
    // Invalidate cached icon so it regenerates with new state
    const key = iconCacheKey(venue.id, isSelected, isSavedVenue);
    avatarCache.current.delete(key);
    const icon = await getAvatarIcon(venue, isSelected, isSavedVenue);
    marker.setIcon(icon);
    marker.setZIndex(isSelected ? 100 : 1);
  }

  // ── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !mapDivRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM },
      gestureHandling: 'greedy',
      styles: DARK_STYLE,
      clickableIcons: false,
    });

    mapRef.current = map;

    // Background click → deselect
    map.addListener('click', () => onVenueSelectRef.current(null));

    // Close preview on drag start
    map.addListener('dragstart', () => onVenueSelectRef.current(null));

    // OverlayView for pixel coordinate projection
    const projOverlay = new google.maps.OverlayView();
    let projDrawTimer: ReturnType<typeof setTimeout>;
    projOverlay.draw = () => {
      clearTimeout(projDrawTimer);
      projDrawTimer = setTimeout(() => setProjTick((n) => n + 1), 16);
    };
    projOverlay.setMap(map);
    projOverlayRef.current = projOverlay;

    // Track bounds for re-search
    map.addListener('idle', () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        const currentBounds = map.getBounds();
        if (!currentBounds) return;
        if (
          lastSearchBoundsRef.current &&
          !lastSearchBoundsRef.current.equals(currentBounds)
        ) {
          setShowResearch(true);
        }
        if (!lastSearchBoundsRef.current) {
          lastSearchBoundsRef.current = currentBounds;
        }
      }, 400);
    });

    // Cluster renderer
    clustererRef.current = new MarkerClusterer({
      map,
      renderer: {
        render({ count, position }) {
          return new google.maps.Marker({
            position,
            icon: clusterMarkerIcon(count),
            zIndex: 1000,
          });
        },
      },
    });

    trackEvent('map_loaded');

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isReady]);

  // ── Rebuild markers when venuesInView changes ──────────────────────────────
  useEffect(() => {
    if (!isReady || !mapRef.current || !clustererRef.current) return;

    const clusterer = clustererRef.current;
    clusterer.clearMarkers();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    const newMarkers: google.maps.Marker[] = [];

    venuesInView.forEach((venue) => {
      if (venue.latitude == null || venue.longitude == null) return;

      const isSelected = venue.id === selectedVenueId;
      const isSavedVenue = savedIdsRef.current.has(venue.id);

      // Start with synchronous SVG fallback (renders immediately)
      const fallbackIcon = getSyncFallbackIcon(venue, isSelected, isSavedVenue);

      const marker = new google.maps.Marker({
        position: { lat: venue.latitude, lng: venue.longitude },
        title: venue.name,
        icon: fallbackIcon,
        zIndex: isSelected ? 100 : 1,
        optimized: false,
      });

      // Asynchronously upgrade to canvas avatar
      getAvatarIcon(venue, isSelected, isSavedVenue).then((icon) => {
        if (markersRef.current.has(venue.id)) {
          marker.setIcon(icon);
        }
      });

      // Click → select + show preview
      marker.addListener('click', () => {
        const current = venuesRef.current.find((v) => v.id === venue.id) ?? venue;
        onVenueSelectRef.current(current.id);
        trackEvent('marker_clicked', { venueId: current.id, venueName: current.name });
      });

      markersRef.current.set(venue.id, marker);
      newMarkers.push(marker);
    });

    clusterer.addMarkers(newMarkers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venuesInView, isReady]);

  // ── Update marker icons on selection/saved state changes ──────────────────
  useEffect(() => {
    if (!isReady) return;
    markersRef.current.forEach((_, id) => {
      const venue = venuesRef.current.find((v) => v.id === id);
      if (!venue) return;
      const isSelected = id === selectedVenueId;
      const isSavedVenue = savedIdsRef.current.has(id);
      refreshMarkerIcon(venue, isSelected, isSavedVenue);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVenueId, savedIds, isReady]);

  // ── Pan to selected venue ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !mapRef.current || !selectedVenueId) return;
    const venue = effectiveVenues.find((v) => v.id === selectedVenueId);
    if (!venue || venue.latitude == null || venue.longitude == null) return;
    mapRef.current.panTo({ lat: venue.latitude, lng: venue.longitude });
  }, [selectedVenueId, effectiveVenues, isReady]);

  // ── Locate me ─────────────────────────────────────────────────────────────
  const handleLocate = useCallback(() => {
    if (!mapRef.current) return;
    trackEvent('locate_clicked');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onUserLocationChange(loc);
        mapRef.current!.panTo(loc);
        mapRef.current!.setZoom(15);
        if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(loc);
        } else {
          userMarkerRef.current = new google.maps.Marker({
            position: loc,
            map: mapRef.current!,
            title: 'You are here',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 3,
              scale: 10,
            },
            zIndex: 999,
          });
        }
      },
      () => {
        console.info('[TAPN] Geolocation denied');
      },
    );
  }, [onUserLocationChange]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const handleFullscreenToggle = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement && !cssFallbackFs) {
      containerRef.current.requestFullscreen().catch(() => {
        setCssFallbackFs(true);
        setIsFullscreen(true);
        trackEvent('fullscreen_entered');
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      setCssFallbackFs(false);
      setIsFullscreen(false);
      trackEvent('fullscreen_exited');
    }
  }, [cssFallbackFs]);

  useEffect(() => {
    const handler = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) setCssFallbackFs(false);
      if (mapRef.current) google.maps.event.trigger(mapRef.current, 'resize');
      trackEvent(active ? 'fullscreen_entered' : 'fullscreen_exited');
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cssFallbackFs) {
        setCssFallbackFs(false);
        setIsFullscreen(false);
        trackEvent('fullscreen_exited');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cssFallbackFs]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (mapsLoading) {
    return (
      <div className="relative w-full h-full rounded-xl overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-xl" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="relative w-full h-full rounded-xl bg-secondary/50 border border-border flex flex-col items-center justify-center gap-4 p-8 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-foreground mb-1">Map couldn't load</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full rounded-xl overflow-hidden ${
        cssFallbackFs ? 'fixed inset-0 z-[9999] rounded-none' : ''
      }`}
    >
      {/* Google Maps DOM node — full width, full height */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* ── Offline banner ───────────────────────────────────────────── */}
      {isOffline && (
        <div
          className="absolute top-0 left-0 right-0 z-[10] flex items-center justify-center gap-2 py-2 text-[12px] font-medium text-yellow-300"
          style={{ background: 'rgba(120,80,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <WifiOff className="h-3.5 w-3.5" />
          Offline — showing cached venues
          {cachedVenues.length > 0 && (
            <span className="opacity-70">({cachedVenues.length} saved)</span>
          )}
        </div>
      )}

      {/* ── Filter bar — overlaid at top ─────────────────────────────── */}
      <MapFiltersBar
        filters={localFilters}
        onChange={handleFiltersChange}
        venueCount={venuesInView.length}
      />

      {/* ── Above-marker venue preview ───────────────────────────────── */}
      {previewVenue && previewPos && (
        <MapMarkerPreview
          venue={previewVenue}
          pos={previewPos}
          isSaved={isSaved(previewVenue.id)}
          inCompare={compareVenues.some((v) => v.id === previewVenue.id)}
          compareCount={compareVenues.length}
          userLocation={userLocation}
          onClose={() => onVenueSelect(null)}
          onToggleSave={(id) => {
            toggleSave(id);
            trackEvent(isSaved(id) ? 'venue_unsaved' : 'venue_saved', { venueId: id });
          }}
          onAddToCompare={addToCompare}
          onRemoveFromCompare={removeFromCompare}
        />
      )}

      {/* ── Re-search this area button ───────────────────────────────── */}
      {showResearch && !isOffline && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-[6] pointer-events-auto"
          style={{ marginTop: '80px' }}
        >
          <button
            type="button"
            onClick={handleResearch}
            disabled={researchLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white shadow-xl transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70"
            style={{
              background: 'rgba(8,8,20,0.92)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.25)',
            }}
          >
            {researchLoading ? (
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-primary" />
            )}
            Re-search this area
          </button>
        </div>
      )}

      {/* ── Map controls — top right ─────────────────────────────────── */}
      <MapControls
        onLocate={handleLocate}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreenToggle}
        fullscreenSupported={fullscreenSupported}
        openNow={localFilters.openNow}
        onOpenNowToggle={() => handleFiltersChange({ ...localFilters, openNow: !localFilters.openNow })}
      />

      {/* ── Map legend — bottom right ────────────────────────────────── */}
      <MapLegend />

      {/* ── Compare sheet — bottom overlay ──────────────────────────── */}
      <MapCompareSheet
        venues={compareVenues}
        userLocation={userLocation}
        onRemove={removeFromCompare}
        onClear={() => setCompareVenues([])}
      />

      {/* Mobile close fullscreen */}
      {isFullscreen && (
        <button
          onClick={handleFullscreenToggle}
          className="absolute top-3 left-3 z-[9] bg-background/90 backdrop-blur-sm border border-border text-foreground px-3 py-2 rounded-lg text-sm font-medium shadow-md sm:hidden"
          aria-label="Exit fullscreen"
        >
          Close
        </button>
      )}
    </div>
  );
});
