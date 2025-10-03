
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import LoadingSpinner from '@/components/LoadingSpinner';
import PrivateRoute from '@/components/PrivateRoute';

const HomePage = lazy(() => import('@/pages/HomePage'));
const HostDashboard = lazy(() => import('@/pages/HostDashboard'));
const EventLanding = lazy(() => import('@/pages/EventLanding'));
const GuestUpload = lazy(() => import('@/pages/GuestUpload'));
const EventGallery = lazy(() => import('@/pages/EventGallery'));
const GuestBook = lazy(() => import('@/pages/GuestBook'));
const Slideshow = lazy(() => import('@/pages/Slideshow'));
const Moderation = lazy(() => import('@/pages/Moderation'));
const EventSettings = lazy(() => import('@/pages/EventSettings'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignUpPage = lazy(() => import('@/pages/SignUpPage'));
const SignUpConfirmPage = lazy(() => import('@/pages/SignUpConfirmPage'));
const InvitationPage = lazy(() => import('@/pages/InvitationPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const RsvpPage = lazy(() => import('@/pages/RsvpPage'));
const InvitationWizard = lazy(() => import('@/pages/InvitationWizard'));
const InvitationPreview = lazy(() => import('@/pages/InvitationPreview'));
const GuestsPage = lazy(() => import('@/pages/GuestsPage'));
const TablesPage = lazy(() => import('@/pages/TablesPage'));
const FindTablePage = lazy(() => import('@/pages/FindTablePage'));
const PlannerDashboard = lazy(() => import('@/pages/planner/PlannerDashboard'));
const PlannerTasks = lazy(() => import('@/pages/planner/PlannerTasks'));
const PlannerTimeline = lazy(() => import('@/pages/planner/PlannerTimeline'));
const PlannerProviders = lazy(() => import('@/pages/planner/PlannerProviders'));
const PlannerBudget = lazy(() => import('@/pages/planner/PlannerBudget'));
const PlannerDocuments = lazy(() => import('@/pages/planner/PlannerDocuments'));
const PlannerVenues = lazy(() => import('@/pages/planner/PlannerVenues'));
const PlannerCatering = lazy(() => import('@/pages/planner/PlannerCatering'));
const PlannerGifts = lazy(() => import('@/pages/planner/PlannerGifts'));
const PlannerTeam = lazy(() => import('@/pages/planner/PlannerTeam'));
const PlannerInspiration = lazy(() => import('@/pages/planner/PlannerInspiration'));
const DevHelper = lazy(() => import('@/components/DevHelper'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('@/pages/UpdatePasswordPage'));
const GlobalSettingsPage = lazy(() => import('@/pages/GlobalSettingsPage'));

function App() {
  return (
    <>
      <Helmet>
        <title>Mitus - Invitaciones y Álbumes Digitales para Eventos</title>
        <meta name="description" content="Crea invitaciones y álbumes digitales para bodas, quinceaños y eventos. Los invitados confirman asistencia y suben fotos al instante." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">

        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/signup-confirm" element={<SignUpConfirmPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            
            <Route path="/wizard" element={<PrivateRoute><InvitationWizard /></PrivateRoute>} />
            <Route path="/preview" element={<PrivateRoute><InvitationPreview /></PrivateRoute>} />
            
            <Route path="/create-event" element={<Navigate to="/wizard" replace />} />

            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><GlobalSettingsPage /></PrivateRoute>} />

            <Route path="/host/:eventId" element={<PrivateRoute><HostDashboard /></PrivateRoute>} />
            <Route path="/host/:eventId/moderation" element={<PrivateRoute><Moderation /></PrivateRoute>} />
            <Route path="/host/:eventId/settings" element={<PrivateRoute><EventSettings /></PrivateRoute>} />
            <Route path="/host/:eventId/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
            <Route path="/host/:eventId/rsvps" element={<PrivateRoute><RsvpPage /></PrivateRoute>} />
            <Route path="/host/:eventId/guests" element={<PrivateRoute><GuestsPage /></PrivateRoute>} />
            <Route path="/host/:eventId/tables" element={<PrivateRoute><TablesPage /></PrivateRoute>} />

            <Route path="/host/:eventId/planner" element={<PrivateRoute><PlannerDashboard /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/tasks" element={<PrivateRoute><PlannerTasks /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/timeline" element={<PrivateRoute><PlannerTimeline /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/providers" element={<PrivateRoute><PlannerProviders /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/budget" element={<PrivateRoute><PlannerBudget /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/documents" element={<PrivateRoute><PlannerDocuments /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/venues" element={<PrivateRoute><PlannerVenues /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/catering" element={<PrivateRoute><PlannerCatering /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/gifts" element={<PrivateRoute><PlannerGifts /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/team" element={<PrivateRoute><PlannerTeam /></PrivateRoute>} />
            <Route path="/host/:eventId/planner/inspiration" element={<PrivateRoute><PlannerInspiration /></PrivateRoute>} />

            <Route path="/event/:eventId" element={<EventLanding />} />
            <Route path="/invitation/:eventId" anfitriones element={<InvitationPage />} />
            <Route path="/event/:eventId/upload" element={<GuestUpload />} />
            <Route path="/event/:eventId/gallery" element={<EventGallery />} />
            <Route path="/event/:eventId/guestbook" element={<GuestBook />} />
            <Route path="/event/:eventId/slideshow" element={<Slideshow />} />
            <Route path="/event/:eventId/find-table" element={<FindTablePage />} />
          </Routes>
          <Toaster />
          <DevHelper />
        </Suspense>
      </div>
    </>
  );
}

export default App;
