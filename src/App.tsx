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
import { ProfileSetup } from './pages/Profile/ProfileSetup';
import { Profile } from './pages/Profile/Profile';
import { UserProfile } from './pages/Profile/UserProfile';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DiscoverTrips } from './pages/Trips/DiscoverTrips';
import { CreateTrip } from './pages/Trips/CreateTrip';
import { TripDetails } from './pages/Trips/TripDetails';
import { JoinTrip } from './pages/Trips/JoinTrip';
import { TripExpenses } from './pages/Trips/TripExpenses';
import { ChatList } from './pages/Messages/ChatList';
import { ChatRoom } from './pages/Messages/ChatRoom';
import { BuddyFinder } from './pages/Feed/BuddyFinder';
import { Notifications } from './pages/Notifications/Notifications';

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
import { setupPushNotifications } from './services/mobilePushService';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default function App() {
  useEffect(() => {
    setupPushNotifications().catch(err => console.error('Push notification setup failed:', err));
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-center" richColors />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
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
              {/* Placeholder for other routes */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route path="/profile/:uid" element={<UserProfile />} />
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
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}



