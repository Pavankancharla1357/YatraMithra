import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { getAuthErrorMessage } from '../../utils/authErrorHandler';
import { Compass, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code) || err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Compass className="text-white w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-3xl sm:px-10 border border-gray-100"
        >
          {message ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <p className="text-gray-900 font-bold mb-2">{message}</p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive it? Check your <b>spam folder</b> or try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setMessage('')}
                  className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-2xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all"
                >
                  Try a different email
                </button>
                <Link
                  to="/login"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-2xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending link...' : 'Send Reset Link'}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};
