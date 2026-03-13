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
 * Badges:
 *   • Top-left: traffic status (Quiet=green / Moderate=yellow / Busy=red) — only when open
 *   • Top-right: Open Now (green) / Closing Soon (yellow) / Closed (red)
 *   • Bottom-left: venue category
 *   • Bottom-right: price per hour
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
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';
import { PublicVenue, venueTypeLabels, priceTierLabels } from '@/types/venue';
import { getVenueLocationImage } from '@/lib/venueMapHelper';

interface VenueCardProps {
  venue: PublicVenue;
}

// ─── Open-status logic ────────────────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

type OpenStatusResult = {
  isOpen: boolean;
  closingSoon: boolean;
  closeTime: string;
};

function getOpenStatus(venue: PublicVenue): OpenStatusResult {
  const CLOSING_SOON_THRESHOLD = 120; // 2 hours in minutes

  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0) {
    return { isOpen: true, closingSoon: false, closeTime: '' };
  }

  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const todayName = DAYS[now.getDay()];
  const todayHours = venue.opening_hours[todayName];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!todayHours || todayHours.open === 'closed' || todayHours.close === 'closed') {
    return { isOpen: false, closingSoon: false, closeTime: '' };
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
    return {
      isOpen: true,
      closingSoon: minutesUntilClose <= CLOSING_SOON_THRESHOLD,
      closeTime: todayHours.close,
    };
  }

  return { isOpen: false, closingSoon: false, closeTime: '' };
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const VENUE_TYPE_COLORS: Record<string, string> = {
  cafe:         'bg-orange-500',
  karaoke:      'bg-pink-500',
  pool_snooker: 'bg-blue-500',
  lounge:       'bg-purple-500',
};

const VENUE_GLOW: Record<string, string> = {
  cafe:         'rgba(249,115,22,0.20)',
  karaoke:      'rgba(236,72,153,0.20)',
  pool_snooker: 'rgba(59,130,246,0.20)',
  lounge:       'rgba(168,85,247,0.20)',
};

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
  const { isOpen, closingSoon, closeTime } = getOpenStatus(venue);

  // Top-right: open/closed status — 3 colors only
  const statusBadge = isOpen
    ? closingSoon
      ? { label: 'Closing Soon', className: 'bg-yellow-500 text-black' }
      : { label: 'Open Now',     className: 'bg-green-500 text-white'  }
    : { label: 'Closed',         className: 'bg-red-500 text-white'    };

  // Top-left: traffic badge — only shown when open
  const trafficBadge = isOpen && venue.busy_status
    ? venue.busy_status === 'busy'
      ? { label: 'Busy',     className: 'bg-red-500 text-white'    }
      : venue.busy_status === 'moderate'
        ? { label: 'Moderate', className: 'bg-yellow-500 text-black' }
        : { label: 'Quiet',    className: 'bg-green-500 text-white'  }
    : null;

  // Bottom time row
  const timeDisplay = !isOpen
    ? { label: 'Closed',                        className: 'text-red-400'    }
    : closingSoon
      ? { label: `Closing Soon · ${closeTime}`,  className: 'text-yellow-400' }
      : { label: `Closes ${closeTime}`,          className: 'text-green-400'  };

  const glowColor      = VENUE_GLOW[venue.venue_type]      ?? 'rgba(168,85,247,0.20)';
  const underlineColor = VENUE_UNDERLINE[venue.venue_type] ?? 'rgba(168,85,247,0.9)';

  const coverImage    = venue.images?.[0] ?? null;
  const locationImage = getVenueLocationImage(venue);

  // ── Mouse-tracking tilt ───────────────────────────────────────────────────

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

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
    <div
      ref={containerRef}
      className="relative h-full"
      style={{ perspective: '1200px' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Outer glow halo */}
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

      <motion.div
        className="card-dark rounded-2xl overflow-hidden flex flex-col h-full relative"
        style={{ rotateX: springRotateX, rotateY: springRotateY, zIndex: 1 }}
      >
        {/* Full-card transparent link */}
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
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <span className="text-4xl font-display font-bold text-muted-foreground/30">
                {venue.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Dark vignette on hover */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 0.22 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Traffic badge — top-left (only when open) */}
          {trafficBadge && (
            <Badge className={`absolute top-3 left-3 z-20 ${trafficBadge.className} border-0 rounded-full text-xs font-semibold shadow-md pointer-events-none`}>
              {trafficBadge.label}
            </Badge>
          )}

          {/* Open/closed status — top-right */}
          <Badge className={`absolute top-3 right-3 z-20 ${statusBadge.className} border-0 rounded-full text-xs font-semibold shadow-md pointer-events-none`}>
            <span className={`w-2 h-2 rounded-full bg-current mr-1.5 ${isOpen ? 'animate-pulse' : ''}`} />
            {statusBadge.label}
          </Badge>

          {/* Category badge — bottom-left */}
          <Badge className={`absolute bottom-3 left-3 z-20 ${VENUE_TYPE_COLORS[venue.venue_type] ?? 'bg-gray-500'} text-white border-0 rounded-lg text-xs pointer-events-none`}>
            {venueTypeLabels[venue.venue_type] ?? venue.venue_type}
          </Badge>

          {/* Price badge — bottom-right */}
          {venue.price_per_hour ? (
            <Badge className="absolute bottom-3 right-3 z-20 bg-black/70 text-white border-0 rounded-lg text-xs backdrop-blur-sm pointer-events-none">
              {formatPrice(venue.price_per_hour)}
            </Badge>
          ) : null}
        </div>

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

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{venue.address || venue.city}</span>
          </div>

          {/* Time row */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className={`font-medium ${timeDisplay.className}`}>{timeDisplay.label}</span>
          </div>

          {/* View Details — anchored to bottom */}
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
      </motion.div>
    </div>
  );
}
