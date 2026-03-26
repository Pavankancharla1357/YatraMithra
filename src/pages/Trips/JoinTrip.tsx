import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../components/Auth/AuthContext';
import { joinTripViaInvite } from '../../services/inviteService';
import { motion } from 'motion/react';
import { Plane, AlertCircle, CheckCircle, Loader2, LogIn } from 'lucide-react';

export const JoinTrip: React.FC = () => {
  const { tripId, inviteCode } = useParams<{ tripId: string; inviteCode: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_member'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login, but save the current path to return after login
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const processJoin = async () => {
      if (!tripId || !inviteCode) {
        setStatus('error');
        setError('Invalid invite link');
        return;
      }

      try {
        const result = await joinTripViaInvite(tripId, inviteCode, user.uid, profile);
        if (result.status === 'already_member') {
          setStatus('already_member');
        } else {
          setStatus('success');
        }
        
        // Redirect to trip details after a short delay
        setTimeout(() => {
          navigate(`/trips/${tripId}`);
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to join trip');
      }
    };

    processJoin();
  }, [user, authLoading, tripId, inviteCode, navigate, location.pathname, profile]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-gray-100"
      >
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          {status === 'loading' && <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />}
          {status === 'success' && <CheckCircle className="w-10 h-10 text-emerald-500" />}
          {status === 'already_member' && <CheckCircle className="w-10 h-10 text-indigo-500" />}
          {status === 'error' && <AlertCircle className="w-10 h-10 text-red-500" />}
        </div>

        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
          {status === 'loading' && 'Joining Trip...'}
          {status === 'success' && 'Welcome Aboard!'}
          {status === 'already_member' && 'Already a Member!'}
          {status === 'error' && 'Oops!'}
        </h2>

        <p className="text-gray-500 mb-8 leading-relaxed">
          {status === 'loading' && 'We are adding you to the trip. Please wait a moment.'}
          {status === 'success' && 'You have successfully joined the trip. Redirecting you to the details page...'}
          {status === 'already_member' && 'You are already a member of this trip. Redirecting you to the details page...'}
          {status === 'error' && (error || 'Something went wrong with the invite link.')}
        </p>

        {status === 'error' && (
          <button
            onClick={() => navigate('/discover')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Explore Other Trips
          </button>
        )}

        {status === 'loading' && !user && (
          <button
            onClick={() => navigate('/login', { state: { from: location.pathname } })}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center"
          >
            <LogIn className="w-5 h-5 mr-2" /> Sign In to Join
          </button>
        )}
      </motion.div>
    </div>
  );
};
