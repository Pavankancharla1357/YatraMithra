import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/Auth/AuthContext';
import { db, auth } from '../../firebase';
import { doc, setDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, linkWithPhoneNumber, sendPasswordResetEmail } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { User, MapPin, Heart, Mail, Shield, Star, Edit2, Check, X, Instagram, Linkedin, Twitter, Globe, Sparkles, MessageSquare, Phone, Smartphone, Camera, Image as ImageIcon, Upload, Plane, ArrowLeft, Lock as LockIcon, Info, Award, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { TravelVibeQuiz } from '../../components/Profile/TravelVibeQuiz';
import { ReviewSystem } from '../../components/Profile/ReviewSystem';
import { MyBuddyPosts } from '../../components/Profile/MyBuddyPosts';
import { MyChatHistory } from '../../components/Profile/MyChatHistory';
import { subscribeToUserRating } from '../../services/reviewService';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'security' | 'buddy' | 'chats'>('about');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [tripCount, setTripCount] = useState(0);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [showReputationInfo, setShowReputationInfo] = useState(false);

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    photo_url: profile?.photo_url || '',
    cover_url: profile?.cover_url || '',
    bio: profile?.bio || '',
    location_city: profile?.location_city || '',
    location_country: profile?.location_country || '',
    gender: profile?.gender || 'prefer_not_to_say',
    age: profile?.age || '',
    travel_style: profile?.travel_style || 'mid_range',
    phone_number: '',
    social_links: {
      instagram: profile?.social_links?.instagram || '',
      linkedin: profile?.social_links?.linkedin || '',
      twitter: profile?.social_links?.twitter || '',
      website: profile?.social_links?.website || '',
    },
    interests: profile?.interests || [] as string[]
  });

  // Cropping state
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'profile' | 'cover'>('profile');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (profile) {
      const displayPhone = profile.phone_number?.startsWith('+91') 
        ? profile.phone_number.replace('+91', '') 
        : profile.phone_number || '';

      setFormData({
        name: profile.name || '',
        photo_url: profile.photo_url || '',
        cover_url: profile.cover_url || '',
        bio: profile.bio || '',
        location_city: profile.location_city || '',
        location_country: profile.location_country || '',
        gender: profile.gender || 'prefer_not_to_say',
        age: profile.age || '',
        travel_style: profile.travel_style || 'mid_range',
        phone_number: displayPhone,
        social_links: {
          instagram: profile.social_links?.instagram || '',
          linkedin: profile.social_links?.linkedin || '',
          twitter: profile.social_links?.twitter || '',
          website: profile.social_links?.website || '',
        },
        interests: profile.interests || []
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    // Fetch Trip Count
    const tripsQuery = query(collection(db, 'trips'), where('organizer_id', '==', user.uid));
    const unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
      setTripCount(snapshot.size);
    });

    // Fetch Review Stats
    const unsubscribeReviews = subscribeToUserRating(user.uid, (stats) => {
      setReviewStats(stats);
    });

    return () => {
      unsubscribeTrips();
      unsubscribeReviews();
    };
  }, [user]);

  const formatSocialLink = (url: string, platform: 'instagram' | 'linkedin' | 'twitter') => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    
    const baseUrls = {
      instagram: 'https://instagram.com/',
      linkedin: 'https://linkedin.com/in/',
      twitter: 'https://twitter.com/'
    };
    
    return `${baseUrls[platform]}${url.replace('@', '')}`;
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Limit maximum dimensions to ensure the base64 string fits in Firestore (1MB limit)
    const MAX_WIDTH = cropType === 'profile' ? 400 : 1200;
    const MAX_HEIGHT = cropType === 'profile' ? 400 : 675; // 16:9 ratio for 1200 width

    let targetWidth = pixelCrop.width;
    let targetHeight = pixelCrop.height;

    if (targetWidth > MAX_WIDTH) {
      const ratio = MAX_WIDTH / targetWidth;
      targetWidth = MAX_WIDTH;
      targetHeight = targetHeight * ratio;
    }

    if (targetHeight > MAX_HEIGHT) {
      const ratio = MAX_HEIGHT / targetHeight;
      targetHeight = MAX_HEIGHT;
      targetWidth = targetWidth * ratio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return canvas.toDataURL('image/jpeg', 0.7); // Slightly lower quality for better compression
  };

  const handleApplyCrop = async () => {
    if (cropImage && croppedAreaPixels) {
      setIsCropping(true);
      try {
        const croppedImage = await getCroppedImg(cropImage, croppedAreaPixels);
        
        // Final check for Firestore 1MB limit (base64 string size)
        if (croppedImage.length > 800000) { // ~800KB limit to be safe
          alert('The adjusted image is still too large. Please try zooming in more or using a smaller image.');
          return;
        }

        setFormData(prev => ({
          ...prev,
          [cropType === 'profile' ? 'photo_url' : 'cover_url']: croppedImage
        }));
        setCropImage(null);
      } catch (error) {
        console.error('Error cropping image:', error);
        alert('Failed to crop image. Please try again.');
      } finally {
        setIsCropping(false);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit initial file size to 5MB to prevent browser issues
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Please select an image smaller than 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage(reader.result as string);
        setCropType(type);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const initRecaptcha = () => {
      if (window.recaptchaVerifier) return;
      
      try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        setRecaptchaVerifier(verifier);
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
        age: parseInt(formData.age.toString()) || 0,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      await refreshProfile();
      setIsEditing(false);
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

  const interestsList = [
    'Nature', 'Food', 'History', 'Adventure', 'Nightlife', 'Culture', 
    'Photography', 'Hiking', 'Beach', 'Shopping', 'Mountains', 'Solo Travel',
    'Road Trips', 'Luxury', 'Backpacking', 'Wildlife', 'Art', 'Music Festivals',
    'Yoga', 'Surfing', 'Skiing', 'City Breaks', 'Rural Life', 'Architecture'
  ];

  const startPhoneVerification = async () => {
    if (!formData.phone_number || formData.phone_number.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!window.recaptchaVerifier) {
      alert("Recaptcha not initialized. Please try again.");
      return;
    }

    setVerifying(true);
    try {
      const fullNumber = `+91${formData.phone_number}`;
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
        const fullNumber = `+91${formData.phone_number}`;
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
        alert("Phone verified successfully! Your profile is now verified.");
      } catch (dbError) {
        handleFirestoreError(dbError, OperationType.WRITE, path);
      }
    } catch (error: any) {
      alert(`Invalid OTP or verification failed: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  };

  if (!profile) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-32 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-12">
        {isAndroid && (
          <button
            onClick={() => navigate(-1)}
            className="mb-4 p-2 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center text-gray-600 font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
        )}
        {/* Profile Header - Ultra Modern Design */}
        <div className="bg-white rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 mb-8 relative group">
          <div className={`h-48 sm:h-64 relative overflow-hidden rounded-t-3xl ${isEditing ? 'cursor-pointer group/cover' : ''}`}
               onClick={() => isEditing && document.getElementById('cover-upload')?.click()}>
            {formData.cover_url ? (
              <img src={formData.cover_url} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input 
                  type="file" 
                  id="cover-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'cover')}
                />
              </div>
            )}
          </div>
          
          <div className="px-6 sm:px-12">
            <div className="relative flex flex-col sm:flex-row items-end sm:items-end space-y-4 sm:space-y-0 sm:space-x-8 -mt-12 sm:-mt-16">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-28 h-28 sm:w-40 sm:h-40 bg-white rounded-3xl p-1.5 sm:p-3 shadow-2xl relative z-10 ${isEditing ? 'cursor-pointer group/photo' : ''}`}
                onClick={(e) => {
                  if (isEditing) {
                    e.stopPropagation();
                    document.getElementById('photo-upload-header')?.click();
                  }
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-white rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center overflow-hidden border border-indigo-50/50 relative">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-12 h-12 sm:w-20 sm:h-20 text-indigo-300" />
                  )}
                  
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                      <input 
                        type="file" 
                        id="photo-upload-header" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, 'profile')}
                      />
                    </div>
                  )}
                </div>
                {profile.is_verified && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-blue-500 rounded-xl sm:rounded-2xl p-1 sm:p-2 shadow-xl border-4 border-white"
                  >
                    <Check className="w-3 h-3 sm:w-5 sm:h-5 text-white" strokeWidth={4} />
                  </motion.div>
                )}
              </motion.div>
              
              <div className="pb-2 sm:pb-6 flex-1">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mb-1 sm:mb-2"
                >
                  {profile.name}
                </motion.h1>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-wrap items-center gap-2 sm:gap-4 font-semibold"
                >
                  <div className="flex items-center bg-indigo-50/80 backdrop-blur-sm px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                    <MapPin className="w-3 h-3 mr-1.5 text-indigo-600" />
                    <span className="text-[10px] sm:text-xs text-indigo-900">{profile.location_city}, {profile.location_country}</span>
                  </div>
                  <div className="flex items-center bg-violet-50/80 backdrop-blur-sm px-3 py-1 rounded-full border border-violet-100 shadow-sm">
                    <span className="uppercase tracking-widest text-[8px] sm:text-[9px] font-black text-violet-900">
                      {profile.gender?.replace('_', ' ')}
                    </span>
                  </div>
                </motion.div>
              </div>

              <div className="pb-2 sm:pb-6">
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] sm:text-xs hover:bg-indigo-700 transition-all flex items-center shadow-lg"
                >
                  {isEditing ? <X className="w-3 h-3 mr-1.5" /> : <Edit2 className="w-3 h-3 mr-1.5" />}
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            </div>

            <div className="pt-8 sm:pt-12 pb-6 sm:pb-8">
              <div className="flex flex-wrap justify-end items-center gap-6 sm:gap-12">
              <div className="text-center group/stat cursor-pointer relative" onClick={() => setShowReputationInfo(!showReputationInfo)}>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 leading-none mb-1 group-hover/stat:text-indigo-600 transition-colors">{profile.reputation_score || 0}</p>
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Reputation</span>
                  <Info className="w-2.5 h-2.5 text-gray-300 group-hover/stat:text-indigo-400" />
                </div>
                
                <AnimatePresence>
                  {showReputationInfo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-4 right-0 w-64 bg-gray-900 text-white p-4 rounded-2xl text-left shadow-2xl z-50"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <Award className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-black uppercase tracking-widest">Trust Score</span>
                      </div>
                      <p className="text-[10px] text-gray-300 leading-relaxed font-medium">
                        Your reputation grows as you complete trips, receive positive reviews, and verify your identity. High reputation helps you find better travel buddies!
                      </p>
                      <div className="absolute bottom-0 right-8 translate-y-1/2 rotate-45 w-3 h-3 bg-gray-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="hidden sm:block w-px h-8 bg-gray-100" />
              <div className="text-center group/stat cursor-default">
                <p className="text-2xl sm:text-3xl font-black text-gray-900 leading-none mb-1 group-hover/stat:text-violet-600 transition-colors">{tripCount}</p>
                <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Trips</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-gray-100" />
              <div className="text-center group/stat cursor-default">
                <p className="text-2xl sm:text-3xl font-black text-gray-900 leading-none mb-1 group-hover/stat:text-fuchsia-600 transition-colors">{reviewStats.totalReviews}</p>
                <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Reviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
          {/* Left Sidebar */}
          <div className="lg:col-span-4 space-y-8 sm:space-y-10">
            {/* Travel Vibe Card - Premium Glassmorphism */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-12px_rgba(0,0,0,0.05)] border border-gray-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-lg font-black text-gray-900">Travel Vibe</h3>
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              
              {profile.vibe_quiz_results ? (
                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Activity Level</span>
                      <span className="text-indigo-600">{profile.vibe_quiz_results.activity}/5</span>
                    </div>
                    <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(profile.vibe_quiz_results.activity || 0) * 20}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Social Vibe</span>
                      <span className="text-violet-600">{profile.vibe_quiz_results.social}/5</span>
                    </div>
                    <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(profile.vibe_quiz_results.social || 0) * 20}%` }}
                        className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Budget Style</span>
                      <span className="text-emerald-600">{profile.vibe_quiz_results.budget}/5</span>
                    </div>
                    <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(profile.vibe_quiz_results.budget || 0) * 20}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Travel Pace</span>
                      <span className="text-amber-600">{profile.vibe_quiz_results.pacing}/5</span>
                    </div>
                    <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(profile.vibe_quiz_results.pacing || 0) * 20}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowQuiz(true)}
                    className="w-full mt-4 py-3 text-[11px] font-black text-indigo-600 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100/50"
                  >
                    Retake Vibe Quiz
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowQuiz(true)}
                  className="w-full py-6 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-indigo-100 transition-all flex flex-col items-center justify-center space-y-3 group"
                >
                  <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm">Discover Your Vibe</span>
                    <span className="text-[10px] text-white/70 font-medium">Personalize your travel experience</span>
                  </div>
                </button>
              )}
            </div>

            {/* Social Links Card */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-12px_rgba(0,0,0,0.05)] border border-gray-50">
              <h3 className="text-lg font-black text-gray-900 mb-6">Social Presence</h3>
              <div className="grid grid-cols-2 gap-4">
                <a 
                  href={formatSocialLink(profile.social_links?.instagram, 'instagram')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center p-4 rounded-xl transition-all group border border-transparent ${
                    profile.social_links?.instagram 
                      ? 'bg-gray-50 hover:bg-pink-50 hover:border-pink-100' 
                      : 'bg-gray-50/50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={(e) => !profile.social_links?.instagram && e.preventDefault()}
                >
                  <Instagram className={`w-5 h-5 mb-2 transition-colors ${
                    profile.social_links?.instagram ? 'text-gray-400 group-hover:text-pink-500' : 'text-gray-300'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    profile.social_links?.instagram ? 'text-gray-400 group-hover:text-pink-600' : 'text-gray-300'
                  }`}>Instagram</span>
                </a>
                <a 
                  href={formatSocialLink(profile.social_links?.linkedin, 'linkedin')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center p-4 rounded-xl transition-all group border border-transparent ${
                    profile.social_links?.linkedin 
                      ? 'bg-gray-50 hover:bg-blue-50 hover:border-blue-100' 
                      : 'bg-gray-50/50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={(e) => !profile.social_links?.linkedin && e.preventDefault()}
                >
                  <Linkedin className={`w-5 h-5 mb-2 transition-colors ${
                    profile.social_links?.linkedin ? 'text-gray-400 group-hover:text-blue-600' : 'text-gray-300'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    profile.social_links?.linkedin ? 'text-gray-400 group-hover:text-blue-600' : 'text-gray-300'
                  }`}>LinkedIn</span>
                </a>
                <a 
                  href={formatSocialLink(profile.social_links?.twitter, 'twitter')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center p-4 rounded-xl transition-all group border border-transparent ${
                    profile.social_links?.twitter 
                      ? 'bg-gray-50 hover:bg-sky-50 hover:border-sky-100' 
                      : 'bg-gray-50/50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={(e) => !profile.social_links?.twitter && e.preventDefault()}
                >
                  <Twitter className={`w-5 h-5 mb-2 transition-colors ${
                    profile.social_links?.twitter ? 'text-gray-400 group-hover:text-sky-500' : 'text-gray-300'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    profile.social_links?.twitter ? 'text-gray-400 group-hover:text-sky-600' : 'text-gray-300'
                  }`}>Twitter</span>
                </a>
                <a 
                  href={profile.social_links?.website?.startsWith('http') ? profile.social_links.website : `https://${profile.social_links?.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center p-4 rounded-xl transition-all group border border-transparent ${
                    profile.social_links?.website 
                      ? 'bg-gray-50 hover:bg-emerald-50 hover:border-emerald-100' 
                      : 'bg-gray-50/50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={(e) => !profile.social_links?.website && e.preventDefault()}
                >
                  <Globe className={`w-5 h-5 mb-2 transition-colors ${
                    profile.social_links?.website ? 'text-gray-400 group-hover:text-emerald-600' : 'text-gray-300'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    profile.social_links?.website ? 'text-gray-400 group-hover:text-emerald-600' : 'text-gray-300'
                  }`}>Website</span>
                </a>
              </div>
            </div>

            {/* App Branding */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 rounded-2xl shadow-xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
              <motion.div 
                className="w-16 h-16 mx-auto mb-4 relative z-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 1 }}
              >
                <Compass className="text-white w-9 h-9" />
              </motion.div>
              <h4 className="text-white font-black text-lg relative z-10 tracking-tight">YatraMitra</h4>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-[0.2em] relative z-10">Your Travel Companion</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-10">
            {/* Navigation Tabs - High End Pill Design */}
            <div className="flex p-1.5 bg-white rounded-xl shadow-[0_10px_25px_-10px_rgba(0,0,0,0.05)] border border-gray-50 max-w-2xl overflow-x-auto no-scrollbar">
              {(['about', 'reviews', 'buddy', 'chats', 'security'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[80px] py-2.5 rounded-lg font-black text-[11px] sm:text-xs capitalize transition-all relative overflow-hidden group ${
                    activeTab === tab 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-100"
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'about' && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] border border-gray-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900">About Me</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests?.map((interest: string) => (
                        <span key={interest} className="px-3 py-1.5 bg-indigo-50/50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100/50">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="Enter your name"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Gender</label>
                          <div className="relative">
                            <Heart className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <select
                              value={formData.gender}
                              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                              className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 appearance-none transition-all cursor-pointer"
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                              <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Age</label>
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="number"
                              value={formData.age}
                              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="e.g. 25"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">City</label>
                          <div className="relative">
                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="text"
                              value={formData.location_city}
                              onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="e.g. Mumbai"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Country</label>
                          <div className="relative">
                            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="text"
                              value={formData.location_country}
                              onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="e.g. India"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Bio</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-medium text-sm text-gray-600 leading-relaxed resize-none transition-all"
                          placeholder="Tell us about your travel adventures..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Travel Style</label>
                          <div className="relative">
                            <Plane className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <select
                              value={formData.travel_style}
                              onChange={(e) => setFormData({ ...formData, travel_style: e.target.value })}
                              className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 appearance-none transition-all cursor-pointer"
                            >
                              <option value="budget">Budget</option>
                              <option value="mid_range">Mid Range</option>
                              <option value="luxury">Luxury</option>
                              <option value="backpacking">Backpacking</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Instagram Username</label>
                          <div className="relative">
                            <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="text"
                              value={formData.social_links.instagram}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                social_links: { ...formData.social_links, instagram: e.target.value } 
                              })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="@username"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">LinkedIn Profile URL</label>
                          <div className="relative">
                            <Linkedin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="text"
                              value={formData.social_links.linkedin}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                social_links: { ...formData.social_links, linkedin: e.target.value } 
                              })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="linkedin.com/in/username"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Twitter Username</label>
                          <div className="relative">
                            <Twitter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="text"
                              value={formData.social_links.twitter}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                social_links: { ...formData.social_links, twitter: e.target.value } 
                              })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="@username"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Personal Website</label>
                          <div className="relative">
                            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                              type="text"
                              value={formData.social_links.website}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                social_links: { ...formData.social_links, website: e.target.value } 
                              })}
                              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-sm text-gray-900 transition-all"
                              placeholder="https://yourwebsite.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Interests</label>
                        <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl border-2 border-transparent">
                          {interestsList.map((interest) => (
                            <button
                              key={interest}
                              onClick={(e) => {
                                e.preventDefault();
                                toggleInterest(interest);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                                formData.interests.includes(interest)
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-100 hover:text-indigo-600'
                              }`}
                            >
                              {interest}
                            </button>
                          ))}
                        </div>
                      </div>

                      {isEditing && (
                        <button
                          onClick={handleUpdate}
                          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-sm hover:shadow-lg transition-all transform hover:-translate-y-0.5 mt-8"
                        >
                          Save Changes
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                          <User className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-bold text-gray-700">{profile.age || 'Age not set'} years old</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                          <Plane className="w-4 h-4 text-violet-600" />
                          <span className="text-sm font-bold text-gray-700 capitalize">{profile.travel_style?.replace('_', ' ') || 'Style not set'}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                          <Heart className="w-4 h-4 text-pink-600" />
                          <span className="text-sm font-bold text-gray-700 capitalize">{profile.gender?.replace('_', ' ') || 'Gender not set'}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-bold text-gray-700">{profile.location_city}, {profile.location_country}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Bio</label>
                        <p className="text-gray-600 leading-relaxed font-medium text-base sm:text-lg italic bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                          "{profile.bio || 'No bio yet. Tell us about your travel adventures!'}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Social Presence</label>
                          <div className="grid grid-cols-2 gap-3">
                            <a 
                              href={formatSocialLink(profile.social_links?.instagram, 'instagram')} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`flex items-center space-x-3 p-3 rounded-xl transition-all border ${
                                profile.social_links?.instagram 
                                  ? 'bg-white border-gray-100 hover:border-pink-200 hover:bg-pink-50/30' 
                                  : 'bg-gray-50/50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <Instagram className={`w-4 h-4 ${profile.social_links?.instagram ? 'text-pink-500' : 'text-gray-300'}`} />
                              <span className="text-xs font-bold text-gray-600">Instagram</span>
                            </a>
                            <a 
                              href={formatSocialLink(profile.social_links?.linkedin, 'linkedin')} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`flex items-center space-x-3 p-3 rounded-xl transition-all border ${
                                profile.social_links?.linkedin 
                                  ? 'bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50/30' 
                                  : 'bg-gray-50/50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <Linkedin className={`w-4 h-4 ${profile.social_links?.linkedin ? 'text-blue-500' : 'text-gray-300'}`} />
                              <span className="text-xs font-bold text-gray-600">LinkedIn</span>
                            </a>
                            <a 
                              href={formatSocialLink(profile.social_links?.twitter, 'twitter')} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`flex items-center space-x-3 p-3 rounded-xl transition-all border ${
                                profile.social_links?.twitter 
                                  ? 'bg-white border-gray-100 hover:border-sky-200 hover:bg-sky-50/30' 
                                  : 'bg-gray-50/50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <Twitter className={`w-4 h-4 ${profile.social_links?.twitter ? 'text-sky-500' : 'text-gray-300'}`} />
                              <span className="text-xs font-bold text-gray-600">Twitter</span>
                            </a>
                            <a 
                              href={profile.social_links?.website?.startsWith('http') ? profile.social_links.website : `https://${profile.social_links?.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`flex items-center space-x-3 p-3 rounded-xl transition-all border ${
                                profile.social_links?.website 
                                  ? 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30' 
                                  : 'bg-gray-50/50 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <Globe className={`w-4 h-4 ${profile.social_links?.website ? 'text-emerald-500' : 'text-gray-300'}`} />
                              <span className="text-xs font-bold text-gray-600">Website</span>
                            </a>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Phone Number</label>
                          <div className="relative">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                              <span className="text-sm font-black text-gray-400">+91</span>
                            </div>
                            <div className={`w-full pl-16 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-sm flex items-center justify-between ${
                              profile.is_phone_verified ? 'text-emerald-600 bg-emerald-50/20' : 'text-gray-400'
                            }`}>
                              <span>{formData.phone_number || 'Not set'}</span>
                              {profile.is_phone_verified ? (
                                <div className="flex items-center space-x-1 text-emerald-500">
                                  <Check className="w-4 h-4" strokeWidth={3} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setActiveTab('security');
                                  }}
                                  className="text-indigo-600 hover:underline text-[10px] font-black uppercase tracking-widest"
                                >
                                  Verify Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="space-y-6"
                >
                  {/* Phone Verification - MODERN UI */}
                  <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] border border-gray-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/30 rounded-full -mr-24 -mt-24 blur-3xl" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 relative z-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-white rounded-2xl flex items-center justify-center shadow-inner border border-indigo-50/50">
                        <Smartphone className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">Mobile Verification</h3>
                        <p className="text-gray-400 text-sm font-medium">Secure your account with OTP verification</p>
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none z-10">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl" role="img" aria-label="India Flag">🇮🇳</span>
                            <span className="text-xl font-black text-gray-300 group-focus-within:text-indigo-600 transition-colors">+91</span>
                          </div>
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          disabled={profile.is_phone_verified}
                          value={formData.phone_number}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, phone_number: val });
                          }}
                          className={`w-full pl-32 pr-6 py-6 sm:py-8 bg-gray-50 border-2 border-transparent rounded-2xl text-2xl sm:text-3xl font-black tracking-widest outline-none transition-all shadow-inner ${
                            profile.is_phone_verified 
                              ? 'text-emerald-500 bg-emerald-50/20 cursor-not-allowed' 
                              : 'text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-8 focus:ring-indigo-50/50'
                          }`}
                          placeholder="00000 00000"
                        />
                        {profile.is_phone_verified && (
                          <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center space-x-2 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg"
                          >
                            <Check className="w-4 h-4" strokeWidth={4} />
                            <span className="font-black text-[10px] uppercase tracking-widest">Verified</span>
                          </motion.div>
                        )}
                      </div>

                      {!profile.is_phone_verified && (
                        <button
                          onClick={startPhoneVerification}
                          disabled={verifying || formData.phone_number.length !== 10}
                          className="w-full py-5 sm:py-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-30"
                        >
                          {verifying ? (
                            <div className="flex items-center justify-center space-x-3">
                              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Securing...</span>
                            </div>
                          ) : 'Get Verification Code'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Other Verifications - Modern Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-12px_rgba(0,0,0,0.05)] border border-gray-50 flex items-center justify-between group hover:border-indigo-100 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mail className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-base font-black text-gray-900">Email Status</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[120px]">{user?.email}</p>
                        </div>
                      </div>
                      <div className="p-1.5 bg-emerald-50 rounded-full">
                        <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-12px_rgba(0,0,0,0.05)] border border-gray-50 flex items-center justify-between group hover:border-indigo-100 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Shield className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-base font-black text-gray-900">Identity Badge</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Global Trust Score</p>
                        </div>
                      </div>
                      {profile.is_verified ? (
                        <div className="p-1.5 bg-emerald-50 rounded-full">
                          <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-50 rounded-full border-2 border-dashed border-gray-200" />
                      )}
                    </div>
                  </div>

                  {/* Change Password Section */}
                  <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] border border-gray-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-violet-50/30 rounded-full -mr-24 -mt-24 blur-3xl" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 relative z-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-50 to-white rounded-2xl flex items-center justify-center shadow-inner border border-violet-50/50">
                        <LockIcon className="w-8 h-8 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">Security Settings</h3>
                        <p className="text-gray-400 text-sm font-medium">Manage your password and account security</p>
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <p className="text-sm text-gray-600 font-medium">
                        To change your password, we'll send a secure reset link to your registered email address.
                      </p>
                      <button
                        onClick={async () => {
                          if (!user?.email) return;
                          try {
                            await sendPasswordResetEmail(auth, user.email);
                            alert(`A password reset link has been sent to ${user.email}. Please check your inbox.`);
                          } catch (err: any) {
                            alert(`Error: ${err.message}`);
                          }
                        }}
                        className="flex items-center space-x-2 px-6 py-3 bg-violet-50 text-violet-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-100 transition-all border border-violet-100"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Send Reset Email</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-8 rounded-3xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] border border-gray-50"
                >
                  <ReviewSystem targetUserId={user!.uid} />
                </motion.div>
              )}

              {activeTab === 'buddy' && (
                <motion.div
                  key="buddy"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <MyBuddyPosts />
                </motion.div>
              )}

              {activeTab === 'chats' && (
                <motion.div
                  key="chats"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <MyChatHistory />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* OTP MODAL - MODERN OVERLAY */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-10 text-center relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-violet-600" />
              
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-indigo-50/50">
                <Smartphone className="w-8 h-8 text-indigo-600" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">Verify Identity</h3>
              <p className="text-gray-500 text-xs font-medium mb-6">
                Enter the 6-digit security code sent to <br/>
                <span className="text-indigo-600 font-black">+91 {formData.phone_number}</span>
              </p>

              <div className="space-y-8">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-4xl sm:text-5xl font-black tracking-[0.3em] py-6 sm:py-8 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-8 focus:ring-indigo-50 outline-none transition-all shadow-inner text-gray-900"
                    placeholder="000000"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowOtpModal(false)}
                    className="py-4 bg-gray-50 text-gray-500 rounded-xl font-black text-sm hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyOtp}
                    disabled={verifying || otpCode.length !== 6}
                    className="py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-black text-sm hover:shadow-lg transition-all disabled:opacity-30 transform hover:-translate-y-0.5"
                  >
                    {verifying ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : 'Confirm Code'}
                  </button>
                </div>
                
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Didn't receive code? <button className="text-indigo-600 hover:underline">Resend SMS</button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CROP MODAL */}
      <AnimatePresence>
        {cropImage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white z-20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    Adjust {cropType === 'profile' ? 'Profile' : 'Cover'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleApplyCrop}
                    disabled={isCropping}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-black hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCropping ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save
                  </button>
                  <button 
                    onClick={() => setCropImage(null)} 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Cropper Area */}
              <div className="relative flex-1 min-h-[200px] sm:min-h-[300px] bg-gray-950">
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropType === 'profile' ? 1 : 16 / 9}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              {/* Footer Controls */}
              <div className="p-4 sm:p-5 bg-white border-t border-gray-100 z-20">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      <span>Zoom Level</span>
                      <span className="text-indigo-600">{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setCropImage(null)}
                      className="flex-1 sm:px-6 py-3 bg-gray-50 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyCrop}
                      disabled={isCropping}
                      className="flex-[2] sm:px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCropping ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Apply & Save'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuiz && (
          <TravelVibeQuiz 
            userId={user!.uid} 
            onClose={() => setShowQuiz(false)}
            onComplete={() => {
              setShowQuiz(false);
              refreshProfile();
            }}
          />
        )}
      </AnimatePresence>

      <div id="recaptcha-container"></div>
    </div>
  );
};
