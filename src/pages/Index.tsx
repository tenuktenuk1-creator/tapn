import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/layout/Layout';
import { 
  Search, 
  ChevronRight, 
  LayoutGrid, 
  Clock, 
  Sparkles, 
  PartyPopper,
  TrendingUp,
  ShieldCheck,
  Zap,
  Mic2,
  Circle,
  Target,
  Gamepad2,
  Disc,
  Wifi,
  Beer,
  Sofa,
  Music,
  Activity,
  Flame
} from 'lucide-react';
import { useVenues } from '@/hooks/useVenues';
import { VenueCard } from '@/components/venues/VenueCard';
import { Skeleton } from '@/components/ui/skeleton';

const howItWorksSteps = [
  { 
    number: 1, 
    icon: LayoutGrid, 
    title: 'Choose a Category', 
    desc: 'Browse karaoke, gaming, bars, clubs & more' 
  },
  { 
    number: 2, 
    icon: Clock, 
    title: 'Browse Real-Time Availability', 
    desc: 'See live status and open slots instantly' 
  },
  { 
    number: 3, 
    icon: Sparkles, 
    title: 'Compare & Tap to Book', 
    desc: 'Choose your spot and confirm in seconds' 
  },
  { 
    number: 4, 
    icon: PartyPopper, 
    title: 'Arrive & Enjoy Your Night', 
    desc: 'Show up and have an amazing time' 
  },
];

const categories = [
  { type: 'karaoke', label: 'Karaoke', icon: Mic2 },
  { type: 'pool_snooker', label: 'Pool', icon: Circle },
  { type: 'pool_snooker', label: 'Snooker', icon: Target },
  { type: 'cafe', label: 'Gaming', icon: Gamepad2 },
  { type: 'lounge', label: 'Bowling', icon: Disc },
  { type: 'cafe', label: 'Internet Cafe', icon: Wifi },
  { type: 'lounge', label: 'Bars', icon: Beer },
  { type: 'lounge', label: 'Lounges', icon: Sofa },
  { type: 'lounge', label: 'Clubs', icon: Music },
  { type: 'cafe', label: 'Activity Centers', icon: Activity },
];

const whyTapnFeatures = [
  { 
    icon: TrendingUp, 
    title: 'Real-Time Updates', 
    desc: 'See live availability and make instant decisions' 
  },
  { 
    icon: ShieldCheck, 
    title: 'Verified Venues Only', 
    desc: 'Every spot is verified for quality and authenticity' 
  },
  { 
    icon: Zap, 
    title: 'Instant Confirmation', 
    desc: 'Get booking confirmation in under 10 seconds' 
  },
  { 
    icon: Sparkles, 
    title: 'Smart Recommendations', 
    desc: 'Discover venues tailored to your preferences' 
  },
];

const bookingFeatures = [
  { icon: Zap, text: 'Lightning-fast booking' },
  { icon: ShieldCheck, text: 'Secure & reliable' },
  { icon: Sparkles, text: 'Simple & intuitive' },
];

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: venues, isLoading } = useVenues();

  // Get top 3 rated venues
  const trendingVenues = venues?.slice(0, 3) || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/venues?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="container relative z-10 text-center py-20">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground italic">
            Tap Into the Night
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Real-time availability. Instant booking. Top venues — all in one place.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
            <div className="flex items-center bg-secondary/50 border border-border rounded-full p-2 pl-6">
              <Search className="h-5 w-5 text-muted-foreground mr-3" />
              <Input
                type="text"
                placeholder="Search for venues, categories, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
              />
              <Button type="submit" className="gradient-primary rounded-full px-8">
                Search
              </Button>
            </div>
          </form>

          {/* Partner CTA */}
          <Button 
            variant="outline" 
            className="rounded-full border-border bg-secondary/50 hover:bg-secondary text-foreground px-8"
            onClick={() => navigate('/#partner')}
          >
            Partner With TAPN <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* How TAPN Works */}
      <section id="how-it-works" className="py-24 bg-background">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16 text-gradient">
            How TAPN Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map(({ number, icon: Icon, title, desc }) => (
              <div key={number} className="relative card-dark rounded-2xl p-6 text-center">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-sm font-semibold text-primary bg-background">
                  {number}
                </div>
                <div className="w-14 h-14 rounded-2xl gradient-icon flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Categories */}
      <section className="py-24 bg-background">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16 text-gradient">
            Explore Categories
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map(({ type, label, icon: Icon }, index) => (
              <Link key={`${type}-${index}`} to={`/venues?type=${type}`} className="group">
                <div className="card-dark rounded-2xl p-6 text-center hover:border-primary/50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl gradient-icon flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {label}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now Section */}
      <section className="py-24 bg-secondary/20">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 md:mb-0">
              <span className="text-foreground">Trending </span>
              <span className="text-gradient">Now</span>
              <Flame className="inline-block ml-2 h-8 w-8 text-orange-500 fill-orange-500 animate-pulse" />
            </h2>
            <Link to="/venues">
              <Button variant="outline" className="rounded-full">
                View All Venues <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
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
          ) : trendingVenues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No venues found.
            </div>
          )}
        </div>
      </section>

      {/* Book in Seconds */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                <span className="text-foreground">Book in </span>
                <span className="text-gradient">Seconds</span>
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                See availability, tap to book, get confirmation — all under 10 seconds. No calls. No waiting. Just instant access to the best venues in town.
              </p>
              <div className="space-y-4">
                {bookingFeatures.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-icon flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-foreground font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Phone Mockup */}
            <div className="relative flex justify-center">
              <div className="relative w-72 h-[500px] rounded-[3rem] border-4 border-primary/30 bg-background p-4 shadow-2xl">
                <div className="absolute inset-4 rounded-[2.5rem] overflow-hidden gradient-primary opacity-80" />
                <div className="absolute inset-8 rounded-2xl bg-card p-4 flex flex-col justify-end">
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                  <Button className="w-full gradient-primary rounded-xl">
                    Tap to Book
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why TAPN */}
      <section className="py-24 bg-background">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16 text-gradient">
            Why TAPN?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyTapnFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-dark rounded-2xl p-6 text-center">
                <div className="w-14 h-14 rounded-2xl gradient-icon flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner CTA Section */}
      <section id="partner" className="py-24 gradient-partner">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Grow Your Venue With TAPN
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8 text-lg">
            TAPN gives venues exposure, direct bookings, customer analytics, and easier schedule management. Join hundreds of venues already thriving on our platform.
          </p>
          <Button 
            variant="outline" 
            className="rounded-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 px-8"
          >
            Become a Partner <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </Layout>
  );
}