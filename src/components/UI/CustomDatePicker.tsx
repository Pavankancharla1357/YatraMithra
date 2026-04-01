import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon } from 'lucide-react';

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  selected,
  onChange,
  placeholder = 'Select date',
  label,
  icon,
  minDate,
  maxDate,
  required = false
}) => {
  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <CalendarIcon className="h-4 w-4 text-indigo-600 group-hover:text-indigo-500 transition-colors" />
        </div>
        <DatePicker
          selected={selected}
          onChange={onChange}
          placeholderText={placeholder}
          minDate={minDate}
          maxDate={maxDate}
          required={required}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          dateFormat="MMMM d, yyyy"
          portalId="root"
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white hover:border-indigo-300 transition-all text-gray-900 font-medium placeholder-gray-400"
          calendarClassName="custom-calendar-popup shadow-2xl border-none rounded-3xl overflow-hidden p-2"
          dayClassName={(date) => 
            `rounded-full transition-all hover:bg-indigo-100 hover:text-indigo-600 ${
              selected && date.getTime() === selected.getTime() ? 'bg-indigo-600 text-white font-bold' : ''
            }`
          }
        />
      </div>
    </div>
  );
};
