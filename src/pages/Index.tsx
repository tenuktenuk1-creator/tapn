import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/layout/Layout';
import {
  Search,
  ChevronRight,
  MapPin,
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useVenues } from '@/hooks/useVenues';
import { VenueCard } from '@/components/venues/VenueCard';
import { Skeleton } from '@/components/ui/skeleton';
import { venueTypeLabels } from '@/types/venue';

// ─── Fade-up reveal animation ─────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Ambient background glows ─────────────────────────────────────────────────

function HeroGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* Primary pink glow */}
      <motion.div
        className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse, hsl(322 100% 60% / 0.12) 0%, hsl(280 85% 58% / 0.06) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Purple accent blob left */}
      <motion.div
        className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(280 85% 58% / 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Blue accent blob right */}
      <motion.div
        className="absolute top-[30%] -right-[5%] w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(220 90% 60% / 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: venues, isLoading } = useVenues();

  const featuredVenues = venues
    ? [...venues].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3)
    : [];

  const suggestions = useMemo(() => {
    if (!venues || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return venues
      .filter(v => v.name.toLowerCase().includes(q) || v.venue_type.toLowerCase().includes(q))
      .slice(0, 5);
  }, [venues, searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    navigate(`/venues?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <Layout>
      {/* ── A. Hero ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-[hsl(240_10%_4%)]">
        <HeroGlow />

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(0 0% 100% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="container relative z-10 text-center px-4">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 mb-8 text-xs font-medium text-primary/80"
          >
            <Zap className="h-3 w-3" />
            Real-time venue availability
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
            className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="text-foreground">Tap Into</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, hsl(322 100% 65%) 0%, hsl(280 85% 65%) 50%, hsl(220 90% 65%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              the Night.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Discover venues, check availability, and book in seconds.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="max-w-2xl mx-auto mb-6"
          >
            <form onSubmit={handleSearch}>
              <div ref={searchRef} className="relative">
                <div
                  className="flex items-center rounded-2xl border p-2 pl-5 gap-2 transition-all duration-200"
                  style={{
                    background: 'hsl(240 10% 8% / 0.8)',
                    borderColor: 'hsl(240 10% 18%)',
                    boxShadow: '0 0 40px hsl(322 100% 60% / 0.06)',
                    backdropFilter: 'blur(12px)',
                  }}
                  onFocus={() => undefined}
                >
                  <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    type="text"
                    placeholder="Search venues, categories, or areas..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/60 text-base"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03, boxShadow: '0 8px 32px hsl(322 100% 60% / 0.4)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, hsl(322 100% 60%) 0%, hsl(280 85% 58%) 100%)',
                      boxShadow: '0 4px 20px hsl(322 100% 60% / 0.3)',
                    }}
                  >
                    Search
                  </motion.button>
                </div>

                {/* Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 mt-2 bg-[hsl(240_10%_9%)] border border-[hsl(240_10%_18%)] rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {suggestions.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setShowSuggestions(false); navigate(`/venues/${v.id}`); }}
                        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[hsl(240_10%_13%)] transition-colors border-b border-[hsl(240_10%_12%)] last:border-0"
                      >
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{venueTypeLabels[v.venue_type]}{v.city && ` · ${v.city}`}</p>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setShowSuggestions(false); navigate(`/venues?search=${encodeURIComponent(searchQuery)}`); }}
                      className="w-full px-5 py-2.5 text-center text-xs font-medium text-primary hover:bg-[hsl(240_10%_11%)] transition-colors"
                    >
                      See all results for "{searchQuery}"
                    </button>
                  </motion.div>
                )}
              </div>
            </form>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            <Link to="/venues">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-foreground border border-[hsl(240_10%_20%)] bg-[hsl(240_10%_10%)] hover:border-[hsl(240_10%_30%)] hover:bg-[hsl(240_10%_13%)] transition-all"
              >
                Explore Venues
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
            <Link to="/partner">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Partner With TAPN
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Bottom fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, hsl(240 10% 4%))' }}
        />
      </section>

      {/* ── B. How it Works ───────────────────────────────────────────────── */}
      <section className="py-28 bg-[hsl(240_10%_4%)]">
        <div className="container px-4">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.15em] text-primary/60 uppercase mb-3">How it works</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Book in three steps
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Search', desc: 'Find venues by type, location, or availability.', icon: Search },
              { step: '02', title: 'Book', desc: 'Pick your slot and confirm instantly — no calls.', icon: Zap },
              { step: '03', title: 'Go', desc: 'Show up and enjoy. Confirmation lands in seconds.', icon: Clock },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <FadeUp key={step} delay={i * 0.1}>
                <div
                  className="relative rounded-2xl p-6 border transition-all duration-300 group"
                  style={{
                    background: 'hsl(240 10% 8%)',
                    borderColor: 'hsl(240 10% 15%)',
                  }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ boxShadow: '0 0 40px hsl(322 100% 60% / 0.06) inset' }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'hsl(322 100% 60% / 0.12)' }}
                      >
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-3xl font-bold font-display text-[hsl(240_10%_22%)] select-none">{step}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── C. Featured Venues ────────────────────────────────────────────── */}
      <section className="py-28 bg-[hsl(240_10%_4%)]">
        <div className="container px-4">
          <FadeUp className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-primary/60 uppercase mb-3">Featured venues</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Top-rated right now
              </h2>
            </div>
            <Link to="/venues" className="hidden sm:flex">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground gap-1.5 shrink-0"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeUp>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-[hsl(240_10%_12%)] bg-[hsl(240_10%_8%)]">
                  <Skeleton className="aspect-[4/3]" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredVenues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredVenues.map((venue, i) => (
                <FadeUp key={venue.id} delay={i * 0.08}>
                  <VenueCard venue={venue} />
                </FadeUp>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">No venues yet — check back soon.</div>
          )}

          <div className="sm:hidden mt-8 text-center">
            <Link to="/venues">
              <Button variant="outline" className="rounded-full gap-2">
                View all venues <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── D. Trust signals ──────────────────────────────────────────────── */}
      <section className="py-20 border-t border-[hsl(240_10%_10%)] bg-[hsl(240_10%_4%)]">
        <div className="container px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Zap, label: 'Real-time availability', sub: 'Live slots, no outdated data' },
              { icon: ShieldCheck, label: 'Verified venues', sub: 'Every listing reviewed by TAPN' },
              { icon: Clock, label: 'Instant confirmation', sub: 'Booking confirmed in under 10s' },
            ].map(({ icon: Icon, label, sub }, i) => (
              <FadeUp key={label} delay={i * 0.08} className="flex items-start gap-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'hsl(322 100% 60% / 0.1)' }}
                >
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── E. Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden bg-[hsl(240_10%_4%)]">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-[600px] h-[400px] rounded-full opacity-60"
            style={{
              background: 'radial-gradient(ellipse, hsl(322 100% 60% / 0.1) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </div>

        <div className="container px-4 text-center relative z-10">
          <FadeUp>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
              Your night starts here.
            </h2>
            <p className="text-muted-foreground mb-10 text-lg max-w-md mx-auto">
              Join thousands discovering the best venues on TAPN.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/venues">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 12px 48px hsl(322 100% 60% / 0.45)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="rounded-2xl px-8 py-3.5 text-base font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, hsl(322 100% 60%) 0%, hsl(280 85% 58%) 100%)',
                    boxShadow: '0 4px 24px hsl(322 100% 60% / 0.3)',
                  }}
                >
                  Explore Venues
                </motion.button>
              </Link>
              <Link to="/partner">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground gap-1.5 rounded-2xl px-8 py-3.5 text-base"
                >
                  Become a Partner <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </Layout>
  );
}
