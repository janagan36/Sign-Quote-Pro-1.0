
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface GlassSelectProps {
  label?: string;
  value: string | number;
  options: (string | { label: string; value: string | number })[];
  onChange: (value: any) => void;
  icon?: React.ElementType;
  className?: string;
  placeholder?: string;
}

const GlassSelect: React.FC<GlassSelectProps> = ({ 
  label, 
  value, 
  options, 
  onChange, 
  icon: Icon, 
  className = "",
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize options to object format
  const normalizedOptions = options.map(opt => 
    typeof opt === 'object' ? opt : { label: opt, value: opt }
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider block ml-1">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full p-3 ${Icon ? 'pl-10' : 'pl-4'} pr-10 rounded-xl outline-none font-medium transition-all duration-200
          bg-white/40 dark:bg-black/40 backdrop-blur-md
          border border-white/40 dark:border-white/10
          text-slate-900 dark:text-white
          hover:bg-white/60 dark:hover:bg-white/10
          focus:ring-2 focus:ring-blue-500/50
          cursor-pointer relative flex items-center select-none min-h-[46px]
        `}
      >
        {Icon && (
            <span className="absolute left-3 text-slate-400 dark:text-slate-500 z-10 pointer-events-none">
                <Icon size={18} />
            </span>
        )}
        <span className="truncate block">{selectedOption?.label || placeholder || value}</span>
        <span className={`absolute right-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={18} />
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-full min-w-[200px] max-h-60 overflow-y-auto custom-scrollbar
          bg-white/90 dark:bg-[#1a1a1a]/95 backdrop-blur-xl 
          border border-white/20 dark:border-white/10 
          rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100
        ">
          <div className="p-1.5 space-y-0.5">
            {normalizedOptions.map((opt) => (
              <div
                key={String(opt.value)}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`
                  p-2.5 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-between transition-colors
                  ${value === opt.value 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10'
                  }
                `}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={16} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlassSelect;
