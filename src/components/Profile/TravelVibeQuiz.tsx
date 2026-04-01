import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Coffee, Mountain, Camera, Music, Utensils, Moon, Sun, Zap, Heart, Users } from 'lucide-react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

interface Question {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
    icon: React.ReactNode;
    category: 'pacing' | 'budget' | 'social' | 'activity';
    value: number;
  }[];
}

const questions: Question[] = [
  {
    id: 'q1',
    text: 'What is your ideal morning on a trip?',
    options: [
      { id: 'q1a', text: 'Early start, hiking to a viewpoint', icon: <Mountain className="w-5 h-5" />, category: 'activity', value: 5 },
      { id: 'q1b', text: 'Slow coffee at a local cafe', icon: <Coffee className="w-5 h-5" />, category: 'pacing', value: 1 },
      { id: 'q1c', text: 'Sleeping in and a late brunch', icon: <Moon className="w-5 h-5" />, category: 'pacing', value: 5 },
    ]
  },
  {
    id: 'q2',
    text: 'How do you prefer to spend your evenings?',
    options: [
      { id: 'q2a', text: 'Finding the best local bar/club', icon: <Music className="w-5 h-5" />, category: 'social', value: 5 },
      { id: 'q2b', text: 'Quiet dinner and a stroll', icon: <Utensils className="w-5 h-5" />, category: 'social', value: 1 },
      { id: 'q2c', text: 'Editing photos and planning tomorrow', icon: <Camera className="w-5 h-5" />, category: 'activity', value: 1 },
    ]
  },
  {
    id: 'q3',
    text: 'What is your travel budget style?',
    options: [
      { id: 'q3a', text: 'Hostels and street food (Budget)', icon: <Zap className="w-5 h-5" />, category: 'budget', value: 1 },
      { id: 'q3b', text: 'Boutique hotels and nice dinners (Mid)', icon: <Heart className="w-5 h-5" />, category: 'budget', value: 3 },
      { id: 'q3c', text: 'Luxury stays and fine dining (High)', icon: <Sparkles className="w-5 h-5" />, category: 'budget', value: 5 },
    ]
  },
  {
    id: 'q4',
    text: 'How do you like to get around?',
    options: [
      { id: 'q4a', text: 'Walking everywhere to see it all', icon: <Sun className="w-5 h-5" />, category: 'activity', value: 4 },
      { id: 'q4b', text: 'Public transport like a local', icon: <Users className="w-5 h-5" />, category: 'social', value: 3 },
      { id: 'q4c', text: 'Private cars or taxis for comfort', icon: <Sparkles className="w-5 h-5" />, category: 'budget', value: 4 },
    ]
  },
  {
    id: 'q5',
    text: 'What kind of destinations draw you in?',
    options: [
      { id: 'q5a', text: 'Bustling cities and skyscrapers', icon: <Zap className="w-5 h-5" />, category: 'social', value: 4 },
      { id: 'q5b', text: 'Remote nature and quiet landscapes', icon: <Mountain className="w-5 h-5" />, category: 'pacing', value: 4 },
      { id: 'q5c', text: 'Historic towns and ancient ruins', icon: <Camera className="w-5 h-5" />, category: 'activity', value: 3 },
    ]
  }
];

interface TravelVibeQuizProps {
  userId: string;
  onComplete: (results: any) => void;
  onClose: () => void;
}

export const TravelVibeQuiz: React.FC<TravelVibeQuizProps> = ({ userId, onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = (category: string, value: number) => {
    const updatedAnswers = { ...answers, [category]: (answers[category] || 0) + value };
    setAnswers(updatedAnswers);
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitQuiz(updatedAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: Record<string, number>) => {
    setIsSubmitting(true);
    const path = `users/${userId}`;
    try {
      await setDoc(doc(db, 'users', userId), {
        vibe_quiz_results: finalAnswers,
        updated_at: new Date().toISOString()
      }, { merge: true });
      onComplete(finalAnswers);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="mb-8 flex justify-between items-center">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            Question {currentStep + 1} of {questions.length}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
              {questions[currentStep].text}
            </h2>

            <div className="space-y-4">
              {questions[currentStep].options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswer(option.category, option.value)}
                  className="w-full p-6 bg-gray-50 hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-200 rounded-3xl flex items-center space-x-4 transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {option.icon}
                  </div>
                  <span className="text-lg font-bold text-gray-700 group-hover:text-indigo-700">
                    {option.text}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-bold text-gray-900">Calculating your vibe...</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
