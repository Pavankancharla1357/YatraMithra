import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/Auth/AuthContext';
import { db, auth } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RecaptchaVerifier, linkWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { User, MapPin, Heart, Plane, Check, Smartphone, X } from 'lucide-react';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export const ProfileSetup: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: profile?.name || user?.displayName || '',
    age: profile?.age?.toString() || '',
    location_city: profile?.location_city || '',
    location_country: profile?.location_country || '',
    bio: profile?.bio || '',
    gender: profile?.gender || 'prefer_not_to_say',
    social_links: {
      instagram: profile?.social_links?.instagram || '',
      linkedin: profile?.social_links?.linkedin || '',
      twitter: profile?.social_links?.twitter || '',
      website: profile?.social_links?.website || '',
    },
    interests: profile?.interests || [] as string[],
    travel_style: profile?.travel_style || 'mid_range',
    phone_number: profile?.phone_number || '',
  });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (profile) {
      // If phone starts with +91, strip it for the input field
      const displayPhone = profile.phone_number?.startsWith('+91') 
        ? profile.phone_number.replace('+91', '') 
        : profile.phone_number || '';

      setFormData(prev => ({
        ...prev,
        name: profile.name || prev.name,
        age: profile.age?.toString() || prev.age,
        gender: profile.gender || prev.gender,
        location_city: profile.location_city || prev.location_city,
        location_country: profile.location_country || prev.location_country,
        bio: profile.bio || prev.bio,
        interests: profile.interests || prev.interests,
        travel_style: profile.travel_style || prev.travel_style,
        phone_number: displayPhone,
        social_links: {
          instagram: profile.social_links?.instagram || prev.social_links.instagram,
          linkedin: profile.social_links?.linkedin || prev.social_links.linkedin,
          twitter: profile.social_links?.twitter || prev.social_links.twitter,
          website: profile.social_links?.website || prev.social_links.website,
        },
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.age && profile?.interests?.length && profile?.is_phone_verified) {
      // If profile is fully set up and verified, skip
      navigate('/discover');
    }
  }, [profile, navigate]);

  useEffect(() => {
    // Initialize Recaptcha for phone verification
    const initRecaptcha = () => {
      if (window.recaptchaVerifier) return;
      
      try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-setup', {
          size: 'invisible',
        });
        window.recaptchaVerifier = verifier;
      } catch (error) {
        console.error('Error initializing recaptcha:', error);
      }
    };

    initRecaptcha();

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  const startPhoneVerification = async () => {
    if (!formData.phone_number) {
      alert("Please enter a phone number first.");
      return;
    }

    if (!window.recaptchaVerifier) {
      alert("Recaptcha not initialized. Please try again.");
      return;
    }

    setVerifying(true);
    try {
      // Prepend +91 if it's a 10-digit number
      const fullNumber = formData.phone_number.startsWith('+') 
        ? formData.phone_number 
        : `+91${formData.phone_number}`;

      const result = await linkWithPhoneNumber(user!, fullNumber, window.recaptchaVerifier);
      setConfirmationResult(result);
      setShowOtpModal(true);
    } catch (error: any) {
      console.error('Error sending phone verification:', error);
      if (error.code === 'auth/credential-already-in-use') {
        alert("This phone number is already linked to another account.");
      } else {
        alert(`Error sending SMS: ${error.message}`);
      }
    } finally {
      setVerifying(false);
    }
  };

  const verifyOtp = async () => {
    if (!confirmationResult) return;
    
    setVerifying(true);
    try {
      await confirmationResult.confirm(otpCode);
      
      const path = `users/${user!.uid}`;
      try {
        const fullNumber = formData.phone_number.startsWith('+') 
          ? formData.phone_number 
          : `+91${formData.phone_number}`;

        await setDoc(doc(db, 'users', user!.uid), {
          uid: user!.uid,
          is_phone_verified: true,
          is_verified: true,
          phone_number: fullNumber,
          updated_at: new Date().toISOString(),
        }, { merge: true });
        
        await refreshProfile();
        setShowOtpModal(false);
        setOtpCode('');
        setConfirmationResult(null);
        alert("Phone verified successfully!");
      } catch (dbError) {
        handleFirestoreError(dbError, OperationType.WRITE, path);
      }
    } catch (error: any) {
      alert(`Invalid OTP: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdate = async () => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      const dataToSave = { ...formData };
      // Ensure phone number is stored in E.164 format if it's a 10-digit Indian number
      if (dataToSave.phone_number && dataToSave.phone_number.length === 10 && !dataToSave.phone_number.startsWith('+')) {
        dataToSave.phone_number = `+91${dataToSave.phone_number}`;
      }

      await setDoc(doc(db, 'users', user.uid), {
        ...dataToSave,
        uid: user.uid,
        email: user.email,
        age: parseInt(formData.age) || 0,
        updated_at: new Date().toISOString(),
        reputation_score: profile?.reputation_score || 0,
        is_email_verified: profile?.is_email_verified || false,
        is_id_verified: profile?.is_id_verified || false,
        created_at: profile?.created_at || new Date().toISOString(),
      }, { merge: true });
      await refreshProfile();
      navigate('/discover');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const interestsList = ['Nature', 'Food', 'History', 'Adventure', 'Nightlife', 'Culture', 'Photography', 'Hiking', 'Beach', 'Shopping'];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-1 mx-2 rounded ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100"
        >
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Basic Info</h2>
              <p className="text-gray-500">Let's start with the basics to help others know you better.</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.location_country}
                    onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="India"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="flex space-x-2">
                  <div className="flex-1 flex items-center px-4 py-3 border border-gray-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
                    <span className="text-gray-400 font-bold mr-2">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData.phone_number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, phone_number: val });
                      }}
                      className="flex-1 outline-none bg-transparent"
                      placeholder="9876543210"
                    />
                  </div>
                  {!profile?.is_phone_verified && (
                    <button
                      onClick={startPhoneVerification}
                      disabled={verifying}
                      className="px-6 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-all disabled:opacity-50"
                    >
                      {verifying ? '...' : 'Verify'}
                    </button>
                  )}
                </div>
                {profile?.is_phone_verified && (
                  <p className="mt-1 text-xs text-emerald-600 flex items-center">
                    <Check className="w-3 h-3 mr-1" /> Phone Verified
                  </p>
                )}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Travel Style</h2>
              <p className="text-gray-500">How do you like to travel?</p>

              <div className="grid grid-cols-1 gap-3">
                {['budget', 'mid_range', 'luxury', 'backpacking'].map((style) => (
                  <button
                    key={style}
                    onClick={() => setFormData({ ...formData, travel_style: style })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.travel_style === style ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <span className="font-bold capitalize">{style.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="w-1/3 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-2/3 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Interests & Bio</h2>
              <p className="text-gray-500">What are you passionate about?</p>

              <div className="flex flex-wrap gap-2">
                {interestsList.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.interests.includes(interest) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Social Links (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Instagram</label>
                    <input
                      type="text"
                      value={formData.social_links.instagram}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        social_links: { ...formData.social_links, instagram: e.target.value } 
                      })}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">LinkedIn</label>
                    <input
                      type="text"
                      value={formData.social_links.linkedin}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        social_links: { ...formData.social_links, linkedin: e.target.value } 
                      })}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Twitter</label>
                    <input
                      type="text"
                      value={formData.social_links.twitter}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        social_links: { ...formData.social_links, twitter: e.target.value } 
                      })}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Website</label>
                    <input
                      type="text"
                      value={formData.social_links.website}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        social_links: { ...formData.social_links, website: e.target.value } 
                      })}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(2)}
                  className="w-1/3 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleUpdate}
                  className="w-2/3 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Verify Phone</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Enter the 6-digit code sent to {formData.phone_number.startsWith('+') ? formData.phone_number : `+91${formData.phone_number}`}
                </p>
              </div>

              <div className="space-y-6">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="000000"
                />

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowOtpModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyOtp}
                    disabled={verifying || otpCode.length !== 6}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div id="recaptcha-container-setup"></div>
    </div>
  );
};
