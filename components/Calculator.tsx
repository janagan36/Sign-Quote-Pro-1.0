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
    Truck,
    Palette,
    Percent,
    LayoutTemplate,
    PenTool,
    Edit,
    MessageCircle
} from 'lucide-react';
import { generateQuotePDF } from '../services/pdfGenerator';
import GlassDatePicker from './GlassDatePicker';
import GlassSelect from './GlassSelect';

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
  const [quoteInputs, setQuoteInputs] = useState<QuoteInputs>({
    serialNumber: generateSerial(),
    clientName: 'Valued Customer',
    clientAddress: '',
    clientContact: '',
    date: getToday(),
    expireDate: getFutureDate(7),
    quoteBy: '',
    subject: '',
    showAreaInPDF: true,
    pdfTemplate: 'modern',
    items: [],
    installationNeeded: false,
    installationCost: 0,
    transportationNeeded: false,
    transportationCost: 0,
    artWorkCost: 500,
    discount: 0,
    discountType: 'fixed'
  });

  // Builder Mode State
  const [activeBuilderTab, setActiveBuilderTab] = useState<'sign' | 'manual'>('sign');

  // Sign Builder State
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

  // Manual Item Builder State
  const [manualItem, setManualItem] = useState({
      description: '',
      qty: 1,
      rate: 0
  });

  const [currentResult, setCurrentResult] = useState<SignCalculationResult>({
      area: 0, materialCost: 0, steelCost: 0, beadingCost: 0, steelLength: 0,
      beadingLength: 0, perimeterLength: 0, laborCost: 0, lightCost: 0,
      depthCoverCost: 0, backCoverCost: 0, offCutCost: 0, standCost: 0,
      angleSupportCost: 0, concreteBaseCost: 0, lightQty: 0, itemTotal: 0
  });

  const [grandTotal, setGrandTotal] = useState<GrandTotalResult>({
      itemsSubtotal: 0, installationCost: 0, transportationCost: 0, artWorkCost: 0,
      subTotalBeforeDiscount: 0, discountAmount: 0, finalTotal: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(true);

  // --- LOGIC ---
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
      // Use the unified 'total' field from items
      const itemsSubtotal = quoteInputs.items.reduce((sum, item) => sum + item.total, 0);
      
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

  useEffect(() => {
      const result = calculateSignItem(currentSign);
      setCurrentResult(result);
  }, [currentSign, calculateSignItem]);

  useEffect(() => {
      calculateGrandTotal();
  }, [quoteInputs, calculateGrandTotal]);

  const validateAndSetInput = (field: keyof SignSpecifications, value: string, validation: { min?: number; integer?: boolean; label: string }) => {
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
      if (activeBuilderTab === 'sign') {
          if (currentSign.width <= 0 || currentSign.height <= 0) {
              alert("Please enter valid dimensions");
              return;
          }
          const newItem: QuoteItem = {
              id: Date.now().toString(),
              type: 'sign',
              specs: { ...currentSign },
              results: { ...currentResult },
              total: currentResult.itemTotal
          };
          setQuoteInputs(prev => ({ ...prev, items: [...prev.items, newItem] }));
          setCurrentSign(prev => ({
              ...prev, width: 0, height: 0, offCutSqFt: 0, giStandQty: 0,
              giPipeSize: PIPE_SIZES[0], angleSupportQty: 0, concreteBaseQty: 0,
              concreteBaseRate: pricing.others.concreteBaseUnit
          }));
      } else {
          // Manual Item
          if (!manualItem.description.trim() || manualItem.rate <= 0) {
              alert("Please enter a description and rate");
              return;
          }
          const newItem: QuoteItem = {
              id: Date.now().toString(),
              type: 'manual',
              manualDesc: manualItem.description,
              manualQty: manualItem.qty,
              manualRate: manualItem.rate,
              total: manualItem.qty * manualItem.rate
          };
          setQuoteInputs(prev => ({ ...prev, items: [...prev.items, newItem] }));
          setManualItem({ description: '', qty: 1, rate: 0 });
      }
  };

  const handleRemoveItem = (id: string) => {
      setQuoteInputs(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const handleEditItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const itemToEdit = quoteInputs.items.find(item => item.id === id);
    if (!itemToEdit) return;

    // Restore state based on item type
    if (itemToEdit.type === 'sign' && itemToEdit.specs) {
        setActiveBuilderTab('sign');
        setCurrentSign(JSON.parse(JSON.stringify(itemToEdit.specs)));
    } else if (itemToEdit.type === 'manual') {
        setActiveBuilderTab('manual');
        setManualItem({
            description: itemToEdit.manualDesc || '',
            qty: itemToEdit.manualQty || 1,
            rate: itemToEdit.manualRate || 0
        });
    }

    // Remove from list so it can be re-added after editing
    handleRemoveItem(id);

    // Scroll to builder
    setTimeout(() => {
        const builderElement = document.getElementById('sign-builder-card');
        if (builderElement) {
            builderElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, 50);
  };

  const refreshSerial = () => setQuoteInputs(prev => ({ ...prev, serialNumber: generateSerial() }));
  
  const resetForm = (e: React.MouseEvent) => { 
    e.preventDefault();
    if (window.confirm("Are you sure you want to reset everything? All current data will be lost.")) {
        setQuoteInputs({
            serialNumber: generateSerial(),
            clientName: 'Valued Customer',
            clientAddress: '',
            clientContact: '',
            date: getToday(),
            expireDate: getFutureDate(7),
            quoteBy: '',
            subject: '',
            showAreaInPDF: true,
            pdfTemplate: 'modern',
            items: [],
            installationNeeded: false,
            installationCost: 0,
            transportationNeeded: false,
            transportationCost: 0,
            artWorkCost: 500,
            discount: 0,
            discountType: 'fixed'
        });
        setCurrentSign({
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
        setManualItem({ description: '', qty: 1, rate: 0 });
        setGrandTotal({
             itemsSubtotal: 0, installationCost: 0, transportationCost: 0, artWorkCost: 0,
             subTotalBeforeDiscount: 0, discountAmount: 0, finalTotal: 0
        });
    }
  };

  const handleWhatsApp = () => {
      let phone = quoteInputs.clientContact.replace(/[^0-9]/g, '');
      if (!phone) {
          alert("Please enter a valid Client Contact number first.");
          return;
      }
      
      // Auto-format for Sri Lanka if starts with 0
      if (phone.startsWith('0')) {
          phone = '94' + phone.substring(1);
      }

      const itemsList = quoteInputs.items
        .map((item, idx) => {
            const name = item.type === 'sign' ? item.specs?.subType : item.manualDesc;
            return `${idx + 1}. ${name}`;
        })
        .join('\n');

      const text = `Hello ${quoteInputs.clientName},\n\nPlease find the attached quotation regarding ${quoteInputs.subject || 'your signage requirement'}.\n\nRef: ${quoteInputs.serialNumber}\n\n*Items:*\n${itemsList}\n\n*Total Amount:* ${pricing.currencySymbol} ${grandTotal.finalTotal.toFixed(2)}\n\nThank you,\nWaytoogo Industries`;
      
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };
  
  // --- STYLES (UPDATED FOR HIGH CONTRAST LIGHT MODE) ---
  const cardClass = `
    bg-white/85 dark:bg-[#202020]/75 backdrop-blur-3xl
    border border-slate-200/60 dark:border-white/5
    shadow-xl shadow-slate-200/60 dark:shadow-black/30
    rounded-2xl transition-all duration-300
    p-6 lg:p-8
  `;

  const getInputClass = (hasError: boolean, readOnly: boolean = false) => `
    w-full p-3 pl-12 rounded-xl outline-none font-medium transition-all duration-200
    ${readOnly 
        ? 'bg-slate-100/50 dark:bg-white/5 cursor-not-allowed opacity-70 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-white/5' 
        : 'bg-slate-50/50 dark:bg-black/40 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/10 focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-white border-slate-200/60 dark:border-white/10'
    }
    border ${hasError ? 'border-red-500/50' : ''}
    placeholder-slate-500/70 dark:placeholder-slate-500
  `;

  const labelClass = "text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider block ml-1";
  const iconContainerClass = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 pointer-events-none z-10";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
      
      {/* LEFT COLUMN: Builder & Lists */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* 1. CLIENT DETAILS CARD */}
        <div className={`relative ${cardClass} z-50`}>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800 dark:text-white">
            <User className="text-blue-600 dark:text-blue-500" size={24} />
            Client Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Client Name</label>
              <div className="relative">
                <span className={iconContainerClass}><User size={18} /></span>
                <input 
                  type="text" 
                  value={quoteInputs.clientName}
                  onChange={(e) => handleGlobalChange('clientName', e.target.value)}
                  className={getInputClass(false)}
                  placeholder="Enter Client Name"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Quote Ref ID</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <span className={iconContainerClass}><Hash size={18} /></span>
                  <input 
                    type="text" 
                    value={quoteInputs.serialNumber}
                    readOnly
                    className={getInputClass(false, true)}
                  />
                </div>
                <button 
                  type="button"
                  onClick={refreshSerial}
                  className="p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors border border-blue-200/50 dark:border-transparent"
                  title="Generate New ID"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <div className="relative">
                <span className={iconContainerClass}><MapPin size={18} /></span>
                <input 
                  type="text" 
                  value={quoteInputs.clientAddress}
                  onChange={(e) => handleGlobalChange('clientAddress', e.target.value)}
                  className={getInputClass(false)}
                  placeholder="Client Address"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Contact No</label>
              <div className="relative">
                <span className={iconContainerClass}><Phone size={18} /></span>
                <input 
                  type="text" 
                  value={quoteInputs.clientContact}
                  onChange={(e) => handleGlobalChange('clientContact', e.target.value)}
                  className={getInputClass(false)}
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div className="md:col-span-2">
                <label className={labelClass}>Subject</label>
                <div className="relative">
                    <span className={iconContainerClass}><FileText size={18} /></span>
                    <input 
                        type="text" 
                        value={quoteInputs.subject || ''}
                        onChange={(e) => handleGlobalChange('subject', e.target.value)}
                        className={getInputClass(false)}
                        placeholder="Quote Subject (e.g. Signage for New Branch)"
                    />
                </div>
            </div>

            <div className="z-50">
                <GlassDatePicker 
                    label="Quote Date"
                    value={quoteInputs.date}
                    onChange={(date) => handleGlobalChange('date', date)}
                />
            </div>
            <div className="z-50">
                <GlassDatePicker 
                    label="Valid Until"
                    value={quoteInputs.expireDate}
                    onChange={(date) => handleGlobalChange('expireDate', date)}
                />
            </div>
            
            <div>
              <label className={labelClass}>Prepared By</label>
              <div className="relative">
                <span className={iconContainerClass}><User size={18} /></span>
                <input 
                  type="text" 
                  value={quoteInputs.quoteBy}
                  onChange={(e) => handleGlobalChange('quoteBy', e.target.value)}
                  className={getInputClass(false)}
                  placeholder="Your Name"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. ITEM BUILDER CARD */}
        <div id="sign-builder-card" className={`relative ${cardClass} z-40`}>
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800 dark:text-white">
                <PenTool className="text-blue-600 dark:text-blue-500" size={24} />
                Item Builder
              </h2>
              
              {/* Builder Tabs */}
              <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1 border border-slate-200/50 dark:border-transparent">
                  <button 
                    type="button"
                    onClick={() => setActiveBuilderTab('sign')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                        activeBuilderTab === 'sign' 
                        ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm border border-slate-200/50 dark:border-transparent' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                      Sign Builder
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveBuilderTab('manual')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                        activeBuilderTab === 'manual' 
                        ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm border border-slate-200/50 dark:border-transparent' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                      Manual Item
                  </button>
              </div>
          </div>

          {activeBuilderTab === 'sign' ? (
            <div className="space-y-8">
                {/* Sign Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Select */}
                    <div className="col-span-1 md:col-span-2 z-50">
                        <GlassSelect 
                            label="Sign Category"
                            icon={Layers}
                            value={currentSign.category}
                            options={Object.keys(SIGN_TYPES_HIERARCHY)}
                            onChange={(val) => {
                                setCurrentSign(prev => ({ 
                                    ...prev, 
                                    category: val as SignCategory,
                                    subType: SIGN_TYPES_HIERARCHY[val as SignCategory][0] 
                                }));
                            }}
                        />
                    </div>

                    {/* SubType Select */}
                    <div className="col-span-1 md:col-span-2 z-40">
                        <GlassSelect 
                            label="Material Type"
                            icon={Paintbrush}
                            value={currentSign.subType}
                            options={SIGN_TYPES_HIERARCHY[currentSign.category]}
                            onChange={(val) => setCurrentSign(prev => ({ ...prev, subType: val }))}
                        />
                    </div>

                    {/* Dimensions */}
                    <div>
                        <label className={labelClass}>Width (ft)</label>
                        <div className="relative">
                            <span className={iconContainerClass}><Ruler size={18} /></span>
                            <input 
                                type="number" 
                                value={currentSign.width || ''}
                                onChange={(e) => validateAndSetInput('width', e.target.value, { min: 0, label: 'Width' })}
                                className={getInputClass(!!errors.width)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Height (ft)</label>
                        <div className="relative">
                            <span className={iconContainerClass}><Ruler size={18} /></span>
                            <input 
                                type="number" 
                                value={currentSign.height || ''}
                                onChange={(e) => validateAndSetInput('height', e.target.value, { min: 0, label: 'Height' })}
                                className={getInputClass(!!errors.height)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Off Cut (sq.ft)</label>
                        <div className="relative">
                            <span className={iconContainerClass}><LayoutTemplate size={18} /></span>
                            <input 
                                type="number" 
                                value={currentSign.offCutSqFt || ''}
                                onChange={(e) => validateAndSetInput('offCutSqFt', e.target.value, { min: 0, label: 'Off Cut' })}
                                className={getInputClass(false)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                         <label className={labelClass}>Total Area (sq.ft)</label>
                         <div className="relative">
                            <span className={iconContainerClass}><CalcIcon size={18} /></span>
                            <input type="text" value={currentResult.area.toFixed(2)} readOnly className={getInputClass(false, true)} />
                         </div>
                         <div className="flex items-center gap-2 mt-2 ml-1">
                             <input 
                                type="checkbox" 
                                id="showArea"
                                checked={quoteInputs.showAreaInPDF}
                                onChange={(e) => handleGlobalChange('showAreaInPDF', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                             />
                             <label htmlFor="showArea" className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer">Show Area in PDF</label>
                         </div>
                    </div>
                </div>

                {/* Hardware Section */}
                <div className="pt-6 border-t border-slate-200/60 dark:border-white/5">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Wrench size={16} /> Mounting Hardware
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                             <div>
                                <label className={labelClass}>GI Stands (Qty)</label>
                                <div className="relative">
                                    <span className={iconContainerClass}><Hash size={18} /></span>
                                    <input 
                                        type="number"
                                        value={currentSign.giStandQty || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setCurrentSign(prev => ({ 
                                                ...prev, 
                                                giStandQty: val,
                                                concreteBaseQty: val + prev.angleSupportQty
                                            }));
                                        }}
                                        className={getInputClass(false)}
                                        placeholder="0"
                                    />
                                </div>
                             </div>
                             <div className="z-30">
                                <GlassSelect 
                                    label="Pipe Size"
                                    value={currentSign.giPipeSize}
                                    options={PIPE_SIZES.map(s => s)}
                                    onChange={(val) => setCurrentSign(prev => ({ ...prev, giPipeSize: val }))}
                                />
                             </div>
                        </div>

                        <div>
                            <label className={labelClass}>Angle Support (Qty)</label>
                            <div className="relative">
                                <span className={iconContainerClass}><Hash size={18} /></span>
                                <input 
                                    type="number"
                                    value={currentSign.angleSupportQty || ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setCurrentSign(prev => ({ 
                                            ...prev, 
                                            angleSupportQty: val,
                                            concreteBaseQty: prev.giStandQty + val
                                        }));
                                    }}
                                    className={getInputClass(false)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Concrete Base (Qty)</label>
                                <div className="relative">
                                    <span className={iconContainerClass}><Hash size={18} /></span>
                                    <input 
                                        type="number"
                                        value={currentSign.concreteBaseQty || ''}
                                        onChange={(e) => validateAndSetInput('concreteBaseQty', e.target.value, { min: 0, integer: true, label: 'Qty' })}
                                        className={getInputClass(false)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Base Rate (Each)</label>
                                <div className="relative">
                                    <span className={iconContainerClass}>{pricing.currencySymbol}</span>
                                    <input 
                                        type="number"
                                        value={currentSign.concreteBaseRate}
                                        onChange={(e) => validateAndSetInput('concreteBaseRate', e.target.value, { min: 0, label: 'Rate' })}
                                        className={getInputClass(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Cost Breakdown */}
                <div className="bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                    <button 
                        type="button"
                        onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                        className="w-full flex justify-between items-center p-4 text-left font-bold text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        <span className="flex items-center gap-2"><CalcIcon size={16}/> Live Cost Breakdown</span>
                        {isBreakdownOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                    
                    {isBreakdownOpen && (
                        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-sm">
                            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                <span className="text-slate-600 dark:text-slate-500">Face Material <span className="text-xs opacity-70">({currentResult.area.toFixed(2)} sq.ft)</span></span>
                                <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {currentResult.materialCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                <span className="text-slate-600 dark:text-slate-500">Steel Structure <span className="text-xs opacity-70">({currentResult.steelLength} ft)</span></span>
                                <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {currentResult.steelCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                <span className="text-slate-600 dark:text-slate-500">L-Beading <span className="text-xs opacity-70">({currentResult.beadingLength} ft)</span></span>
                                <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {currentResult.beadingCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                <span className="text-slate-600 dark:text-slate-500">Work Charges <span className="text-xs opacity-70">({currentResult.area.toFixed(2)} sq.ft)</span></span>
                                <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {currentResult.laborCost.toFixed(2)}</span>
                            </div>
                            {currentResult.lightCost > 0 && (
                                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                    <span className="text-slate-600 dark:text-slate-500">Illumination <span className="text-xs opacity-70">({currentResult.lightQty} Tubes)</span></span>
                                    <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {currentResult.lightCost.toFixed(2)}</span>
                                </div>
                            )}
                            {currentResult.depthCoverCost > 0 && (
                                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                    <span className="text-slate-600 dark:text-slate-500">Depth Cover <span className="text-xs opacity-70">({currentResult.perimeterLength} ft)</span></span>
                                    <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {currentResult.depthCoverCost.toFixed(2)}</span>
                                </div>
                            )}
                            {currentResult.backCoverCost > 0 && (
                                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                    <span className="text-slate-600 dark:text-slate-500">Back Cover <span className="text-xs opacity-70">({currentResult.area.toFixed(2)} sq.ft)</span></span>
                                    <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {currentResult.backCoverCost.toFixed(2)}</span>
                                </div>
                            )}
                            {(currentResult.standCost + currentResult.concreteBaseCost + currentResult.offCutCost) > 0 && (
                                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/10">
                                    <span className="text-slate-600 dark:text-slate-500">Hardware & Extras</span>
                                    <span className="font-mono text-slate-800 dark:text-slate-300">{pricing.currencySymbol} {(currentResult.standCost + currentResult.concreteBaseCost + currentResult.offCutCost + currentResult.angleSupportCost).toFixed(2)}</span>
                                </div>
                            )}
                            
                            <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-slate-300 dark:border-white/20 flex justify-between font-bold text-slate-800 dark:text-white">
                                <span>Item Total</span>
                                <span>{pricing.currencySymbol} {currentResult.itemTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          ) : (
            <div className="space-y-6">
                <div>
                    <label className={labelClass}>Description</label>
                    <input 
                        type="text" 
                        value={manualItem.description}
                        onChange={(e) => setManualItem(prev => ({ ...prev, description: e.target.value }))}
                        className={getInputClass(false)}
                        placeholder="Item Description"
                    />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Quantity</label>
                        <input 
                            type="number" 
                            min="1"
                            value={manualItem.qty}
                            onChange={(e) => setManualItem(prev => ({ ...prev, qty: parseInt(e.target.value) || 0 }))}
                            className={getInputClass(false)}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Unit Rate</label>
                        <div className="relative">
                            <span className={iconContainerClass}>{pricing.currencySymbol}</span>
                            <input 
                                type="number" 
                                min="0"
                                value={manualItem.rate || ''}
                                onChange={(e) => setManualItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                                className={getInputClass(false)}
                            />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5 flex justify-between items-center font-bold text-lg text-slate-800 dark:text-white">
                    <span>Manual Item Total</span>
                    <span>{pricing.currencySymbol} {(manualItem.qty * manualItem.rate).toFixed(2)}</span>
                </div>
            </div>
          )}

          <div className="mt-8">
            <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
                <Plus size={20} />
                Add Item to Quote
            </button>
          </div>
        </div>

        {/* 3. ADDED ITEMS LIST */}
        {quoteInputs.items.length > 0 && (
            <div className={`relative ${cardClass} z-30`}>
                <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Items in Quote</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-3">#</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {quoteInputs.items.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-medium text-slate-500">{idx + 1}</td>
                                    <td className="p-3">
                                        {item.type === 'sign' ? (
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white">
                                                    {item.specs?.width}' x {item.specs?.height}' {item.specs?.subType}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {item.specs?.category}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white">{item.manualDesc}</div>
                                                <div className="text-xs text-slate-500">{item.manualQty} @ {pricing.currencySymbol}{item.manualRate}</div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {pricing.currencySymbol} {item.total.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                type="button"
                                                onClick={(e) => handleEditItem(e, item.id)}
                                                className="p-2 text-blue-600 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* 4. GLOBAL SERVICES */}
        <div className={`relative ${cardClass} z-20`}>
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="text-blue-600 dark:text-blue-500" size={24} />
                Additional Services
            </h2>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50/50 dark:bg-white/5 p-4 rounded-xl border border-slate-200/50 dark:border-white/5 hover:border-blue-500/30 transition-colors">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <input 
                                type="checkbox"
                                checked={quoteInputs.installationNeeded}
                                onChange={(e) => {
                                    handleGlobalChange('installationNeeded', e.target.checked);
                                    if (e.target.checked && quoteInputs.installationCost === 0) {
                                        handleGlobalChange('installationCost', 3500);
                                    }
                                }}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-slate-700 dark:text-slate-200">Installation Required</span>
                        </label>
                        {quoteInputs.installationNeeded && (
                            <div className="relative mt-2">
                                <span className={iconContainerClass}>{pricing.currencySymbol}</span>
                                <input 
                                    type="number"
                                    value={quoteInputs.installationCost}
                                    onChange={(e) => handleGlobalChange('installationCost', parseFloat(e.target.value) || 0)}
                                    className={getInputClass(false)}
                                    placeholder="Cost"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50/50 dark:bg-white/5 p-4 rounded-xl border border-slate-200/50 dark:border-white/5 hover:border-blue-500/30 transition-colors">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <input 
                                type="checkbox"
                                checked={quoteInputs.transportationNeeded}
                                onChange={(e) => {
                                    handleGlobalChange('transportationNeeded', e.target.checked);
                                    if (e.target.checked && quoteInputs.transportationCost === 0) {
                                        handleGlobalChange('transportationCost', 3000);
                                    }
                                }}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-slate-700 dark:text-slate-200">Transportation Required</span>
                        </label>
                        {quoteInputs.transportationNeeded && (
                            <div className="relative mt-2">
                                <span className={iconContainerClass}>{pricing.currencySymbol}</span>
                                <input 
                                    type="number"
                                    value={quoteInputs.transportationCost}
                                    onChange={(e) => handleGlobalChange('transportationCost', parseFloat(e.target.value) || 0)}
                                    className={getInputClass(false)}
                                    placeholder="Cost"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/60 dark:border-white/10">
                     <div>
                        <label className={labelClass}>Artwork / Design Cost</label>
                        <div className="relative">
                            <span className={iconContainerClass}><Palette size={18} /></span>
                            <input 
                                type="number"
                                value={quoteInputs.artWorkCost}
                                onChange={(e) => handleGlobalChange('artWorkCost', parseFloat(e.target.value) || 0)}
                                className={getInputClass(false)}
                            />
                        </div>
                     </div>

                     <div>
                        <label className={labelClass}>Discount</label>
                        <div className="flex gap-2">
                            <div className="z-20">
                                <GlassSelect 
                                    className="!w-32"
                                    value={quoteInputs.discountType}
                                    options={[{ label: 'Fixed', value: 'fixed' }, { label: '%', value: 'percentage' }]}
                                    onChange={(val) => handleGlobalChange('discountType', val)}
                                />
                            </div>
                            <div className="relative flex-1">
                                <span className={iconContainerClass}>
                                    {quoteInputs.discountType === 'fixed' ? pricing.currencySymbol : <Percent size={18}/>}
                                </span>
                                <input 
                                    type="number"
                                    value={quoteInputs.discount}
                                    onChange={(e) => handleGlobalChange('discount', parseFloat(e.target.value) || 0)}
                                    className={getInputClass(false)}
                                />
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Summary */}
      <div className="lg:col-span-4 space-y-8">
        <div className={`sticky top-24 ${cardClass}`}>
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="text-blue-600 dark:text-blue-500" size={24} />
                Quote Summary
            </h2>
            
            {/* Template Selector */}
            {/* Template selector removed as per corporate standard */}
            <div className="mb-6 z-50 relative hidden">
                <GlassSelect 
                    label="PDF Template"
                    value={quoteInputs.pdfTemplate}
                    options={[
                        { label: 'Modern (Blue)', value: 'modern' },
                        { label: 'Corporate (Slate)', value: 'corporate' },
                        { label: 'Minimal (BW)', value: 'minimal' },
                    ]}
                    onChange={(val) => handleGlobalChange('pdfTemplate', val)}
                />
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Items Total ({quoteInputs.items.length})</span>
                    <span className="font-mono font-medium">{pricing.currencySymbol} {grandTotal.itemsSubtotal.toFixed(2)}</span>
                </div>
                {grandTotal.installationCost > 0 && (
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>Installation</span>
                        <span className="font-mono font-medium">{pricing.currencySymbol} {grandTotal.installationCost.toFixed(2)}</span>
                    </div>
                )}
                {grandTotal.transportationCost > 0 && (
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>Transportation</span>
                        <span className="font-mono font-medium">{pricing.currencySymbol} {grandTotal.transportationCost.toFixed(2)}</span>
                    </div>
                )}
                {grandTotal.artWorkCost > 0 && (
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>Artwork</span>
                        <span className="font-mono font-medium">{pricing.currencySymbol} {grandTotal.artWorkCost.toFixed(2)}</span>
                    </div>
                )}

                {quoteInputs.discount > 0 && (
                    <>
                        <div className="border-t border-slate-200 dark:border-white/10 my-2"></div>
                        <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                            <span>Subtotal</span>
                            <span className="font-mono">{pricing.currencySymbol} {grandTotal.subTotalBeforeDiscount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-red-500">
                            <span>Discount {quoteInputs.discountType === 'percentage' ? `(${quoteInputs.discount}%)` : ''}</span>
                            <span className="font-mono">-{pricing.currencySymbol} {grandTotal.discountAmount.toFixed(2)}</span>
                        </div>
                    </>
                )}

                <div className="border-t-2 border-slate-200 dark:border-white/10 my-4 pt-4">
                    <div className="flex justify-between items-end">
                        <span className="text-lg font-bold text-slate-800 dark:text-white">Total</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                            {pricing.currencySymbol} {grandTotal.finalTotal.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="space-y-3">
                <button
                    onClick={() => generateQuotePDF(quoteInputs, grandTotal, pricing)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <FileText size={20} />
                    Download PDF Quote
                </button>

                <button
                    onClick={handleWhatsApp}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <MessageCircle size={20} />
                    Open WhatsApp (Attach PDF)
                </button>

                <button
                    onClick={resetForm}
                    className="w-full py-3 bg-white/50 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold rounded-xl border border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 flex items-center justify-center gap-2 transition-all"
                >
                    <RotateCcw size={18} />
                    Start New Quote
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;