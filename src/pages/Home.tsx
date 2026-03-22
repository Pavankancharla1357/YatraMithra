import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Users, Shield, MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../components/Auth/AuthContext';

export const Home: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/discover');
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-indigo-600 uppercase bg-indigo-50 rounded-full">
                Find your perfect travel companion
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
                Travel the world, <br />
                <span className="text-indigo-600">never alone.</span>
              </h1>
              <p className="max-w-2xl mx-auto text-xl text-gray-500 mb-10">
                Connect with verified travelers who share your interests, travel style, and budget. 
                Discover group trips or create your own adventure.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center"
                >
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/discover"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-full font-bold text-lg hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex items-center justify-center"
                >
                  Explore Trips
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-50/50 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <Users className="text-indigo-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Matching</h3>
              <p className="text-gray-500 leading-relaxed">
                Our AI algorithm matches you with companions based on travel personality, budget, and interests.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="text-emerald-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Verified Profiles</h3>
              <p className="text-gray-500 leading-relaxed">
                Trust is our priority. We verify identities and use a reputation system to ensure safe travels.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="text-amber-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Group Coordination</h3>
              <p className="text-gray-500 leading-relaxed">
                Built-in group chats, shared itineraries, and expense tracking to keep your trip organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Join 50,000+ travelers worldwide</h2>
          <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale">
            {/* Logos placeholder */}
            <div className="h-8 w-24 bg-gray-300 rounded" />
            <div className="h-8 w-32 bg-gray-300 rounded" />
            <div className="h-8 w-28 bg-gray-300 rounded" />
            <div className="h-8 w-36 bg-gray-300 rounded" />
          </div>
        </div>
      </section>
    </div>
  );
};
