
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
    Settings,
    Truck,
    Palette,
    Percent,
    LayoutTemplate,
    PenTool,
    Edit // Imported Edit icon
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
    expireDate: getFutureDate(30),
    quoteBy: '',
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

  const handleEditItem = (id: string) => {
    const itemToEdit = quoteInputs.items.find(item => item.id === id);
    if (!itemToEdit) return;

    if (window.confirm("Edit this item? It will be moved back to the builder for modification.")) {
        // 1. Load data back to inputs
        if (itemToEdit.type === 'sign' && itemToEdit.specs) {
            setActiveBuilderTab('sign');
            // Deep clone to prevent reference issues
            setCurrentSign(JSON.parse(JSON.stringify(itemToEdit.specs)));
        } else if (itemToEdit.type === 'manual') {
            setActiveBuilderTab('manual');
            setManualItem({
                description: itemToEdit.manualDesc || '',
                qty: itemToEdit.manualQty || 1,
                rate: itemToEdit.manualRate || 0
            });
        }

        // 2. Remove from list (effectively "moving" it to edit mode)
        handleRemoveItem(id);

        // 3. Scroll to builder with a slight delay to ensure UI update
        setTimeout(() => {
            const builderElement = document.getElementById('sign-builder-card');
            if (builderElement) {
                builderElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }
  };

  const refreshSerial = () => setQuoteInputs(prev => ({ ...prev, serialNumber: generateSerial() }));
  
  const resetForm = (e: React.MouseEvent) => { 
    e.preventDefault();
    if (window.confirm("Are you sure you want to reset everything? All current data will be lost.")) {
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
  };
  
  const suggestConcreteBase = () => setCurrentSign(prev => ({ ...prev, concreteBaseQty: prev.giStandQty + prev.angleSupportQty }));

  // --- FLUENT DESIGN STYLES ---
  
  // 1. Cards (Acrylic Material)
  const cardClass = `
    bg-white/70 dark:bg-[#202020]/70 backdrop-blur-2xl
    border border-white/40 dark:border-white/5
    shadow-xl shadow-black/5 dark:shadow-black/20
    rounded-2xl transition-all duration-300
  `;

  // 2. Inputs (Filled Style)
  const getInputClass = (hasError: