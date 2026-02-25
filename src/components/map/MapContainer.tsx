import {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo,
} from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { PublicVenue } from '@/types/venue';
import {
  BUSY_HEX,
  DEFAULT_CENTER,
  trackEvent,
} from '@/lib/mapUtils';
import { MapControls } from './MapControls';
import { MapFloatingPanel } from './MapFloatingPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, LayoutList } from 'lucide-react';

// ─── Enhanced dark map style with pink/purple highway accents (Feature 6) ─────

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  // Base geometry — deep near-black navy
  { elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  // Global label colours
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d1a' }] },
  // Hide all POIs so venues stand out
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f0f1e' }] },
  // Administrative
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca3af' }],
  },
  // Roads — base fill/stroke
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1a1a30' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f0f22' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  // Arterial roads — slightly lighter
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1e1e36' }] },
  // Highways — purple/pink accent (Feature 6)
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2d1b4e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#6b21a8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c084fc' }],
  },
  // Transit
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111118' }] },
  // Water — very deep
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050510' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e1e35' }] },
];

// ─── Venue marker icon (Features 4 + 9) ──────────────────────────────────────
//
// • All states share the same 44×44 canvas so the anchor never shifts.
// • isHovered  → animated pulsing ring (marker hover → sync to card)
// • isSelected → static ring
// • withFadeIn → SVG <g> opacity 0→1 on mount (Feature 9)
// • Requires optimized:false on the Marker for SMIL to render (Feature 9)

