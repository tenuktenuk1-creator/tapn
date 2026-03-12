/**
 * VenueCard — animated venue discovery card for the Venues page.
 *
 * Motion behaviour (card content only — nav and page layout are never animated):
 *   • 3-D perspective tilt on mouse-move (spring, ≤ 5°)
 *   • Subtle per-venue-type glow halo behind the card on hover
 *   • On hover: cover photo cross-fades to a dark styled location map
 *   • Soft radial colour glow at the base of the image on hover
 *   • Venue name slides 3 px right + animated gradient underline grows in
 *   • "View Details" button lifts –1 px + arrow nudges right on hover
 *
 * Map logic lives in src/lib/venueMapHelper.ts — see that file for the
 * static map URL builder, dark palette choices, and the decision not to
 * add nearby-place markers at this card scale.
 *
 * All hover effects require a pointer device; touch renders statically.
 */

import type React from 'react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock, Zap, Users, ArrowRight } from 'lucide-react';
import { PublicVenue, venueTypeLabels, priceTierLabels } from '@/types/venue';
import { getVenueLocationImage } from '@/lib/venueMapHelper';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VenueCardProps {
  venue: PublicVenue;
}

// ─── Open-status logic ────────────────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

type OpenStatusResult = {
  label: 'OPEN' | 'BUSY' | 'FULL' | 'CLOSED' | 'SOON';
  timeLabel: string;
  isOpen: boolean;
  closingSoon: boolean;
  openingSoon: boolean;
};

function getOpenStatus(venue: PublicVenue): OpenStatusResult {
  const SOON_THRESHOLD = 30;

  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0) {
    return { label: 'OPEN', timeLabel: 'Open Now', isOpen: true, closingSoon: false, openingSoon: false };
  }

  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const todayName = DAYS[now.getDay()];
  const todayHours = venue.opening_hours[todayName];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!todayHours || todayHours.open === 'closed' || todayHours.close === 'closed') {
    return { label: 'CLOSED', timeLabel: 'Closed Today', isOpen: false, closingSoon: false, openingSoon: false };
  }

  const openMin  = toMinutes(todayHours.open);
  const closeMin = toMinutes(todayHours.close);
  const isMidnightCross = closeMin < openMin;

  let isCurrentlyOpen: boolean;
  if (isMidnightCross) {
    isCurrentlyOpen = currentMinutes >= openMin || currentMinutes < closeMin;
  } else {
    isCurrentlyOpen = currentMinutes >= openMin && currentMinutes < closeMin;
  }

  if (isCurrentlyOpen) {
    let minutesUntilClose: number;
    if (isMidnightCross) {
      minutesUntilClose = currentMinutes >= openMin
        ? (1440 - currentMinutes) + closeMin
        : closeMin - currentMinutes;
    } else {
      minutesUntilClose = closeMin - currentMinutes;
    }

    const closingSoon = minutesUntilClose <= SOON_THRESHOLD;
    const busy = venue.busy_status || 'quiet';

    if (busy === 'busy')     return { label: 'FULL', timeLabel: 'Very Busy Now',                              isOpen: true, closingSoon, openingSoon: false };
    if (busy === 'moderate') return { label: 'BUSY', timeLabel: `Moderate · Closes ${todayHours.close}`,     isOpen: true, closingSoon, openingSoon: false };
    if (closingSoon)         return { label: 'OPEN', timeLabel: `Closes soon · ${todayHours.close}`,         isOpen: true, closingSoon: true, openingSoon: false };
    return                         { label: 'OPEN', timeLabel: `Open · Closes ${todayHours.close}`,          isOpen: true, closingSoon: false, openingSoon: false };
  }

  const minutesUntilOpen = currentMinutes < openMin
    ? openMin - currentMinutes
    : (1440 - currentMinutes) + openMin;

  if (minutesUntilOpen <= SOON_THRESHOLD) {
    return { label: 'SOON', timeLabel: `Opens at ${todayHours.open}`, isOpen: false, closingSoon: false, openingSoon: true };
  }
  if (currentMinutes < openMin) {
    return { label: 'CLOSED', timeLabel: `Opens at ${todayHours.open}`, isOpen: false, closingSoon: false, openingSoon: false };
  }
  return { label: 'CLOSED', timeLabel: 'Closed Today', isOpen: false, closingSoon: false, openingSoon: false };
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const VENUE_TYPE_COLORS: Record<string, string> = {
  cafe:         'bg-orange-500',
  karaoke:      'bg-pink-500',
  pool_snooker: 'bg-blue-500',
  lounge:       'bg-purple-500',
};

/**
 * Per-category outer glow — sits behind the card (outside overflow:hidden).
 * Low opacity so it reads as ambient light, not a heavy decoration.
 */
const VENUE_GLOW: Record<string, string> = {
  cafe:         'rgba(249,115,22,0.20)',
  karaoke:      'rgba(236,72,153,0.20)',
  pool_snooker: 'rgba(59,130,246,0.20)',
  lounge:       'rgba(168,85,247,0.20)',
};

