import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, PublicOnlyRoute, ConsumerRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PartnerLayout } from "@/components/layout/PartnerLayout";
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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* ── Consumer-facing routes ────────────────────────────────────── */}
            <Route path="/" element={<ConsumerRoute><Index /></ConsumerRoute>} />
            <Route path="/venues" element={<ConsumerRoute><VenuesPage /></ConsumerRoute>} />
            <Route path="/venues/:id" element={<ConsumerRoute><VenueDetailPage /></ConsumerRoute>} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/plan-a-night" element={<ConsumerRoute><PlanANight /></ConsumerRoute>} />
            <Route path="/how-it-works" element={<ConsumerRoute><HowItWorks /></ConsumerRoute>} />
            <Route path="/auth" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />

            {/* ── Admin nested layout ───────────────────────────────────────
                AdminLayout stays mounted across all /admin/* navigations.
                Only the Outlet content animates on route change.
            ──────────────────────────────────────────────────────────────── */}
            <Route
              path="/admin"
              element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}
            >
              {/* /admin → /admin/dashboard */}
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="venues" element={<AdminVenues />} />
              <Route path="venues/new" element={<AdminVenueForm />} />
              <Route path="venues/:id/edit" element={<AdminVenueForm />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="partners" element={<AdminPartners />} />
              <Route path="partners/:applicationId" element={<AdminPartnerDetail />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* ── Partner public / pre-auth routes ─────────────────────────── */}
            {/* Landing page for non-partners (ConsumerRoute redirects active partners away) */}
            <Route path="/partner" element={<ConsumerRoute><PartnerLanding /></ConsumerRoute>} />
            {/* Application flow — open to any logged-in user */}
            <Route path="/partner/apply" element={<ProtectedRoute><PartnerApplyPage /></ProtectedRoute>} />
            <Route path="/partner/apply/status" element={<ProtectedRoute><PartnerApplyStatus /></ProtectedRoute>} />

            {/* ── Partner nested layout ─────────────────────────────────────
                PartnerLayout stays mounted across all /partner/* navigations.
                Only the Outlet content animates on route change.
            ──────────────────────────────────────────────────────────────── */}
            <Route
              path="/partner"
              element={<ProtectedRoute requirePartner><PartnerLayout /></ProtectedRoute>}
            >
              <Route path="dashboard" element={<PartnerDashboard />} />
              <Route path="venues" element={<PartnerVenues />} />
              <Route path="venues/new" element={<PartnerVenueForm />} />
              <Route path="venues/:id/edit" element={<PartnerVenueForm />} />
              <Route path="bookings" element={<PartnerBookings />} />
              <Route path="calendar" element={<PartnerCalendar />} />
              <Route path="settings" element={<PartnerSettings />} />
              <Route path="analytics/revenue" element={<RevenueDetailPage />} />
              <Route path="analytics/occupancy" element={<OccupancyPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
