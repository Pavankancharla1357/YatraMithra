/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import { useEffect } from 'react';
import { Navbar } from './components/Layout/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { ForgotPassword } from './pages/Auth/ForgotPassword';
import { ResetPassword } from './pages/Auth/ResetPassword';
import { ProfileSetup } from './pages/Profile/ProfileSetup';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ConnectionsList } from './pages/Profile/ConnectionsList';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DiscoverTrips } from './pages/Trips/DiscoverTrips';
import { CreateTrip } from './pages/Trips/CreateTrip';
import TripDetails from './pages/Trips/TripDetails';
import { JoinTrip } from './pages/Trips/JoinTrip';
import { InvitePage } from './pages/Trips/InvitePage';
import { TripExpenses } from './pages/Trips/TripExpenses';
import { DocumentVault } from './pages/Trips/DocumentVault';
import TravelMatcher from './pages/Trips/TravelMatcher';
import ExpertTravelPlanner from './pages/Trips/ExpertTravelPlanner';
import { ChatList } from './pages/Messages/ChatList';
import { ChatRoom } from './pages/Messages/ChatRoom';
import { BuddyFinder } from './pages/Feed/BuddyFinder';
import { Notifications } from './pages/Notifications/Notifications';
import { Settings } from './pages/Settings';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { toast, Toaster } from 'sonner';

const NotificationListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Listen for new unread notifications to show toasts
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      where('is_read', '==', false),
      orderBy('created_at', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show toast if it's a very recent notification (within last 10 seconds)
          const createdAt = data.created_at?.toDate ? data.created_at.toDate() : (data.created_at ? new Date(data.created_at) : new Date());
          if (Date.now() - createdAt.getTime() < 10000) {
            toast(data.title, {
              description: data.body || data.message,
              action: data.link ? {
                label: 'View',
                onClick: () => navigate(data.link)
              } : undefined
            });
          }
        }
      });
    }, (error) => {
      console.error('Notification listener error:', error);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner if auth is loading OR if user is logged in but profile hasn't been fetched yet
  if (loading || (user && profile === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // Only redirect to profile setup if profile is loaded and confirmed to be MISSING (null)
  // This means the user document doesn't exist in Firestore yet.
  // If the document exists, we let them stay on their current page to avoid flicker on reload.
  const isBrandNewUser = profile === null;
  
  if (isBrandNewUser && location.pathname !== '/profile/setup') {
    return <Navigate to="/profile/setup" replace />;
  }

  return <>{children}</>;
};

import { ErrorBoundary } from './components/ErrorBoundary';

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
          <NotificationListener />
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
              <Route path="/profile/:uid/connections" element={<ConnectionsList />} />
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
              <Route path="/invite/:token" element={<InvitePage />} />
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



