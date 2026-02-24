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
  BUSY_LABELS,
  DEFAULT_CENTER,
  isVenueOpenNow,
  trackEvent,
} from '@/lib/mapUtils';
import { MapControls } from './MapControls';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin } from 'lucide-react';

// ─── Dark map styles — matches the app's dark theme ─────────────────────────
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#2d2d44' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#181829' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c42' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#373750' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c3c55' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1f1f30' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e0e1a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d53' }],
  },
];

// ─── Marker icon helpers ─────────────────────────────────────────────────────

function venueMarkerIcon(
  color: string,
  isSelected: boolean,
): google.maps.Icon {
  const size = isSelected ? 44 : 36;
  const r = isSelected ? 14 : 11;
  const ring = isSelected
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="19" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.45"/>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ring}<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}" stroke="white" stroke-width="${isSelected ? 3 : 2}"/></svg>`;
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

function clusterMarkerIcon(count: number): google.maps.Icon {
  const label = count > 99 ? '99+' : String(count);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><circle cx="22" cy="22" r="20" fill="url(#cg)" stroke="white" stroke-width="3"/><text x="22" y="27" text-anchor="middle" fill="white" font-size="13" font-weight="700" font-family="Outfit,sans-serif">${label}</text></svg>`;
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 44),
    anchor: new google.maps.Point(22, 22),
  };
}

// ─── InfoWindow HTML template ────────────────────────────────────────────────

function buildInfoWindowContent(venue: PublicVenue): string {
  const isOpen = isVenueOpenNow(venue);
  const busyColor = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
  const price = venue.price_per_hour
    ? venue.price_per_hour >= 1000
      ? `₮${(venue.price_per_hour / 1000).toFixed(0)}K/цаг`
      : `₮${venue.price_per_hour}/цаг`
    : null;
  const img = venue.images?.[0]
    ? `<img src="${venue.images[0]}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;" alt="" />`
    : '';

  return `<div style="font-family:Outfit,sans-serif;background:#1a1a2e;color:#f1f5f9;border-radius:12px;padding:12px 14px;min-width:200px;max-width:260px;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    ${img}
    <div style="min-width:0;flex:1;">
      <h3 style="margin:0 0 3px;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${venue.name}</h3>
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
        <span style="background:${busyColor};color:white;padding:1px 7px;border-radius:9999px;font-size:10px;font-weight:700;">${BUSY_LABELS[venue.busy_status]}</span>
        <span style="font-size:11px;color:${isOpen ? '#22c55e' : '#64748b'};">${isOpen ? '● Open' : '● Closed'}</span>
      </div>
    </div>
  </div>
  <p style="margin:0 0 2px;font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${venue.address || venue.city}</p>
  ${price ? `<p style="margin:0 0 10px;font-size:11px;color:#a855f7;font-weight:500;">${price}</p>` : '<div style="margin-bottom:10px;"></div>'}
  <div style="display:flex;gap:6px;">
    <a href="/venues/${venue.id}" style="flex:1;background:rgba(168,85,247,0.15);color:#a855f7;border:1px solid rgba(168,85,247,0.4);padding:6px 0;border-radius:8px;text-align:center;font-size:12px;font-weight:500;text-decoration:none;display:block;">View</a>
    <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.4);padding:6px 10px;border-radius:8px;font-size:12px;font-weight:500;text-decoration:none;display:block;white-space:nowrap;">Directions</a>
  </div>
</div>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface MapContainerProps {
  venues: PublicVenue[];
  selectedVenueId: string | null;
  onVenueSelect: (id: string | null) => void;
  userLocation: { lat: number; lng: number } | null;
  onUserLocationChange: (loc: { lat: number; lng: number } | null) => void;
  openNow: boolean;
  onOpenNowChange: (value: boolean) => void;
}

export const MapContainer = memo(function MapContainer({
  venues,
  selectedVenueId,
  onVenueSelect,
  userLocation,
  onUserLocationChange,
  openNow,
  onOpenNowChange,
}: MapContainerProps) {
  const { isLoading, isReady, isError, error } = useGoogleMaps();

  // DOM refs
  const mapDivRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Maps API refs — never trigger re-renders
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs so marker click handlers never go stale
  const onVenueSelectRef = useRef(onVenueSelect);
  useEffect(() => {
    onVenueSelectRef.current = onVenueSelect;
  }, [onVenueSelect]);

  const venuesRef = useRef(venues);
  useEffect(() => {
    venuesRef.current = venues;
  }, [venues]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cssFallbackFs, setCssFallbackFs] = useState(false);
  const [fullscreenSupported] = useState(() => !!document.fullscreenEnabled);

  // ── Initialize map (only once when API is ready) ──────────────────────────
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

    // Click on map background deselects venue and closes info window
    map.addListener('click', () => {
      infoWindowRef.current?.close();
      onVenueSelectRef.current(null);
    });

    // Debounced idle — placeholder for future camera-state persistence
    map.addListener('idle', () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        /* future: persist camera state */
      }, 300);
    });

    // Shared info window — reused for all markers
    infoWindowRef.current = new google.maps.InfoWindow({
      maxWidth: 280,
      disableAutoPan: false,
    });

    // Marker clusterer with brand-styled cluster icons
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

  // ── Rebuild markers when venue list changes ───────────────────────────────
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
        icon: venueMarkerIcon(color, isSelected),
        zIndex: isSelected ? 100 : 1,
        optimized: true,
      });

      marker.addListener('click', () => {
        // Always read from refs so we have the latest venue data
        const current = venuesRef.current.find((v) => v.id === venue.id) ?? venue;
        onVenueSelectRef.current(current.id);
        trackEvent('marker_clicked', { venueId: current.id, venueName: current.name });

        if (infoWindowRef.current && mapRef.current) {
          infoWindowRef.current.setContent(buildInfoWindowContent(current));
          infoWindowRef.current.open({ anchor: marker, map: mapRef.current });
        }
      });

      markersRef.current.set(venue.id, marker);
      newMarkers.push(marker);
    });

    clusterer.addMarkers(newMarkers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, isReady]);

  // ── Update marker styles when selection changes (no re-creation) ──────────
  useEffect(() => {
    if (!isReady) return;
    markersRef.current.forEach((marker, id) => {
      const venue = venuesRef.current.find((v) => v.id === id);
      if (!venue) return;
      const isSelected = id === selectedVenueId;
      const color = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;
      marker.setIcon(venueMarkerIcon(color, isSelected));
      marker.setZIndex(isSelected ? 100 : 1);
    });
    // Close info window when deselecting
    if (!selectedVenueId) {
      infoWindowRef.current?.close();
    }
  }, [selectedVenueId, isReady]);

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

        // Place / update the "you are here" marker
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
        // Location denied — silently keep default center
        console.info('[TAPN] Geolocation denied, staying at default center.');
      },
    );
  }, [onUserLocationChange]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const handleFullscreenToggle = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement && !cssFallbackFs) {
      containerRef.current.requestFullscreen().catch(() => {
        // CSS fallback when native fullscreen is unavailable
        setCssFallbackFs(true);
        setIsFullscreen(true);
        trackEvent('fullscreen_entered');
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      // Exit CSS fallback
      setCssFallbackFs(false);
      setIsFullscreen(false);
      trackEvent('fullscreen_exited');
    }
  }, [cssFallbackFs]);

  // Sync fullscreen state with native Fullscreen API events
  useEffect(() => {
    const handler = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) setCssFallbackFs(false);
      // Tell Google Maps to recalculate its size
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
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

  if (isLoading) {
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
      {/* The Google Maps DOM node */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* Overlay controls */}
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
