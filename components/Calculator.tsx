import React, { useState, useEffect, useCallback } from 'react';
import { 
    QuoteInputs, 
    PricingConfig, 
    SignCategory, 
    PIPE_SIZES, 
    SignSpecifications, 
    SignCalculationResult, 
    QuoteItem,
    GrandTotalResult
} from '../types';
import { SIGN_TYPES_HIERARCHY } from '../constants';
import { 
    FileText, 
    Calculator as CalcIcon, 
    RefreshCw, 
    Ruler, 
    Wrench, 
    Paintbrush, 
    AlertCircle, 
    User, 
    Hash, 
    Phone, 
    MapPin, 
    RotateCcw, 
    Plus, 
    Trash2,
    Layers,
    ChevronDown,
    ChevronUp,
    Settings,
    Truck,
    Palette,
    DollarSign,
    Percent
} from 'lucide-react';
import { generateQuotePDF } from '../services/pdfGenerator';

interface CalculatorProps {
  pricing: PricingConfig;
}

const Calculator: React.FC<CalculatorProps> = ({ pricing }) => {
  // --- HELPERS ---
  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFutureDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateSerial = () => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `WTG${month}${day}${hours}${minutes}`;
  };

  // --- STATE ---

  // 1. Global Quote State
  const [quoteInputs, setQuoteInputs] = useState<QuoteInputs>({
    serialNumber: generateSerial(),
    clientName: 'Valued Customer',
    clientAddress: '',
    clientContact: '',
    date: getToday(),
    expireDate: getFutureDate(30),
    quoteBy: '',
    showAreaInPDF: true,
    items: [],
    installationNeeded: false,
    installationCost: 0,
    transportationNeeded: false,
    transportationCost: 0,
    artWorkCost: 500,
    discount: 0,
    discountType: 'fixed'
  });

  // 2. Current Sign Builder State
  const [currentSign, setCurrentSign] = useState<SignSpecifications>({
    category: SignCategory.SSWOL,
    subType: SIGN_TYPES_HIERARCHY[SignCategory.SSWOL][0],
    width: 0,
    height: 0,
    offCutSqFt: 0,
    giStandQty: 0,
    giPipeSize: PIPE_SIZES[0],
    angleSupportQty: 0,
    concreteBaseQty: 0,
    concreteBaseRate: pricing.others.concreteBaseUnit,
  });

  // 3. Current Sign Calculation Result
  const [currentResult, setCurrentResult] = useState<SignCalculationResult>({
      area: 0, materialCost: 0, steelCost: 0, beadingCost: 0, steelLength: 0,
      beadingLength: 0, perimeterLength: 0, laborCost: 0, lightCost: 0,
      depthCoverCost: 0, backCoverCost: 0, offCutCost: 0, standCost: 0,
      angleSupportCost: 0, concreteBaseCost: 0, lightQty: 0, itemTotal: 0
  });

  // 4. Grand Total Result
  const [grandTotal, setGrandTotal] = useState<GrandTotalResult>({
      itemsSubtotal: 0, installationCost: 0, transportationCost: 0, artWorkCost: 0,
      subTotalBeforeDiscount: 0, discountAmount: 0, finalTotal: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(true);

  // --- CALCULATION LOGIC ---
  const calculateSignItem = useCallback((specs: SignSpecifications): SignCalculationResult => {
    const W = specs.width;
    const H = specs.height;
    const area = W * H;

    // 1. Face Material
    const fmcRate = pricing.materials[specs.category]?.[specs.subType] || 0;
    
    let materialCost = area * fmcRate;
    if (specs.category === SignCategory.DSWL || specs.category === SignCategory.ThreeD_DS) {
        materialCost = materialCost * 2;
    }

    // 2. Steel Frame
    const middleSupportCount = Math.floor(W / 3);
    let steelLength = 0;
    if (specs.category === SignCategory.SSWOL || specs.category === SignCategory.ThreeD_SS) {
        steelLength = (W * 2) + (H * 2) + (middleSupportCount * H);
    } else {
        steelLength = (W * 4) + (H * 4) + (middleSupportCount * H) + 4;
    }
    const steelCost = steelLength * pricing.structural.steelPricePerFt;

    // 3. Beading
    let beadingLength = 0;
    if (specs.category === SignCategory.SSWOL || specs.category === SignCategory.ThreeD_SS) {
         beadingLength = (W * 2) + (H * 2);
    } else {
        beadingLength = (W * 4) + (H * 4) + 4;
    }
    const beadingCost = beadingLength * pricing.structural.beadingPricePerFt;

    // 4. Labor
    let laborRate = 0;
    if (area < 10) laborRate = pricing.labor.tier1;
    else if (area < 20) laborRate = pricing.labor.tier2;
    else laborRate = pricing.labor.tier3; 
    const laborCost = area * laborRate;

    // 5. Lights
    let lightCost = 0;
    let lightQty = 0;
    if (specs.category === SignCategory.SSWL || specs.category === SignCategory.DSWL || specs.category === SignCategory.ThreeD_DS) {
        const qty = (W / 4) * (H + 1);
        lightQty = Math.ceil(qty);
        lightCost = lightQty * pricing.electrical.tubeLightPrice;
    }

    // 6. Covers
    let depthCoverCost = 0;
    let backCoverCost = 0;
    let perimeter = 0;
    if (specs.category === SignCategory.SSWL || 
        specs.category === SignCategory.DSWO || 
        specs.category === SignCategory.DSWL || 
        specs.category === SignCategory.ThreeD_DS) {
        perimeter = (W * 2) + (H * 2);
        depthCoverCost = perimeter * pricing.structural.depthCoverPricePerFt;
    }
    if (specs.category === SignCategory.SSWL) {
        backCoverCost = area * pricing.structural.backCoverPricePerSqFt;
    }

    // 7. Extras
    const offCutCost = specs.offCutSqFt * pricing.others.offCutPerSqFt;
    const standCost = specs.giStandQty * (pricing.pipes[specs.giPipeSize] || 0);
    const angleSupportCost = specs.angleSupportQty * pricing.others.angleSupportUnit;
    const baseRate = specs.concreteBaseRate !== undefined ? specs.concreteBaseRate : pricing.others.concreteBaseUnit;
    const concreteBaseCost = specs.concreteBaseQty * baseRate;

    const itemTotal = materialCost + steelCost + beadingCost + laborCost + lightCost + 
                      depthCoverCost + backCoverCost + offCutCost + standCost + 
                      angleSupportCost + concreteBaseCost;

    return {
        area, materialCost, steelCost, beadingCost, steelLength, beadingLength, perimeterLength: perimeter,
        laborCost, lightCost, depthCoverCost, backCoverCost, offCutCost, standCost, angleSupportCost,
        concreteBaseCost, lightQty, itemTotal
    };
  }, [pricing]);

  const calculateGrandTotal = useCallback(() => {
      const itemsSubtotal = quoteInputs.items.reduce((sum, item) => sum + item.results.itemTotal, 0);
      
      const installationCost = quoteInputs.installationNeeded ? quoteInputs.installationCost : 0;
      const transportationCost = quoteInputs.transportationNeeded ? quoteInputs.transportationCost : 0;
      const artWorkCost = quoteInputs.artWorkCost;

      const subTotalBeforeDiscount = itemsSubtotal + installationCost + transportationCost + artWorkCost;

      let discountAmount = 0;
      if (quoteInputs.discount > 0) {
          if (quoteInputs.discountType === 'percentage') {
              discountAmount = (subTotalBeforeDiscount * quoteInputs.discount) / 100;
          } else {
              discountAmount = quoteInputs.discount;
          }
      }

      const finalTotal = Math.max(0, subTotalBeforeDiscount - discountAmount);

      setGrandTotal({
          itemsSubtotal, installationCost, transportationCost, artWorkCost,
          subTotalBeforeDiscount, discountAmount, finalTotal
      });

  }, [quoteInputs, pricing]);


  // --- EFFECTS ---
  useEffect(() => {
      const result = calculateSignItem(currentSign);
      setCurrentResult(result);
  }, [currentSign, calculateSignItem]);

  useEffect(() => {
      calculateGrandTotal();
  }, [quoteInputs, calculateGrandTotal]);


  // --- HANDLERS ---

  const validateAndSetInput = (
    field: keyof SignSpecifications,
    value: string,
    validation: { min?: number; integer?: boolean; label: string }
  ) => {
    const numValue = parseFloat(value);
    let error = null;

    if (value === '') { /* allow empty */ } 
    else if (isNaN(numValue)) { error = "Invalid number"; } 
    else {
      if (validation.min !== undefined && numValue < validation.min) error = `${validation.label} too low`;
      if (validation.integer && !Number.isInteger(numValue)) error = `${validation.label} must be whole`;
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) newErrors[field] = error;
      else delete newErrors[field];
      return newErrors;
    });

    setCurrentSign(prev => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleGlobalChange = (field: keyof QuoteInputs, value: any) => {
      setQuoteInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
      if (currentSign.width <= 0 || currentSign.height <= 0) {
          alert("Please enter valid dimensions");
          return;
      }
      
      const newItem: QuoteItem = {
          id: Date.now().toString(),
          specs: { ...currentSign },
          results: { ...currentResult }
      };

      setQuoteInputs(prev => ({
          ...prev,
          items: [...prev.items, newItem]
      }));

      // Reset builder defaults
      setCurrentSign(prev => ({
          ...prev,
          width: 0,
          height: 0,
          offCutSqFt: 0,
          giStandQty: 0,
          giPipeSize: PIPE_SIZES[0],
          angleSupportQty: 0,
          concreteBaseQty: 0,
          concreteBaseRate: pricing.others.concreteBaseUnit
      }));
  };

  const handleRemoveItem = (id: string) => {
      setQuoteInputs(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== id)
      }));
  };

  const refreshSerial = () => {
    setQuoteInputs(prev => ({ ...prev, serialNumber: generateSerial() }));
  };

  const resetForm = () => {
    if (window.confirm("Reset entire form? All data will be lost.")) {
        window.location.reload();
    }
  };

  const suggestConcreteBase = () => {
      setCurrentSign(prev => ({ ...prev, concreteBaseQty: prev.giStandQty + prev.angleSupportQty }));
  };


  // --- STYLES ---
  const getInputClass = (hasError: boolean, isReadOnly: boolean = false) => `
    w-full p-3 border rounded-xl outline-none transition-all duration-200 font-medium
    ${hasError 
      ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-300 focus:ring-4 focus:ring-red-500/10' 
      : isReadOnly
        ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed shadow-none'
        : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm hover:border-blue-300'
    }
  `;
  const selectClass = `
    w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium
    focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none 
    shadow-sm transition-all duration-200 hover:border-blue-300
  `;
  const errorClass = "text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1.5 animate-pulse";
  const labelClass = "text-sm font-semibold text-slate-700 mb-2 block tracking-tight";


  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-20">
      
      {/* LEFT COLUMN: BUILDER & LIST */}
      <div className="xl:col-span-2 space-y-6">

        {/* 1. CLIENT & META */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
           <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><User size={20} /></div>
            Client & Quote Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Client Name</label>
              <input 
                type="text" 
                className={getInputClass(false)}
                value={quoteInputs.clientName}
                onChange={(e) => handleGlobalChange('clientName', e.target.value)}
              />
            </div>
             <div>
              <label className={labelClass}>Quote Ref ID</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Hash size={16} /></span>
                    <input 
                        type="text" 
                        readOnly
                        className={`pl-12 ${getInputClass(false, true)} font-mono text-sm tracking-wide`}
                        value={quoteInputs.serialNumber}
                    />
                </div>
                <button 
                  type="button" 
                  onClick={refreshSerial} 
                  className="px-4 bg-slate-50 border border-slate-200 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  title="Generate New ID"
                >
                    <RefreshCw size={20} />
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Contact No</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={16} /></span>
                <input 
                    type="text" 
                    placeholder="Mobile"
                    className={`pl-12 ${getInputClass(false)}`}
                    value={quoteInputs.clientContact}
                    onChange={(e) => handleGlobalChange('clientContact', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={16} /></span>
                <input 
                    type="text" 
                    placeholder="Location"
                    className={`pl-12 ${getInputClass(false)}`}
                    value={quoteInputs.clientAddress}
                    onChange={(e) => handleGlobalChange('clientAddress', e.target.value)}
                />
              </div>
            </div>
             <div>
              <label className={labelClass}>Quote Date</label>
              <input 
                  type="date" 
                  className={getInputClass(false)}
                  value={quoteInputs.date}
                  onChange={(e) => handleGlobalChange('date', e.target.value)}
              />
            </div>
             <div>
              <label className={labelClass}>Expire Date</label>
              <input 
                  type="date" 
                  className={getInputClass(false)}
                  value={quoteInputs.expireDate}
                  onChange={(e) => handleGlobalChange('expireDate', e.target.value)}
              />
            </div>
             <div className="md:col-span-2">
              <label className={labelClass}>Quote By</label>
               <input 
                  type="text" 
                  placeholder="Sales Rep Name"
                  className={getInputClass(false)}
                  value={quoteInputs.quoteBy}
                  onChange={(e) => handleGlobalChange('quoteBy', e.target.value)}
                />
            </div>
          </div>
        </div>

        {/* 2. SIGN BUILDER */}
        <div className="bg-white p-8 rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
            <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md"><Plus size={20} /></div>
                Add New Sign
            </h2>
            
             <div className="space-y-8">
                {/* Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Sign Category</label>
                        <div className="relative">
                            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                className={`pl-12 ${selectClass}`}
                                value={currentSign.category}
                                onChange={(e) => {
                                    const cat = e.target.value as SignCategory;
                                    setCurrentSign(prev => ({
                                        ...prev, 
                                        category: cat,
                                        subType: SIGN_TYPES_HIERARCHY[cat][0]
                                    }));
                                }}
                            >
                                {Object.values(SignCategory).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                         <label className={labelClass}>Material Type</label>
                         <div className="relative">
                            <Paintbrush className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                className={`pl-12 ${selectClass}`}
                                value={currentSign.subType}
                                onChange={(e) => setCurrentSign(prev => ({ ...prev, subType: e.target.value }))}
                            >
                                {SIGN_TYPES_HIERARCHY[currentSign.category].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                         </div>
                    </div>
                </div>

                {/* Dimensions */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/60">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Ruler size={16} /> Dimensions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClass}>Width (ft)</label>
                            <input
                                type="number"
                                min="0"
                                className={getInputClass(!!errors.width)}
                                value={currentSign.width || ''}
                                onChange={(e) => validateAndSetInput('width', e.target.value, { min: 0, label: 'Width' })}
                                placeholder="0"
                            />
                            {errors.width && <p className={errorClass}><AlertCircle size={12}/> {errors.width}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Height (ft)</label>
                            <input
                                type="number"
                                min="0"
                                className={getInputClass(!!errors.height)}
                                value={currentSign.height || ''}
                                onChange={(e) => validateAndSetInput('height', e.target.value, { min: 0, label: 'Height' })}
                                placeholder="0"
                            />
                             {errors.height && <p className={errorClass}><AlertCircle size={12}/> {errors.height}</p>}
                        </div>
                         <div>
                            <label className={labelClass}>Total Area (sq.ft)</label>
                            <input
                                type="number"
                                readOnly
                                className={getInputClass(false, true)}
                                value={currentResult.area.toFixed(2)}
                            />
                            <div className="mt-2.5 flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="showArea"
                                    checked={quoteInputs.showAreaInPDF}
                                    onChange={(e) => handleGlobalChange('showAreaInPDF', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <label htmlFor="showArea" className="text-sm text-slate-600 select-none cursor-pointer font-medium">Show in PDF</label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Structure & Extras (Cleaned Layout) */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/60">
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Wrench size={16} /> Structure & Extras
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        
                        {/* Row 1 */}
                        <div>
                            <label className={labelClass}>Off-Cut Waste (sq.ft)</label>
                            <input
                                type="number"
                                min="0"
                                className={getInputClass(!!errors.offCutSqFt)}
                                value={currentSign.offCutSqFt || ''}
                                onChange={(e) => validateAndSetInput('offCutSqFt', e.target.value, { min: 0, label: 'Off-cut' })}
                                placeholder="0"
                            />
                        </div>

                         <div>
                            <label className={labelClass}>Angle Support (Qty)</label>
                            <input
                                type="number"
                                min="0"
                                className={getInputClass(!!errors.angleSupportQty)}
                                value={currentSign.angleSupportQty || ''}
                                onChange={(e) => validateAndSetInput('angleSupportQty', e.target.value, { min: 0, integer: true, label: 'Angle Qty' })}
                                placeholder="0"
                            />
                        </div>

                        {/* Row 2: GI Stands */}
                         <div>
                            <label className={labelClass}>GI Stands</label>
                            <div className="flex gap-3">
                                <div className="w-1/3">
                                    <input
                                        type="number"
                                        min="0"
                                        className={getInputClass(!!errors.giStandQty)}
                                        value={currentSign.giStandQty || ''}
                                        onChange={(e) => validateAndSetInput('giStandQty', e.target.value, { min: 0, integer: true, label: 'Stand Qty' })}
                                        placeholder="Qty"
                                    />
                                </div>
                                <div className="flex-1">
                                    <select 
                                        className={selectClass}
                                        value={currentSign.giPipeSize}
                                        onChange={(e) => setCurrentSign(prev => ({ ...prev, giPipeSize: e.target.value as any }))}
                                    >
                                        {PIPE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Concrete Base (Standard labels) */}
                        <div className="col-span-1">
                            <div className="flex justify-between items-center mb-2">
                                <label className={labelClass.replace('mb-2', 'mb-0')}>Concrete Base</label>
                                <button 
                                    type="button"
                                    onClick={suggestConcreteBase}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded"
                                >
                                    Auto-Calculate
                                </button>
                            </div>
                            <div className="flex gap-3">
                                 <div className="w-1/3">
                                    <input
                                        type="number"
                                        min="0"
                                        className={getInputClass(!!errors.concreteBaseQty)}
                                        value={currentSign.concreteBaseQty || ''}
                                        onChange={(e) => validateAndSetInput('concreteBaseQty', e.target.value, { min: 0, integer: true, label: 'Base Qty' })}
                                        placeholder="Qty"
                                    />
                                 </div>
                                  <div className="flex-1">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{pricing.currencySymbol}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className={`pl-12 ${getInputClass(false)}`}
                                            value={currentSign.concreteBaseRate || ''}
                                            onChange={(e) => validateAndSetInput('concreteBaseRate', e.target.value, { min: 0, label: 'Rate' })}
                                            placeholder={pricing.others.concreteBaseUnit.toString()}
                                        />
                                    </div>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Cost Breakdown */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <button 
                        type="button"
                        onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                        className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors group"
                    >
                         <span className="font-bold text-slate-700 flex items-center gap-2 group-hover:text-blue-700 transition-colors">
                            <div className="bg-white p-1 rounded-md border border-slate-200"><CalcIcon size={16} className="text-emerald-500" /></div>
                            Live Cost Breakdown
                         </span>
                         {isBreakdownOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                    </button>
                    {isBreakdownOpen && (
                        <div className="p-5 bg-white border-t border-slate-100 space-y-3 text-sm">
                             <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">Face Material ({currentResult.area.toFixed(1)} sq.ft)</span>
                                <span className="font-semibold text-slate-800">{pricing.currencySymbol} {currentResult.materialCost.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">Steel Frame ({currentResult.steelLength} ft)</span>
                                <span className="font-semibold text-slate-800">{pricing.currencySymbol} {currentResult.steelCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">L-Beading ({currentResult.beadingLength} ft)</span>
                                <span className="font-semibold text-slate-800">{pricing.currencySymbol} {currentResult.beadingCost.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">Labor Charges</span>
                                <span className="font-semibold text-slate-800">{pricing.currencySymbol} {currentResult.laborCost.toFixed(2)}</span>
                            </div>
                            {currentResult.lightCost > 0 && (
                                <div className="flex justify-between items-center py-1 text-blue-700 bg-blue-50 px-2 rounded -mx-2">
                                    <span>Illumination ({currentResult.lightQty} Tubes)</span>
                                    <span className="font-semibold">{pricing.currencySymbol} {currentResult.lightCost.toFixed(2)}</span>
                                </div>
                            )}
                             {currentResult.depthCoverCost > 0 && (
                                <div className="flex justify-between items-center py-1 text-slate-600">
                                    <span>Depth Cover ({currentResult.perimeterLength} ft)</span>
                                    <span className="font-semibold text-slate-800">{pricing.currencySymbol} {currentResult.depthCoverCost.toFixed(2)}</span>
                                </div>
                            )}
                            {currentResult.backCoverCost > 0 && (
                                <div className="flex justify-between items-center py-1 text-slate-600">
                                    <span>Back Cover ({currentResult.area.toFixed(1)} sq.ft)</span>
                                    <span className="font-semibold text-slate-800">{pricing.currencySymbol} {currentResult.backCoverCost.toFixed(2)}</span>
                                </div>
                            )}
                            {(currentResult.standCost > 0 || currentResult.angleSupportCost > 0 || currentResult.concreteBaseCost > 0) && (
                                 <div className="flex justify-between items-center py-2 text-slate-600 border-t border-slate-100 mt-2">
                                    <span>Hardware & Mounts</span>
                                    <span className="font-semibold text-slate-800">{pricing.currencySymbol} {(currentResult.standCost + currentResult.angleSupportCost + currentResult.concreteBaseCost).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-slate-200 pt-3 mt-1 font-bold text-slate-900 text-base">
                                <span>Sign Item Total</span>
                                <span>{pricing.currencySymbol} {currentResult.itemTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Button */}
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
                >
                    <Plus size={24} /> Add Sign to Quote
                </button>
             </div>
        </div>

        {/* 3. ITEMS LIST */}
        {quoteInputs.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                     <h3 className="font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Layers size={20}/></div>
                        Added Items ({quoteInputs.items.length})
                     </h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {quoteInputs.items.map((item, idx) => (
                        <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-indigo-100 text-indigo-700 font-bold rounded-lg px-3 py-2 text-sm min-w-[2.5rem] text-center">#{idx + 1}</div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">{item.specs.width}' x {item.specs.height}' {item.specs.category}</h4>
                                    <p className="text-sm text-slate-500 font-medium">{item.specs.subType}</p>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Ruler size={10}/> Area: {item.results.area} sq.ft</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                <span className="font-bold text-slate-800 text-xl">{pricing.currencySymbol} {item.results.itemTotal.toFixed(2)}</span>
                                <button 
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Remove Item"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 4. GLOBAL SERVICES */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
             <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Settings size={20} /></div>
                Additional Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Installation */}
                <div className="space-y-4">
                    <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${quoteInputs.installationNeeded ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                        <input
                            type="checkbox"
                            id="installCheck"
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            checked={quoteInputs.installationNeeded}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setQuoteInputs(prev => ({
                                    ...prev,
                                    installationNeeded: checked,
                                    installationCost: checked && prev.installationCost === 0 ? 3500 : prev.installationCost
                                }));
                            }}
                        />
                         <label htmlFor="installCheck" className="font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                            <Wrench size={18} className="text-slate-400"/> Installation Required
                         </label>
                    </div>
                    {quoteInputs.installationNeeded && (
                         <div className="pl-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className={labelClass}>Installation Cost</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    className={`pl-12 ${getInputClass(false)}`}
                                    value={quoteInputs.installationCost || ''}
                                    onChange={(e) => handleGlobalChange('installationCost', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Transport */}
                 <div className="space-y-4">
                    <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${quoteInputs.transportationNeeded ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                        <input
                            type="checkbox"
                            id="transportCheck"
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            checked={quoteInputs.transportationNeeded}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setQuoteInputs(prev => ({
                                    ...prev,
                                    transportationNeeded: checked,
                                    transportationCost: checked && prev.transportationCost === 0 ? 3000 : prev.transportationCost
                                }));
                            }}
                        />
                         <label htmlFor="transportCheck" className="font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                            <Truck size={18} className="text-slate-400"/> Transportation Required
                         </label>
                    </div>
                    {quoteInputs.transportationNeeded && (
                         <div className="pl-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className={labelClass}>Transport Cost</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    className={`pl-12 ${getInputClass(false)}`}
                                    value={quoteInputs.transportationCost || ''}
                                    onChange={(e) => handleGlobalChange('transportationCost', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                 {/* Artwork */}
                 <div>
                    <label className={labelClass}><span className="flex items-center gap-2"><Palette size={16} /> Artwork Charges</span></label>
                     <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{pricing.currencySymbol}</span>
                        <input
                            type="number"
                            min="0"
                            className={`pl-12 ${getInputClass(false)}`}
                            value={quoteInputs.artWorkCost || ''}
                            onChange={(e) => handleGlobalChange('artWorkCost', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                 </div>

                 {/* Discount */}
                  <div>
                    <label className={labelClass}><span className="flex items-center gap-2"><Percent size={16} /> Discount</span></label>
                     <div className="flex gap-3">
                        <div className="relative flex-1 min-w-[150px]">
                             <input
                                type="number"
                                min="0"
                                className={getInputClass(false)}
                                value={quoteInputs.discount || ''}
                                onChange={(e) => handleGlobalChange('discount', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <select
                            className={`!w-36 ${selectClass}`}
                            value={quoteInputs.discountType}
                            onChange={(e) => handleGlobalChange('discountType', e.target.value)}
                        >
                            <option value="fixed">Fixed ({pricing.currencySymbol})</option>
                            <option value="percentage">Percent (%)</option>
                        </select>
                    </div>
                 </div>

            </div>
        </div>

      </div>

      {/* RIGHT COLUMN: SUMMARY */}
      <div className="xl:col-span-1">
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl sticky top-24 border border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-slate-700/50 pb-5">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><FileText size={20} /></div>
                Quote Summary
            </h2>
            
            <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-slate-300">
                    <span>Items Total ({quoteInputs.items.length})</span>
                    <span className="font-medium">{pricing.currencySymbol} {grandTotal.itemsSubtotal.toFixed(2)}</span>
                </div>
                 {quoteInputs.installationNeeded && (
                    <div className="flex justify-between items-center text-slate-300">
                        <span>Installation</span>
                        <span className="font-medium">{pricing.currencySymbol} {grandTotal.installationCost.toFixed(2)}</span>
                    </div>
                 )}
                 {quoteInputs.transportationNeeded && (
                    <div className="flex justify-between items-center text-slate-300">
                        <span>Transportation</span>
                        <span className="font-medium">{pricing.currencySymbol} {grandTotal.transportationCost.toFixed(2)}</span>
                    </div>
                 )}
                  <div className="flex justify-between items-center text-slate-300">
                        <span>Artwork</span>
                        <span className="font-medium">{pricing.currencySymbol} {grandTotal.artWorkCost.toFixed(2)}</span>
                  </div>

                 {/* Discount Display */}
                 <div className="border-t border-slate-700/50 pt-4 mt-4">
                     <div className="flex justify-between items-center text-lg font-semibold text-slate-200">
                        <span>Subtotal</span>
                        <span>{pricing.currencySymbol} {grandTotal.subTotalBeforeDiscount.toFixed(2)}</span>
                     </div>
                      {grandTotal.discountAmount > 0 && (
                         <div className="flex justify-between items-center text-red-400 mt-2 text-sm">
                            <span>Discount {quoteInputs.discountType === 'percentage' ? `(${quoteInputs.discount}%)` : ''}</span>
                            <span>- {pricing.currencySymbol} {grandTotal.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                 </div>

                <div className="border-t border-slate-700/50 pt-5 mt-3">
                     <div className="flex justify-between items-end">
                        <span className="text-slate-400 mb-1">Total Amount</span>
                        <span className="text-3xl font-bold text-emerald-400">{pricing.currencySymbol} {grandTotal.finalTotal.toFixed(2)}</span>
                     </div>
                     <p className="text-xs text-slate-500 text-right mt-2">Includes all taxes & fees</p>
                 </div>
            </div>

            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => generateQuotePDF(quoteInputs, grandTotal, pricing)}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
                >
                    <FileText size={20} />
                    Generate Invoice PDF
                </button>

                 <button
                    type="button"
                    onClick={resetForm}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-slate-700"
                >
                    <RotateCcw size={18} />
                    Reset / New Quote
                </button>
            </div>
        </div>
      </div>

    </div>
  );
};

export default Calculator;