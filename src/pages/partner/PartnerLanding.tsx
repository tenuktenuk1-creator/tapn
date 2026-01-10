import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, useBecomePartner } from '@/hooks/usePartner';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, Calendar, Users, ChevronRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerLanding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const becomePartner = useBecomePartner();

  const handleBecomePartner = async () => {
    if (!user) {
      navigate('/auth?redirect=/partner');
      return;
    }

    try {
      await becomePartner.mutateAsync();
      toast.success('Welcome to the TAPN Partner Program!');
      navigate('/partner/dashboard');
    } catch (error) {
      toast.error('Failed to join partner program');
    }
  };

  const benefits = [
    {
      icon: Building2,
      title: 'List Your Venue',
      description: 'Get discovered by thousands of people looking for the perfect spot for their night out.',
    },
    {
      icon: TrendingUp,
      title: 'Boost Revenue',
      description: 'Fill empty slots and maximize your venue capacity with targeted bookings.',
    },
    {
      icon: Calendar,
      title: 'Easy Management',
      description: 'Manage bookings, availability, and venue details from one simple dashboard.',
    },
    {
      icon: Users,
      title: 'Reach New Customers',
      description: 'Connect with groups planning their nights out in Ulaanbaatar.',
    },
  ];

  if (authLoading || partnerLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  // If already a partner, redirect to dashboard
  if (isPartner) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="font-display text-3xl font-bold mb-4">
            You're already a <span className="text-gradient">Partner!</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Head to your dashboard to manage your venues.
          </p>
          <Button onClick={() => navigate('/partner/dashboard')} className="gradient-primary">
            Go to Dashboard
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Partner With <span className="text-gradient">TAPN</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              List your café, karaoke room, pool hall, or lounge and connect with 
              customers looking for the perfect venue for their night out.
            </p>
            <Button 
              size="lg" 
              onClick={handleBecomePartner}
              disabled={becomePartner.isPending}
              className="gradient-primary text-lg px-8 py-6"
            >
              {becomePartner.isPending ? 'Joining...' : 'Become a Partner'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            Why Partner With <span className="text-gradient">TAPN</span>?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit) => (
              <div 
                key={benefit.title}
                className="card-dark p-6 rounded-2xl text-center"
              >
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            How It <span className="text-gradient">Works</span>
          </h2>
          
          <div className="max-w-2xl mx-auto space-y-8">
            {[
              { step: '1', title: 'Sign Up', description: 'Create your partner account in seconds.' },
              { step: '2', title: 'Add Your Venue', description: 'Fill in your venue details, photos, and pricing.' },
              { step: '3', title: 'Start Receiving Bookings', description: 'Customers discover and book your venue through TAPN.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shrink-0">
                  <span className="font-bold text-lg text-white">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={handleBecomePartner}
              disabled={becomePartner.isPending}
              className="gradient-primary"
            >
              Get Started Now
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
