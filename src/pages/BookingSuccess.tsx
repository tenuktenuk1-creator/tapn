import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Calendar, Mail } from 'lucide-react';

export default function BookingSuccess() {
  return (
    <Layout>
      <div className="container py-20">
        <div className="max-w-lg mx-auto text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 rounded-full gradient-primary mx-auto mb-8 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-primary-foreground" />
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Booking <span className="text-gradient">Confirmed!</span>
          </h1>

          <p className="text-muted-foreground text-lg mb-8">
            Your booking has been instantly confirmed. You're all set for an amazing night!
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="card-dark rounded-xl p-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-icon flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confirmation Email</p>
                  <p className="font-medium">Sent to your inbox</p>
                </div>
              </div>
            </div>

            <div className="card-dark rounded-xl p-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-icon flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium text-green-500">Confirmed</p>
                </div>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="card-dark rounded-xl p-6 mb-8 text-left">
            <h3 className="font-display font-semibold text-lg mb-4">What's Next?</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                <span>Check your email for the booking confirmation details</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                <span>Save the venue address and booking time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                <span>Show up on time and enjoy your night!</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/venues">
              <Button variant="outline" className="w-full sm:w-auto">
                Browse More Venues
              </Button>
            </Link>
            <Link to="/">
              <Button className="w-full sm:w-auto gradient-primary">
                Back to Home <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
