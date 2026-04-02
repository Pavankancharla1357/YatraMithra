/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import { Navbar } from './components/Layout/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { ForgotPassword } from './pages/Auth/ForgotPassword';
import { ResetPassword } from './pages/Auth/ResetPassword';
import { ProfileSetup } from './pages/Profile/ProfileSetup';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DiscoverTrips } from './pages/Trips/DiscoverTrips';
import { CreateTrip } from './pages/Trips/CreateTrip';
import TripDetails from './pages/Trips/TripDetails';
import { JoinTrip } from './pages/Trips/JoinTrip';
import { TripExpenses } from './pages/Trips/TripExpenses';
import { DocumentVault } from './pages/Trips/DocumentVault';
import TravelMatcher from './pages/Trips/TravelMatcher';
import ExpertTravelPlanner from './pages/Trips/ExpertTravelPlanner';
import { ChatList } from './pages/Messages/ChatList';
import { ChatRoom } from './pages/Messages/ChatRoom';
import { BuddyFinder } from './pages/Feed/BuddyFinder';
import { Notifications } from './pages/Notifications/Notifications';
import { Settings } from './pages/Settings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // If profile is incomplete (no interests) and we're not already on the setup page
  if (user && !profile?.interests?.length && location.pathname !== '/profile/setup') {
    return <Navigate to="/profile/setup" />;
  }

  return <>{children}</>;
};

import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useEffect } from 'react';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <Toaster position="top-center" richColors />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route 
                path="/profile/setup" 
                element={
                  <ProtectedRoute>
                    <ProfileSetup />
                  </ProtectedRoute>
                } 
              />
              <Route path="/discover" element={<DiscoverTrips />} />
              <Route 
                path="/buddy-finder" 
                element={
                  <ProtectedRoute>
                    <BuddyFinder />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/trips/create" 
                element={
                  <ProtectedRoute>
                    <CreateTrip />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/messages" 
                element={
                  <ProtectedRoute>
                    <ChatList />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/messages/:channelId" 
                element={
                  <ProtectedRoute>
                    <ChatRoom />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/trips/:id/expenses" 
                element={
                  <ProtectedRoute>
                    <TripExpenses />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/document-vault" 
                element={
                  <ProtectedRoute>
                    <DocumentVault />
                  </ProtectedRoute>
                } 
              />
              {/* Placeholder for other routes */}
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
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
              <Route path="/profile/:uid" element={<ProfilePage />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notifications" 
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } 
              />
              <Route path="/trips/:id" element={<TripDetails />} />
              <Route path="/join/:tripId/:inviteCode" element={<JoinTrip />} />
              <Route 
                path="/travel-matcher" 
                element={
                  <ProtectedRoute>
                    <TravelMatcher />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/expert-planner" 
                element={
                  <ProtectedRoute>
                    <ExpertTravelPlanner />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}