function venueMarkerIcon(
  color: string,
  isSelected: boolean,
  isHovered = false,
  withFadeIn = false,
): google.maps.Icon {
  const SIZE = 44;
  const cx = 22;
  const cy = 22;
  const r = isSelected ? 14 : isHovered ? 13 : 11;
  const strokeW = isSelected ? 3 : 2;

  // Outer ring element
  let ringEl = '';
  if (isSelected) {
    ringEl = `<circle cx="${cx}" cy="${cy}" r="19" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.45"/>`;
  } else if (isHovered) {
    // Animated pulsing ring (Feature 4)
    ringEl = `<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="${color}" stroke-width="2" opacity="0.45">
      <animate attributeName="r" values="15;20;15" dur="1.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.45;0.1;0.45" dur="1.4s" repeatCount="indefinite"/>
    </circle>`;
  }

  // Wrap in <g> for a single fade-in over the whole marker (ring + dot)
  const innerContent = `${ringEl}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="white" stroke-width="${strokeW}"/>`;

  const content = withFadeIn
    ? `<g><animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze"/>${innerContent}</g>`
    : innerContent;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${content}</svg>`;

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(SIZE, SIZE),
    anchor: new google.maps.Point(cx, cy),
  };
}

// ─── Cluster marker icon with glow filter (Feature 3) ────────────────────────

function clusterMarkerIcon(count: number): google.maps.Icon {
  const label = count > 99 ? '99+' : String(count);
  // SVG feGaussianBlur glow + outer translucent ring + radial gradient fill
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <filter id="cglow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <circle cx="28" cy="28" r="26" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.30)" stroke-width="1.5"/>
  <circle cx="28" cy="28" r="19" fill="url(#cg)" filter="url(#cglow)" stroke="rgba(255,255,255,0.9)" stroke-width="2.5"/>
  <text x="28" y="33" text-anchor="middle" fill="white" font-size="12" font-weight="700" font-family="Outfit,sans-serif">${label}</text>
</svg>`;

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(56, 56),
    anchor: new google.maps.Point(28, 28),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface MapContainerProps {
  venues: PublicVenue[];
  selectedVenueId: string | null;
  onVenueSelect: (id: string | null) => void;
  userLocation: { lat: number; lng: number } | null;
  onUserLocationChange: (loc: { lat: number; lng: number } | null) => void;
  openNow: boolean;
  onOpenNowChange: (value: boolean) => void;
  /** Whether venue data is still loading — forwarded to the floating panel */
  isLoading: boolean;
}

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

  // DOM refs
  const mapDivRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Maps API refs — never trigger re-renders
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback ref — marker click handlers read the latest onVenueSelect
  const onVenueSelectRef = useRef(onVenueSelect);
  useEffect(() => {
    onVenueSelectRef.current = onVenueSelect;
  }, [onVenueSelect]);

  const venuesRef = useRef(venues);
  useEffect(() => {
    venuesRef.current = venues;
  }, [venues]);

  // Floating panel visibility + hover sync (Feature 1 + 4)
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cssFallbackFs, setCssFallbackFs] = useState(false);
  const [fullscreenSupported] = useState(() => !!document.fullscreenEnabled);

  // ── Initialize map (once when Maps API is ready) ──────────────────────────
  useEffect(() => {
    if (!isReady || !mapDivRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
      gestureHandling: 'greedy',
      styles: DARK_STYLE,
      clickableIcons: false,
    });

    mapRef.current = map;

    // Map background click → deselect venue
    map.addListener('click', () => {
      onVenueSelectRef.current(null);
    });

    // Debounced idle — placeholder for future camera-state persistence
    map.addListener('idle', () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        /* future: persist camera state */
      }, 300);
    });

    // Marker clusterer with brand-styled cluster icons (Feature 3)
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

  // ── Rebuild all markers when venue list changes ───────────────────────────
  useEffect(() => {
    if (!isReady || !mapRef.current || !clustererRef.current) return;

    const clusterer = clustererRef.current;

    // Tear down existing markers
    clusterer.clearMarkers();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    const newMarkers: google.maps.Marker[] = [];

    venues.forEach((venue) => {
      if (venue.latitude == null || venue.longitude == null) return;

      const isSelected = venue.id === selectedVenueId;
      const color = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;

      const marker = new google.maps.Marker({
        position: { lat: venue.latitude, lng: venue.longitude },
        title: venue.name,
        // withFadeIn=true: each new marker fades in (Feature 9)
        icon: venueMarkerIcon(color, isSelected, false, true),
        zIndex: isSelected ? 100 : 1,
        // Required for SMIL animations to render (Feature 9)
        optimized: false,
      });

      // Marker click → select venue + open floating panel
      marker.addListener('click', () => {
        const current = venuesRef.current.find((v) => v.id === venue.id) ?? venue;
        onVenueSelectRef.current(current.id);
        setIsPanelOpen(true);
        trackEvent('marker_clicked', { venueId: current.id, venueName: current.name });
      });

      // Hover sync: marker hover → highlight card in panel (Feature 4)
      // setHoveredVenueId is a stable React setter — no stale closure issue
      marker.addListener('mouseover', () => setHoveredVenueId(venue.id));
      marker.addListener('mouseout', () => setHoveredVenueId(null));

      markersRef.current.set(venue.id, marker);
      newMarkers.push(marker);
    });

    clusterer.addMarkers(newMarkers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, isReady]);

  // ── Update marker icons when selection or hover changes ───────────────────
  // (no fade-in on updates — avoids re-triggering animation on every hover)
  useEffect(() => {
    if (!isReady) return;
    markersRef.current.forEach((marker, id) => {
      const venue = venuesRef.current.find((v) => v.id === id);
      if (!venue) return;
      const isSel = id === selectedVenueId;
      const isHov = id === hoveredVenueId;
      const color = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;
      marker.setIcon(venueMarkerIcon(color, isSel, isHov, false));
      marker.setZIndex(isSel ? 100 : isHov ? 50 : 1);
    });
  }, [selectedVenueId, hoveredVenueId, isReady]);

  // ── Pan to selected venue ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !mapRef.current || !selectedVenueId) return;
    const venue = venues.find((v) => v.id === selectedVenueId);
    if (!venue || venue.latitude == null || venue.longitude == null) return;
    mapRef.current.panTo({ lat: venue.latitude, lng: venue.longitude });
  }, [selectedVenueId, venues, isReady]);

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
        console.info('[TAPN] Geolocation denied, staying at default center.');
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

  // Sync fullscreen state with the native Fullscreen API
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

  // Escape key exits CSS-fallback fullscreen
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
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.location.reload()}
          >
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
      {/* Google Maps DOM node */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* ── Floating glass panel — desktop only (Feature 1) ──────────────── */}
      <MapFloatingPanel
        venues={venues}
        selectedVenueId={selectedVenueId}
        hoveredVenueId={hoveredVenueId}
        userLocation={userLocation}
        isLoading={isLoading}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onVenueSelect={(id) => {
          onVenueSelect(id);
          trackEvent('panel_venue_selected', { venueId: id });
        }}
        onVenueHover={setHoveredVenueId}
      />

      {/* ── Re-open panel button — desktop only, shown when panel is closed ── */}
      {!isPanelOpen && (
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="absolute left-3 top-3 z-[4] hidden lg:flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-foreground shadow-lg hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Show venue list"
        >
          <LayoutList className="h-4 w-4 text-primary" />
          <span>Venues</span>
          {venues.length > 0 && (
            <span className="ml-0.5 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {venues.length}
            </span>
          )}
        </button>
      )}

      {/* ── Map controls — top right ─────────────────────────────────────── */}
      <MapControls
        onLocate={handleLocate}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreenToggle}
        fullscreenSupported={fullscreenSupported}
        openNow={openNow}
        onOpenNowToggle={() => {
          onOpenNowChange(!openNow);
          trackEvent('filter_applied', { openNow: !openNow });
        }}
      />

      {/* Mobile "Close" button shown only during fullscreen */}
      {isFullscreen && (
        <button
          onClick={handleFullscreenToggle}
          className="absolute top-3 left-3 z-[5] bg-background/90 backdrop-blur-sm border border-border text-foreground px-3 py-2 rounded-lg text-sm font-medium shadow-md sm:hidden"
          aria-label="Exit fullscreen"
        >
          Close
        </button>
      )}
    </div>
  );
});
