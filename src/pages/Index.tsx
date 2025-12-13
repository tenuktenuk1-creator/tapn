import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { Search, MapPin, Calendar, Star, Coffee, Mic2, CircleDot, Sofa } from 'lucide-react';

const venueTypes = [
  { type: 'cafe', label: 'Cafes', icon: Coffee, color: 'bg-orange-500' },
  { type: 'karaoke', label: 'Karaoke', icon: Mic2, color: 'bg-pink-500' },
  { type: 'pool_snooker', label: 'Pool & Snooker', icon: CircleDot, color: 'bg-blue-500' },
  { type: 'lounge', label: 'Lounges', icon: Sofa, color: 'bg-primary' },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container relative z-10 text-center py-20">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
            Discover & Book
            <span className="block text-gradient">Amazing Venues</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Find the perfect spot for your next outing. From cozy cafes to exciting karaoke rooms, book instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Link to="/venues">
              <Button size="lg" className="gradient-primary gap-2 text-lg px-8">
                <Search className="h-5 w-5" /> Explore Venues
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Venue Types */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {venueTypes.map(({ type, label, icon: Icon, color }) => (
              <Link key={type} to={`/venues?type=${type}`} className="group">
                <div className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className={`${color} w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{label}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: 'Easy Discovery', desc: 'Search and filter venues by type, location, and price.' },
              { icon: Calendar, title: 'Instant Booking', desc: 'Book your favorite venue in just a few clicks.' },
              { icon: Star, title: 'Verified Venues', desc: 'All venues are verified for quality and service.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}