/**
 * Per-category radial glow applied INSIDE the image area on hover.
 * Higher opacity than the outer halo so it reads as a soft light source
 * rising from the bottom of the image into the card content zone.
 * Stays inside overflow:hidden — respects the rounded image corners.
 */

const VENUE_UNDERLINE: Record<string, string> = {
  cafe:         'rgba(249,115,22,0.9)',
  karaoke:      'rgba(236,72,153,0.9)',
  pool_snooker: 'rgba(59,130,246,0.9)',
  lounge:       'rgba(168,85,247,0.9)',
};

function formatPrice(price: number | null): string {
  if (!price) return '';
  if (price >= 1000) return `₮${(price / 1000).toFixed(0)}K/цаг`;
  return `₮${price}/цаг`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VenueCard({ venue }: VenueCardProps) {
  const { label, timeLabel, isOpen, closingSoon, openingSoon } = getOpenStatus(venue);

  // ── Status badge colour ───────────────────────────────────────────────────
  const statusClassName =
    label === 'FULL'                   ? 'bg-red-500 text-white'
    : label === 'BUSY'                 ? 'bg-yellow-500 text-black'
    : label === 'SOON'                 ? 'bg-blue-500 text-white'
    : label === 'OPEN' && closingSoon  ? 'bg-orange-500 text-white'
    : label === 'OPEN'                 ? 'bg-green-500 text-white'
    :                                    'bg-gray-600 text-white';

  // ── Hours text colour ─────────────────────────────────────────────────────
  const timeClassName =
    label === 'FULL'                   ? 'text-red-500'
    : label === 'BUSY'                 ? 'text-yellow-500'
    : label === 'SOON'                 ? 'text-blue-400'
    : label === 'OPEN' && closingSoon  ? 'text-orange-400'
    : label === 'OPEN'                 ? 'text-green-500'
    :                                    'text-muted-foreground';

  const displayLabel = label === 'OPEN' && closingSoon ? 'SOON' : label;

  const topVibes     = venue.vibe_tags?.slice(0, 3)  ?? [];
  const topAmenities = venue.amenities?.slice(0, 3)  ?? [];

  const glowColor      = VENUE_GLOW[venue.venue_type]       ?? 'rgba(168,85,247,0.20)';
  const underlineColor = VENUE_UNDERLINE[venue.venue_type]  ?? 'rgba(168,85,247,0.9)';

  // images[0] = cover photo
  // locationImage = images[1] if present, else dark static map from lat/lng
  // (see src/lib/venueMapHelper.ts for the URL builder and design rationale)
  const coverImage    = venue.images?.[0] ?? null;
  const locationImage = getVenueLocationImage(venue);

  // ── Mouse-tracking tilt ───────────────────────────────────────────────────

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Normalised (–0.5 → 0.5) → degrees (±5°)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [ 5, -5]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-5,  5]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - left) / width  - 0.5);
    mouseY.set((e.clientY - top)  / height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /*
     * Outer wrapper:
     *   h-full   — fills the full CSS grid cell so all cards in a row are
     *              the same height regardless of content length.
     *   No overflow:hidden — the outer glow halo must bleed outside.
     */
    <div
      ref={containerRef}
      className="relative h-full"
      style={{ perspective: '1200px' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >

      {/*
       * Outer glow halo — sits BEHIND the card.
       * Small spread (–inset-1), modest blur (14 px), low-opacity colour,
       * animated peak opacity 0.65 → stays premium rather than overpowering.
       */}
      <motion.div
        aria-hidden
        className="absolute -inset-1 rounded-[20px] pointer-events-none"
        style={{ filter: 'blur(14px)', zIndex: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.65 : 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="absolute inset-0 rounded-[20px]" style={{ background: glowColor }} />
      </motion.div>

      {/*
       * Card surface — h-full so it fills the outer wrapper (= grid cell).
       * flex flex-col distributes: fixed image ↑, flex-1 content ↑, mt-auto button ↓
       */}
      <motion.div
        className="card-dark rounded-2xl overflow-hidden flex flex-col h-full relative"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          zIndex: 1,
        }}
      >
        {/* Full-card transparent link — behind badges (z-10) / above card (z-20) */}
        <Link
          to={`/venues/${venue.id}`}
          className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
          aria-label={`View details for ${venue.name}`}
          tabIndex={0}
        />

        {/* ── Image area ── */}
        <div className="aspect-[4/3] relative overflow-hidden flex-shrink-0">

          {coverImage ? (
            <>
              {/*
               * Cover photo — always the base layer.
               *
               * When locationImage is available:
               *   Fades to near-transparent (0.12) on hover — not 0 so it
               *   acts as a warm placeholder while the map tile loads.
               *
               * When locationImage is null:
               *   Stays at opacity 1; gentle 1.05 scale adds hover life.
               */}
              <motion.img
                src={coverImage}
                alt={venue.name}
                className="absolute inset-0 w-full h-full object-cover"
                animate={{
                  opacity: isHovered && locationImage ? 0.12 : 1,
                  scale:   isHovered && !locationImage ? 1.05 : 1,
                }}
                transition={{ duration: 0.48, ease: 'easeOut' }}
              />

              {/*
               * Location image — dark styled static map (or images[1]).
               * Fades in on hover, fully covers the image area.
               * loading="lazy" defers the API call until the card is in viewport.
               */}
              {locationImage && (
                <motion.img
                  src={locationImage}
                  alt={`${venue.name} — location`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                  transition={{ duration: 0.48, ease: 'easeOut' }}
                />
              )}
            </>
          ) : (
            /* Fallback for venues with no uploaded images */
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <span className="text-4xl font-display font-bold text-muted-foreground/30">
                {venue.name.charAt(0)}
              </span>
            </div>
          )}

          {/*
           * Dark vignette — uniform semi-transparent black overlay.
           * Makes the status/price badges pop on any background image.
           */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 0.22 : 0 }}
            transition={{ duration: 0.3 }}
          />


          {/* Status badge — top-right, above link layer */}
          <Badge
            className={`absolute top-3 right-3 z-20 ${statusClassName} border-0 rounded-full text-xs font-semibold shadow-md pointer-events-none`}
          >
            <span
              className={`w-2 h-2 rounded-full bg-current mr-1.5 ${isOpen || openingSoon ? 'animate-pulse' : ''}`}
            />
            {displayLabel}
          </Badge>

          {/* Category badge — bottom-left */}
          <Badge
            className={`absolute bottom-3 left-3 z-20 ${VENUE_TYPE_COLORS[venue.venue_type] ?? 'bg-gray-500'} text-white border-0 rounded-lg text-xs pointer-events-none`}
          >
            {venueTypeLabels[venue.venue_type]}
          </Badge>

          {/* Price badge — bottom-right */}
          {venue.price_per_hour ? (
            <Badge className="absolute bottom-3 right-3 z-20 bg-black/70 text-white border-0 rounded-lg text-xs backdrop-blur-sm pointer-events-none">
              {formatPrice(venue.price_per_hour)}
            </Badge>
          ) : null}

        </div>
        {/* ── end image area ── */}

        {/* ── Content ── */}
        <div className="p-5 flex flex-col flex-1">

          {/* Venue name + animated underline */}
          <div className="mb-1">
            <motion.h3
              className="font-display font-semibold text-lg text-foreground line-clamp-1"
              animate={{ x: isHovered ? 3 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              {venue.name}
            </motion.h3>
            <motion.div
              aria-hidden
              className="h-px mt-0.5"
              style={{
                background: `linear-gradient(to right, ${underlineColor}, rgba(255,255,255,0.1), transparent)`,
                originX: 0,
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isHovered ? 1 : 0 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
            />
          </div>

          {/* Rating & price tier */}
          <div className="flex items-center justify-between mb-3">
            {venue.rating && Number(venue.rating) > 0 ? (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-foreground">{Number(venue.rating).toFixed(1)}</span>
                {venue.review_count > 0 && (
                  <span className="text-muted-foreground text-sm">({venue.review_count})</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">No reviews yet</span>
            )}
            {venue.price_tier && (
              <Badge variant="outline" className="text-xs">
                {priceTierLabels[venue.price_tier]}
              </Badge>
            )}
          </div>

          {/* Location & hours */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{venue.address || venue.city}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className={`font-medium ${timeClassName}`}>{timeLabel}</span>
            </div>
            {isOpen && venue.busy_status && venue.busy_status !== 'quiet' && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className={venue.busy_status === 'busy' ? 'text-red-400' : 'text-yellow-400'}>
                  {venue.busy_status === 'busy' ? 'Very busy right now' : 'Moderately busy'}
                </span>
              </div>
            )}
          </div>

          {/* Vibe tags */}
          {topVibes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {topVibes.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  <Zap className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {(venue.vibe_tags?.length ?? 0) > 3 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{(venue.vibe_tags?.length ?? 0) - 3} more
                </span>
              )}
            </div>
          )}

          {/* Amenity chips */}
          {topAmenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {topAmenities.map((a) => (
                <span
                  key={a}
                  className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-xs"
                >
                  {a}
                </span>
              ))}
              {(venue.amenities?.length ?? 0) > 3 && (
                <span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-xs">
                  +{(venue.amenities?.length ?? 0) - 3}
                </span>
              )}
            </div>
          )}

          {/* View Details — anchored to bottom via mt-auto */}
          <div className="mt-auto pt-2 relative z-20">
            <Link to={`/venues/${venue.id}`} tabIndex={-1} aria-hidden>
              <motion.div
                animate={{ y: isHovered ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-primary/50 text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
                >
                  View Details
                  <motion.span
                    animate={{ x: isHovered ? 3 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="flex items-center"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                </Button>
              </motion.div>
            </Link>
          </div>

        </div>
        {/* ── end content ── */}

      </motion.div>
    </div>
  );
}
