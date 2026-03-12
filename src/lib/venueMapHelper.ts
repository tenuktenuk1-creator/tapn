/**
 * venueMapHelper.ts — Static map URL builder for the VenueCard hover state.
 *
 * ── Design decisions ──────────────────────────────────────────────────────────
 *
 *  Map type: roadmap (not satellite)
 *    Satellite tiles at 270 px card width look muddy and are hard to orient.
 *    A dark-styled roadmap with muted palette is readable and premium.
 *
 *  Zoom 16 — neighbourhood scale
 *    Shows one or two city blocks around the venue: close enough to be
 *    spatially useful, far enough to see cross-streets for orientation.
 *    At the card's 4:3 image area (~270 × 203 px) this is the right balance.
 *
 *  Single venue marker — no nearby-place markers
 *    Nearby-place markers require the Google Places Nearby Search API which:
 *      • Has no browser-CORS support on the REST endpoint
 *      • Requires separate API enablement and billing
 *      • Needs an async round-trip before the map URL can be built
 *      • At ~270 px card width, secondary marker labels would be ≤ 9 px — illegible
 *    A single brand-pink pin on a clean dark map is the better card-scale UX.
 *    To add nearby places in the future: use a Supabase Edge Function as a
 *    CORS proxy to the Places Nearby Search endpoint and rebuild the URL with
 *    extra `&markers=` params using the returned coordinates.
 *
 *  Dark palette — matched to TAPN's card-dark tokens (Tailwind slate scale):
 *    Geometry base   #0f172a  (slate-950 — matches card-dark background)
 *    Local roads     #1e293b  (slate-800)
 *    Arterial roads  #334155  (slate-700)
 *    Highways        #475569  (slate-600)
 *    Water           #020617  (near-black blue)
 *    Label text      #94a3b8  (slate-400 — muted but readable)
 *    Venue marker    #ff2bd6  (TAPN primary / brand fuchsia)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PublicVenue } from '@/types/venue';

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/**
 * Individual style rules for the static map.
 * Format: `feature:{featureType}|element:{elementType}|{modifier}:{value}`
 *
 * Multiple modifiers in one rule are pipe-separated:
 *   `feature:road.highway|element:geometry|color:0x475569|weight:1`
 */
const STATIC_MAP_STYLES: readonly string[] = [
  // ── Base geometry — slate-950 across everything ───────────────────────────
  'feature:all|element:geometry|color:0x0f172a',
  'feature:all|element:geometry.stroke|color:0x1e293b',

  // ── Labels — muted slate-400, stroke matches base so halos are dark ───────
  'feature:all|element:labels.text.fill|color:0x94a3b8',
  'feature:all|element:labels.text.stroke|color:0x0f172a',

  // ── Roads ─────────────────────────────────────────────────────────────────
  'feature:road.local|element:geometry|color:0x1e293b',
  'feature:road.arterial|element:geometry|color:0x334155',
  'feature:road.highway|element:geometry|color:0x475569',
  'feature:road.highway|element:geometry.stroke|color:0x1e293b',

  // ── Water — near-black with subtle blue cast ──────────────────────────────
  'feature:water|element:geometry|color:0x020617',

  // ── Landscape — slightly differentiated dark fills ────────────────────────
  'feature:landscape.natural|element:geometry|color:0x0d1f2d',
  'feature:landscape.man_made|element:geometry|color:0x0f172a',

  // ── POI — suppress distracting icons; keep area fill subtle ──────────────
  'feature:poi|element:geometry|color:0x132030',
  'feature:poi|element:labels.icon|visibility:off',
  'feature:poi.park|element:geometry|color:0x0d2318',

  // ── Transit — fully hidden (reduces clutter at card scale) ───────────────
  'feature:transit|visibility:off',
];

/**
 * Builds a Google Static Maps URL for the given coordinates using the
 * TAPN dark palette and a single brand-coloured venue marker.
 *
 * Returns `null` when `VITE_GOOGLE_MAPS_API_KEY` is not set — VenueCard
 * will skip the crossfade and fall back to the subtle scale hover instead.
 */
export function buildVenueMapUrl(lat: number, lng: number): string | null {
  if (!GMAPS_KEY) return null;

  const styleParams = STATIC_MAP_STYLES.map(s => `&style=${s}`).join('');

  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}` +
    `&zoom=16` +
    `&size=600x450` +
    `&scale=2` +           // retina-quality tile at 2×
    `&maptype=roadmap` +
    // Single TAPN-fuchsia venue marker, no text label
    `&markers=color:0xff2bd6|size:lrg|${lat},${lng}` +
    styleParams +
    `&key=${GMAPS_KEY}`
  );
}

/**
 * Returns the best location image URL for a venue's hover crossfade:
 *
 *   1. `images[1]`  — explicitly uploaded secondary / location photo
 *   2. Static map   — dark-styled roadmap built from venue coordinates
 *   3. `null`       — no crossfade (no second image and no coordinates)
 */
export function getVenueLocationImage(venue: PublicVenue): string | null {
  // Prefer an explicitly uploaded secondary image (future venue owners may
  // upload an exterior shot or alternative interior as images[1])
  if (venue.images && venue.images.length >= 2) {
    return venue.images[1];
  }

  // Fall back to a generated dark map from the venue's stored coordinates
  if (venue.latitude != null && venue.longitude != null) {
    return buildVenueMapUrl(venue.latitude, venue.longitude);
  }

  return null;
}
