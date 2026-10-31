import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { capturePartnerIdFromUrl } from '@/lib/partnerAttribution';

// Capture any inbound ?partner_id= attribution param once on app load.
capturePartnerIdFromUrl();
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useEffect } from 'react';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import posthog from 'posthog-js';
import { Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Plan from '@/pages/Plan';
import MultiCityPlan from '@/pages/MultiCityPlan';
import TripDashboard from '@/pages/TripDashboard';
import CuratedTrips from '@/pages/CuratedTrips';
import CuratedTripDetail from '@/pages/CuratedTripDetail';
import CuratedTripBooking from '@/pages/CuratedTripBooking';
import Confirmation from '@/pages/Confirmation';
import TravelChecklist from '@/pages/TravelChecklist';
import Nearby from '@/pages/Nearby';
import ESim from '@/pages/ESim';
import Prepare from '@/pages/Prepare';
import TravelInsurance from '@/pages/TravelInsurance';
import Attractions from '@/pages/Attractions';
import Weather from '@/pages/Weather';
import Safety from '@/pages/Safety';
import VisaCheck from '@/pages/VisaCheck';
import FlightsHotels from '@/pages/FlightsHotels';
import PilgrimageTours from '@/pages/PilgrimageTours';
import SavedReports from '@/pages/SavedReports';
import Trips from '@/pages/Trips';
// Itinerary page retired — /itinerary now redirects to /trips (My Trips library).
// The legacy "Select a trip" experience is replaced by the canonical My Trips page.
import Profile from '@/pages/Profile';
import TripMonitor from '@/pages/TripMonitor';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import DataPrivacy from '@/pages/DataPrivacy';
import AdminAffiliateLinks from '@/pages/AdminAffiliateLinks';
import AdminAffiliateAnalytics from '@/pages/AdminAffiliateAnalytics';
import AdminDestinationGaps from '@/pages/AdminDestinationGaps';
import HelpSupport from '@/pages/HelpSupport';
import DMCPortal from '@/pages/DMCPortal';
import DMCSubmissionForm from '@/pages/DMCSubmissionForm';
import DMCDashboard from '@/pages/DMCDashboard';
import AdminDMCReview from '@/pages/AdminDMCReview';
import CookieBanner from '@/components/legal/CookieBanner';
import { ProfilePromptProvider } from '@/lib/profilePromptContext';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required: don't auto-redirect — public pages (/ and /premium) allow guests.
    // ProtectedRoute handles redirects for private routes individually.
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Home is public — guests can fill the form; auth gate is inside the flow */}
      <Route path="/" element={<Home />} />
      <Route path="/plan" element={<Plan />} />
      <Route path="/multi-city" element={<MultiCityPlan />} />
      <Route path="/trip-dashboard" element={<TripDashboard />} />
      <Route path="/curated-trips" element={<CuratedTrips />} />
      <Route path="/curated-trips/:id" element={<CuratedTripDetail />} />
      <Route path="/curated-trips/:id/book" element={<CuratedTripBooking />} />
      <Route path="/confirmation" element={<Confirmation />} />
      <Route path="/travel-checklist" element={<TravelChecklist />} />
      <Route path="/nearby" element={<Nearby />} />
      <Route path="/esim" element={<ESim />} />
      <Route path="/prepare" element={<Prepare />} />
      <Route path="/insurance" element={<TravelInsurance />} />
      <Route path="/attractions" element={<Attractions />} />
      <Route path="/weather" element={<Weather />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/visa" element={<VisaCheck />} />
      <Route path="/flights-hotels" element={<FlightsHotels />} />
      <Route path="/pilgrimage-tours" element={<PilgrimageTours />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} allowedRoles={["dmc_partner", "admin"]} />}>
        <Route path="/dmc" element={<DMCPortal />} />
        <Route path="/dmc/submit" element={<DMCSubmissionForm />} />
        <Route path="/dmc/dashboard" element={<DMCDashboard />} />
      </Route>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} allowedRoles={["admin"]} />}>
        <Route path="/admin/dmc-review" element={<AdminDMCReview />} />
      </Route>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/trips" element={<Trips />} />
        <Route path="/itinerary" element={<Navigate to="/trips" replace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/saved-reports" element={<SavedReports />} />
        <Route path="/monitor" element={<TripMonitor />} />
      </Route>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/help" element={<HelpSupport />} />
      </Route>
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/data-privacy" element={<DataPrivacy />} />
        <Route path="/admin/affiliate-links" element={<AdminAffiliateLinks />} />
        <Route path="/admin/affiliate-analytics" element={<AdminAffiliateAnalytics />} />
        <Route path="/admin/destination-gaps" element={<AdminDestinationGaps />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  useEffect(() => {
    posthog.capture('posthog_capture_test', { source: 'app_mount' });
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <ProfilePromptProvider>
            <AuthenticatedApp />
            <CookieBanner />
          </ProfilePromptProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App