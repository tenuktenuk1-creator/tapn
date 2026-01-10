import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import VenuesPage from "./pages/Venues";
import VenueDetailPage from "./pages/VenueDetail";
import BookingsPage from "./pages/Bookings";
import BookingSuccess from "./pages/BookingSuccess";
import PlanANight from "./pages/PlanANight";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminVenueForm from "./pages/admin/AdminVenueForm";
import AdminBookings from "./pages/admin/AdminBookings";
import PartnerLanding from "./pages/partner/PartnerLanding";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerVenues from "./pages/partner/PartnerVenues";
import PartnerVenueForm from "./pages/partner/PartnerVenueForm";
import PartnerBookings from "./pages/partner/PartnerBookings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/venues/:id" element={<VenueDetailPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/plan-a-night" element={<PlanANight />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/venues" element={<AdminVenues />} />
            <Route path="/admin/venues/new" element={<AdminVenueForm />} />
            <Route path="/admin/venues/:id/edit" element={<AdminVenueForm />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/partner" element={<PartnerLanding />} />
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/venues" element={<PartnerVenues />} />
            <Route path="/partner/venues/new" element={<PartnerVenueForm />} />
            <Route path="/partner/venues/:id/edit" element={<PartnerVenueForm />} />
            <Route path="/partner/bookings" element={<PartnerBookings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
