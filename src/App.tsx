import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import ProfilePage from "./pages/Profile";
import VenuesPage from "./pages/Venues";
import VenueDetailPage from "./pages/VenueDetail";
import BookingSuccess from "./pages/BookingSuccess";
import PlanANight from "./pages/PlanANight";
import HowItWorks from "./pages/HowItWorks";
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
            <Route
              path="/auth"
              element={
                <PublicOnlyRoute>
                  <AuthPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/venues/:id" element={<VenueDetailPage />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/plan-a-night" element={<PlanANight />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminVenues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues/new"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminVenueForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminVenueForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminBookings />
                </ProtectedRoute>
              }
            />

            <Route path="/partner" element={<PartnerLanding />} />
            <Route
              path="/partner/dashboard"
              element={
                <ProtectedRoute requirePartner>
                  <PartnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/venues"
              element={
                <ProtectedRoute requirePartner>
                  <PartnerVenues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/venues/new"
              element={
                <ProtectedRoute requirePartner>
                  <PartnerVenueForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/venues/:id/edit"
              element={
                <ProtectedRoute requirePartner>
                  <PartnerVenueForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/bookings"
              element={
                <ProtectedRoute requirePartner>
                  <PartnerBookings />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
