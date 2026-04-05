import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, PublicOnlyRoute, ConsumerRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import ProfilePage from "./pages/Profile";
import VenuesPage from "./pages/Venues";
import VenueDetailPage from "./pages/VenueDetail";
import BookingSuccess from "./pages/BookingSuccess";
import PlanANight from "./pages/PlanANight";
import HowItWorks from "./pages/HowItWorks";
import BookingsPage from "./pages/Bookings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminVenueForm from "./pages/admin/AdminVenueForm";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminPartnerDetail from "./pages/admin/AdminPartnerDetail";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSettings from "./pages/admin/AdminSettings";
import PartnerLanding from "./pages/partner/PartnerLanding";
import PartnerApplyPage from "./pages/partner/apply/PartnerApplyPage";
import PartnerApplyStatus from "./pages/partner/apply/PartnerApplyStatus";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerVenues from "./pages/partner/PartnerVenues";
import PartnerVenueForm from "./pages/partner/PartnerVenueForm";
import PartnerBookings from "./pages/partner/PartnerBookings";
import PartnerCalendar from "./pages/partner/PartnerCalendar";
import PartnerSettings from "./pages/partner/PartnerSettings";
import RevenueDetailPage from "./pages/partner/analytics/RevenueDetailPage";
import OccupancyPage from "./pages/partner/analytics/OccupancyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Consumer-facing routes ─────────────────────────────────────
                ConsumerRoute blocks render until session+role have resolved,
                then redirects authenticated partners to /partner/dashboard.
                This prevents any flicker of consumer content for partners.
            ─────────────────────────────────────────────────────────────── */}
            <Route
              path="/"
              element={
                <ConsumerRoute>
                  <Index />
                </ConsumerRoute>
              }
            />
            <Route
              path="/venues"
              element={
                <ConsumerRoute>
                  <VenuesPage />
                </ConsumerRoute>
              }
            />
            <Route
              path="/venues/:id"
              element={
                <ConsumerRoute>
                  <VenueDetailPage />
                </ConsumerRoute>
              }
            />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route
              path="/plan-a-night"
              element={
                <ConsumerRoute>
                  <PlanANight />
                </ConsumerRoute>
              }
            />
            <Route
              path="/how-it-works"
              element={
                <ConsumerRoute>
                  <HowItWorks />
                </ConsumerRoute>
              }
            />
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
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingsPage />
                </ProtectedRoute>
              }
            />

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
            <Route
              path="/admin/partners"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPartners />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/partners/:applicationId"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPartnerDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />

            {/* Partner application flow — open to any logged-in user */}
            <Route
              path="/partner/apply"
              element={
                <ProtectedRoute>
                  <PartnerApplyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/apply/status"
              element={
                <ProtectedRoute>
                  <PartnerApplyStatus />
                </ProtectedRoute>
              }
            />

            {/* Partner landing — skip to dashboard if already a partner */}
            <Route
              path="/partner"
              element={
                <ConsumerRoute>
                  <PartnerLanding />
                </ConsumerRoute>
              }
            />
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
            <Route
              path="/partner/calendar"
              element={
                <ProtectedRoute requirePartner>
                  <PartnerCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/settings"
              element={
                <ProtectedRoute requirePartner>
                  <PartnerSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/analytics/revenue"
              element={
                <ProtectedRoute requirePartner>
                  <RevenueDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/analytics/occupancy"
              element={
                <ProtectedRoute requirePartner>
                  <OccupancyPage />
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
