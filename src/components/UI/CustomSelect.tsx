import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  label,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border border-gray-200 rounded-2xl flex items-center justify-between bg-white transition-all hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none ${
          isOpen ? 'border-indigo-500 ring-2 ring-indigo-500' : ''
        }`}
      >
        <span className={`truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-indigo-100/50 overflow-hidden py-2 mt-1"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                    value === option.value
                      ? 'bg-indigo-50 text-indigo-600 font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{option.label}</span>
                  {value === option.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
