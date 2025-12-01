import React, { useState } from 'react';
import { PricingConfig, PIPE_SIZES, SignCategory } from '../types';
import { SIGN_TYPES_HIERARCHY, DEFAULT_PRICING } from '../constants';
import { Save, AlertCircle, Hammer, Box, RotateCcw } from 'lucide-react';

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
      materials: {
        ...prev.materials,
        [category]: {
          ...prev.materials[category],
          [type]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handlePipeChange = (size: string, value: string) => {
    setPricing(prev => ({
      ...prev,
      pipes: {
        ...prev.pipes,
        [size]: parseFloat(value) || 0
      }
    }));
  };

  const handleDeepChange = (section: keyof PricingConfig, key: string, value: string) => {
    setPricing(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [key]: parseFloat(value) || 0
      }
    }));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all prices to factory defaults? This cannot be undone.")) {
        onSave(DEFAULT_PRICING);
    }
  };

  // Styled input helper
  const inputClass = "w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 bg-white font-medium";

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[85vh]">
      <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Pricing Dashboard
          </h2>
          <p className="text-slate-400 text-sm mt-1">Update unit rates for calculations</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={handleReset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-2 transition-colors border border-slate-700"
                title="Reset to Factory Defaults"
            >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">Defaults</span>
            </button>
            <button 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={() => onSave(pricing)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-emerald-900/20"
            >
                <Save size={18} />
                Save Changes
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto shrink-0 bg-slate-50">
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
                    ? 'text-blue-600 border-blue-600 bg-white' 
                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
            >
                {tab.label}
            </button>
        ))}
      </div>

      <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
        {activeTab === 'materials' && (
          <div className="space-y-10">
            {Object.entries(SIGN_TYPES_HIERARCHY).map(([category, types]) => (
              <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">{category}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {types.map(type => (
                    <div key={type}>
                      <label className="block text-sm font-semibold text-slate-600 mb-2 min-h-[2.5rem] flex items-end pb-1">{type}</label>
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
             <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                    <Box size={22} className="text-blue-600" />
                    Structure & Electrical Rates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">Steel Frame Rate</label>
                        <span className="text-xs text-slate-500 mb-3 block">Price per running foot</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                            <input
                                type="number"
                                value={pricing.structural.steelPricePerFt}
                                onChange={(e) => handleDeepChange('structural', 'steelPricePerFt', e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">L-Beading Rate</label>
                        <span className="text-xs text-slate-500 mb-3 block">Price per running foot</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                            <input
                                type="number"
                                value={pricing.structural.beadingPricePerFt}
                                onChange={(e) => handleDeepChange('structural', 'beadingPricePerFt', e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">Depth Cover Rate (Side)</label>
                        <span className="text-xs text-slate-500 mb-3 block">Price per running foot (Perimeter)</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                            <input
                                type="number"
                                value={pricing.structural.depthCoverPricePerFt}
                                onChange={(e) => handleDeepChange('structural', 'depthCoverPricePerFt', e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">Back Cover Rate</label>
                        <span className="text-xs text-slate-500 mb-3 block">Price per square foot</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                            <input
                                type="number"
                                value={pricing.structural.backCoverPricePerSqFt}
                                onChange={(e) => handleDeepChange('structural', 'backCoverPricePerSqFt', e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">Tube Light Rate</label>
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
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                        <Hammer size={22} className="text-blue-600" />
                        Work Charges (Per Sq. Ft)
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <label className="font-bold text-slate-700 block">Small Signs</label>
                                <span className="text-sm text-slate-500">&lt; 10 sq.ft</span>
                            </div>
                            <div className="relative w-48">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={pricing.labor.tier1}
                                    onChange={(e) => handleDeepChange('labor', 'tier1', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                             <div>
                                <label className="font-bold text-slate-700 block">Medium Signs</label>
                                <span className="text-sm text-slate-500">10 - 20 sq.ft</span>
                            </div>
                            <div className="relative w-48">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={pricing.labor.tier2}
                                    onChange={(e) => handleDeepChange('labor', 'tier2', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                             <div>
                                <label className="font-bold text-slate-700 block">Large Signs</label>
                                <span className="text-sm text-slate-500">&gt; 20 sq.ft</span>
                            </div>
                            <div className="relative w-48">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={pricing.labor.tier3}
                                    onChange={(e) => handleDeepChange('labor', 'tier3', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        )}

        {activeTab === 'pipes' && (
          <div className="max-w-3xl mx-auto">
             <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-4 pb-4 border-b border-slate-100">GI Pipe Unit Rates</h3>
                <p className="text-slate-500 text-sm mb-6 flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <AlertCircle size={18} className="text-blue-600"/>
                    These rates apply per stand unit for the selected pipe size.
                </p>
                <div className="grid gap-3">
                {PIPE_SIZES.map(size => (
                    <div key={size} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                    <label className="font-semibold text-slate-700">{size}</label>
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
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 pb-4 border-b border-slate-100">Miscellaneous Costs</h3>
                    <div className="grid gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block font-bold text-slate-700">Off-Cut Rate</label>
                                <span className="text-xs text-slate-500">Price per sq. ft</span>
                            </div>
                            <div className="relative w-56">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={pricing.others.offCutPerSqFt}
                                    onChange={(e) => handleDeepChange('others', 'offCutPerSqFt', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div>
                                <label className="block font-bold text-slate-700">Angle Support Rate</label>
                                <span className="text-xs text-slate-500">Price per unit</span>
                            </div>
                            <div className="relative w-56">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={pricing.others.angleSupportUnit}
                                    onChange={(e) => handleDeepChange('others', 'angleSupportUnit', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div>
                                <label className="block font-bold text-slate-700">Concrete Base Rate</label>
                                <span className="text-xs text-slate-500">Price per unit</span>
                            </div>
                            <div className="relative w-56">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
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