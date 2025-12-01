import React, { useState, useEffect } from 'react';
import { PricingConfig } from './types';
import { DEFAULT_PRICING } from './constants';
import Calculator from './components/Calculator';
import AdminPanel from './components/AdminPanel';
import { Settings, PenTool } from 'lucide-react';

const App: React.FC = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  // Load pricing from localStorage on mount with Deep Merge
  useEffect(() => {
    const savedPricing = localStorage.getItem('signQuotePricing');
    if (savedPricing) {
      try {
        const parsed = JSON.parse(savedPricing);
        
        // We merge parsed data ON TOP of DEFAULT_PRICING.
        // This ensures that if we added new categories (like ThreeD_SS) to defaults,
        // they exist even if the saved data didn't have them.
        setPricing(prevDefaults => ({
          ...prevDefaults, // Start with all defaults
          ...parsed,       // Overwrite with saved top-level keys
          
          // Deep merge the nested objects to preserve new default keys
          // while keeping saved values for existing keys.
          materials: {
            ...prevDefaults.materials,
            ...(parsed.materials || {})
          },
          pipes: {
            ...prevDefaults.pipes,
            ...(parsed.pipes || {})
          },
          labor: {
            ...prevDefaults.labor,
            ...(parsed.labor || {})
          },
          structural: {
            ...prevDefaults.structural,
            ...(parsed.structural || {})
          },
          electrical: {
            ...prevDefaults.electrical,
            ...(parsed.electrical || {})
          },
          others: {
            ...prevDefaults.others,
            ...(parsed.others || {})
          }
        }));
      } catch (e) {
        console.error("Failed to parse saved pricing", e);
      }
    }
  }, []);

  // Save pricing to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('signQuotePricing', JSON.stringify(pricing));
  }, [pricing]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <PenTool size={24} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              WTG Sign Quote Pro
            </h1>
          </div>
          <button
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors text-sm font-medium"
          >
            <Settings size={18} />
            Admin Pricing
          </button>
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
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-400 text-sm">
        <p>&copy; 2025 SignQuote Pro By Waytoogo Industries (Pvt) Ltd . All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;