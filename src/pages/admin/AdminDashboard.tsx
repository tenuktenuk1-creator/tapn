import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVenues } from '@/hooks/useVenues';
import { useAdminBookings } from '@/hooks/useBookings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, isAdmin, loading } = useAuth();
  // Admin бүх venue харах ёстой — active болон inactive
  const { data: venues } = useVenues({ onlyActive: false });
  const { data: bookings } = useAdminBookings();
  const { data: pendingPartners } = useQuery({
    queryKey: ['admin-pending-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_venues')
        .select('id')
        .eq('status', 'pending');
      if (error) throw error;
      return data?.length || 0;
    },
  });


  if (loading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const totalVenues = venues?.length || 0;
  const activeVenues = venues?.filter(v => v.is_active)?.length || 0;
  const totalBookings = bookings?.length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed')?.length || 0;

  // Calculate total revenue from confirmed bookings
  const totalRevenue = bookings
    ?.filter(b => b.status === 'confirmed' && b.payment_status === 'paid')
    ?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

  const stats = [
    {
      title: 'Total Venues',
      value: totalVenues,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Venues',
      value: activeVenues,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Bookings',
      value: totalBookings,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Confirmed',
      value: confirmedBookings,
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Revenue',
      value: `₮${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            <span className="text-foreground">Admin </span>
            <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">Manage your venues and bookings</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {stats.map(({ title, value, icon: Icon, color, bgColor }) => (
            <Card key={title} className="card-dark border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{title}</p>
                    <p className="text-3xl font-bold text-foreground">{value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-dark border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                Venue Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Add new venues, edit existing ones, or manage venue availability.
              </p>
              <div className="flex gap-3">
                <Link to="/admin/venues">
                  <Button className="gradient-primary">
                    Manage Venues <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/admin/venues/new">
                  <Button variant="outline" className="border-border">
                    Add New Venue
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dark border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5 text-primary" />
                Booking Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Review pending bookings, approve or reject requests, and view history.
              </p>
              <div className="flex gap-3">
                <Link to="/admin/bookings">
                  <Button className="gradient-primary">
                    Manage Bookings <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/admin/bookings?status=confirmed">
                  <Button variant="outline" className="border-border">
                    View Confirmed
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dark border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Partner Management
                {(pendingPartners ?? 0) > 0 && (
                  <Badge className="bg-yellow-500 text-black text-xs ml-2">
                    {pendingPartners} pending
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Review partner venue requests, approve or reject submissions, and manage active partners.
              </p>
              <Link to="/admin/partners">
                <Button className="gradient-primary">
                  Manage Partners <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
