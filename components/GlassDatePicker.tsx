import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface GlassDatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
}

const GlassDatePicker: React.FC<GlassDatePickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // For navigation
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize navigation date from value
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      // Create date object using local time arguments (Month is 0-indexed)
      setCurrentDate(new Date(y, m - 1, d));
    }
  }, []); // Only run once or when value significantly changes externally if needed

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isSelected = value === dateStr;
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          type="button"
          className={`
            h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
            ${isSelected 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110' 
              : isToday
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider block ml-1">
        {label}
      </label>
      
      {/* Input Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full p-3 pl-10 rounded-xl outline-none font-medium transition-all duration-200
          bg-slate-50/50 dark:bg-black/40 backdrop-blur-md
          border border-slate-200/60 dark:border-white/10
          text-slate-900 dark:text-white
          hover:bg-white/80 dark:hover:bg-white/10
          focus:ring-2 focus:ring-blue-500/50
          cursor-pointer relative flex items-center group
        `}
      >
        <span className="absolute left-3 text-blue-600 dark:text-blue-500 z-10 pointer-events-none transition-transform group-hover:scale-110 duration-200">
            <Calendar size={18} />
        </span>
        <span>{value || "Select Date"}</span>
      </div>

      {/* Popup Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 p-4 w-72 
          bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl 
          border border-slate-200/60 dark:border-white/10 
          rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200
        ">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button 
                type="button"
                onClick={handlePrevMonth} 
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-slate-800 dark:text-white">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button 
                type="button"
                onClick={handleNextMonth} 
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} className="text-xs font-bold text-slate-400 uppercase">{d}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {renderCalendarDays()}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlassDatePicker;