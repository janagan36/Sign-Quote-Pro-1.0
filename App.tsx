import React, { useState, useEffect } from 'react';
import { PricingConfig } from './types';
import { DEFAULT_PRICING } from './constants';
import Calculator from './components/Calculator';
import AdminPanel from './components/AdminPanel';
import { Settings, PenTool, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Load pricing
  useEffect(() => {
    const savedPricing = localStorage.getItem('signQuotePricing');
    if (savedPricing) {
      try {
        const parsed = JSON.parse(savedPricing);
        setPricing(prevDefaults => ({
          ...prevDefaults, 
          ...parsed,       
          materials: { ...prevDefaults.materials, ...(parsed.materials || {}) },
          pipes: { ...prevDefaults.pipes, ...(parsed.pipes || {}) },
          labor: { ...prevDefaults.labor, ...(parsed.labor || {}) },
          structural: { ...prevDefaults.structural, ...(parsed.structural || {}) },
          electrical: { ...prevDefaults.electrical, ...(parsed.electrical || {}) },
          others: { ...prevDefaults.others, ...(parsed.others || {}) }
        }));
      } catch (e) { console.error("Failed to parse saved pricing", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('signQuotePricing', JSON.stringify(pricing));
  }, [pricing]);

  return (
    <div className="min-h-screen font-sans">
      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/20 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/90 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30 backdrop-blur-sm">
              <PenTool size={22} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              WTG Sign Quote Pro
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all text-sm font-semibold border border-transparent hover:border-black/5 dark:hover:border-white/5 active:scale-95"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdminOpen ? (
          <AdminPanel 
            currentPricing={pricing} 
            onSave={(newPricing) => {
              setPricing(newPricing);
              setIsAdminOpen(false);
            }}
            onClose={() => setIsAdminOpen(false)}
          />
        ) : (
          <Calculator pricing={pricing} />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-500 dark:text-slate-400 text-xs mt-12 backdrop-blur-sm">
        <p>&copy; 2025 SignQuote Pro By Waytoogo Industries (Pvt) Ltd . All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;