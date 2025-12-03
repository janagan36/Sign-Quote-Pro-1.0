import React, { useState } from 'react';
import { PricingConfig, PIPE_SIZES, SignCategory } from '../types';
import { SIGN_TYPES_HIERARCHY, DEFAULT_PRICING } from '../constants';
import { Save, AlertCircle, Hammer, Box, RotateCcw, Truck, LayoutTemplate, Layers } from 'lucide-react';

interface AdminPanelProps {
  currentPricing: PricingConfig;
  onSave: (newPricing: PricingConfig) => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentPricing, onSave, onClose }) => {
  const [pricing, setPricing] = useState<PricingConfig>(currentPricing);
  const [activeTab, setActiveTab] = useState<'materials' | 'pipes' | 'structural' | 'labor' | 'others'>('materials');

  const handleMaterialChange = (category: string, type: string, value: string) => {
    setPricing(prev => ({
      ...prev,
      materials: { ...prev.materials, [category]: { ...prev.materials[category], [type]: parseFloat(value) || 0 } }
    }));
  };

  const handlePipeChange = (size: string, value: string) => {
    setPricing(prev => ({ ...prev, pipes: { ...prev.pipes, [size]: parseFloat(value) || 0 } }));
  };

  const handleDeepChange = (section: keyof PricingConfig, key: string, value: string) => {
    setPricing(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: parseFloat(value) || 0 } }));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all prices to factory defaults?")) {
        onSave(DEFAULT_PRICING);
    }
  };

  // Glass Styles (Updated for Light Mode Contrast)
  const cardClass = "bg-white/85 dark:bg-[#202020]/80 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/30 rounded-2xl overflow-hidden transition-all duration-300 h-full flex flex-col";
  const inputClass = "w-full pl-12 pr-3 py-2.5 bg-slate-50/50 dark:bg-white/5 border-b-2 border-transparent focus:border-blue-500 rounded-t-lg outline-none transition-all text-slate-800 dark:text-slate-100 font-medium hover:bg-white dark:hover:bg-white/10";

  return (
    <div className={cardClass} style={{ height: '85vh' }}>
      <div className="bg-slate-900 dark:bg-black p-6 flex justify-between items-center text-white shrink-0 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">Pricing Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Update unit rates for calculations</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={handleReset}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl flex items-center gap-2 transition-colors border border-white/5"
            >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">Defaults</span>
            </button>
            <button 
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={() => onSave(pricing)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors font-bold shadow-lg shadow-blue-900/30"
            >
                <Save size={18} />
                Save Changes
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/5 overflow-x-auto shrink-0 bg-white/50 dark:bg-black/50 backdrop-blur-md">
        {[
            { id: 'materials', label: 'Face Materials' },
            { id: 'structural', label: 'Steel & Structure' },
            { id: 'labor', label: 'Work Charges' },
            { id: 'pipes', label: 'GI Stands' },
            { id: 'others', label: 'Other/Extras' }
        ].map(tab => (
            <button 
                key={tab.id}
                className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === tab.id 
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400' 
                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
            >
                {tab.label}
            </button>
        ))}
      </div>

      <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-transparent">
        {activeTab === 'materials' && (
          <div className="space-y-8">
            {Object.entries(SIGN_TYPES_HIERARCHY).map(([category, types]) => (
              <div key={category} className="bg-white/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-white/5 p-4 border-b border-slate-200/50 dark:border-white/5">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{category}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {types.map(type => (
                    <div key={type}>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide min-h-[2.5rem] flex items-end pb-1">{type}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricing.materials[category]?.[type] || 0}
                            onChange={(e) => handleMaterialChange(category, type, e.target.value)}
                            className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'structural' && (
          <div className="max-w-4xl mx-auto">
             <div className="bg-white/50 dark:bg-white/5 p-8 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-200/50 dark:border-white/5">
                    <Box size={22} className="text-blue-600 dark:text-blue-400" />
                    Structure & Electrical Rates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                        { label: 'Steel Frame Rate', key: 'steelPricePerFt', sub: 'Price per running foot' },
                        { label: 'L-Beading Rate', key: 'beadingPricePerFt', sub: 'Price per running foot' },
                        { label: 'Depth Cover Rate (Side)', key: 'depthCoverPricePerFt', sub: 'Price per running foot' },
                        { label: 'Back Cover Rate', key: 'backCoverPricePerSqFt', sub: 'Price per sq. ft' }
                    ].map(item => (
                         <div key={item.key}>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{item.label}</label>
                            <span className="text-xs text-slate-500 mb-3 block">{item.sub}</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={pricing.structural[item.key as keyof typeof pricing.structural]}
                                    onChange={(e) => handleDeepChange('structural', item.key, e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    ))}
                    <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tube Light Rate</label>
                        <span className="text-xs text-slate-500 mb-3 block">Price per unit</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                            <input
                                type="number"
                                value={pricing.electrical.tubeLightPrice}
                                onChange={(e) => handleDeepChange('electrical', 'tubeLightPrice', e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'labor' && (
             <div className="max-w-3xl mx-auto">
                <div className="bg-white/50 dark:bg-white/5 p-8 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-200/50 dark:border-white/5">
                        <Hammer size={22} className="text-blue-600 dark:text-blue-400" />
                        Work Charges (Per Sq. Ft)
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Small Signs', sub: '< 10 sq.ft', key: 'tier1' },
                            { label: 'Medium Signs', sub: '10 - 20 sq.ft', key: 'tier2' },
                            { label: 'Large Signs', sub: '> 20 sq.ft', key: 'tier3' }
                        ].map(tier => (
                            <div key={tier.key} className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-transparent">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block">{tier.label}</label>
                                    <span className="text-sm text-slate-500">{tier.sub}</span>
                                </div>
                                <div className="relative w-48">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                    <input
                                        type="number"
                                        value={pricing.labor[tier.key as keyof typeof pricing.labor]}
                                        onChange={(e) => handleDeepChange('labor', tier.key, e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {activeTab === 'pipes' && (
          <div className="max-w-3xl mx-auto">
             <div className="bg-white/50 dark:bg-white/5 p-8 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 pb-4 border-b border-slate-200/50 dark:border-white/5">GI Pipe Unit Rates</h3>
                <div className="grid gap-3">
                {PIPE_SIZES.map(size => (
                    <div key={size} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-lg border border-transparent hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">{size}</label>
                    <div className="relative w-48">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricing.pipes[size] || 0}
                            onChange={(e) => handlePipeChange(size, e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    </div>
                ))}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'others' && (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white/50 dark:bg-white/5 p-8 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-200/50 dark:border-white/5">
                        <LayoutTemplate size={22} className="text-blue-600 dark:text-blue-400" />
                        Other Costs
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Off-Cut Rate</label>
                            <span className="text-xs text-slate-500 mb-3 block">Price per sq. ft waste</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={pricing.others.offCutPerSqFt}
                                    onChange={(e) => handleDeepChange('others', 'offCutPerSqFt', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Angle Support Rate</label>
                            <span className="text-xs text-slate-500 mb-3 block">Price per unit</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={pricing.others.angleSupportUnit}
                                    onChange={(e) => handleDeepChange('others', 'angleSupportUnit', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Concrete Base Rate (Default)</label>
                            <span className="text-xs text-slate-500 mb-3 block">Price per base</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={pricing.others.concreteBaseUnit}
                                    onChange={(e) => handleDeepChange('others', 'concreteBaseUnit', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;