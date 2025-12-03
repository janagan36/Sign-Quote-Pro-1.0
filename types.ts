export enum SignCategory {
  SSWOL = "Single Side without light (SSWOL)",
  SSWL = "Single Side Light Board (SSWL)",
  DSWO = "Double Side Without Light (DSWO)",
  DSWL = "Double side with light (DSWL)",
  ThreeD_SS = "3D Sign Single Side",
  ThreeD_DS = "3D Sign Double Side"
}

export const PIPE_SIZES = [
  "1.5\" x 1.6mm",
  "1.5\" x 2mm",
  "2\" x 1.6mm",
  "2\" x 2mm",
  "3\" x 1.6mm",
  "3\" x 2mm",
  "4\" x 2mm"
] as const;

export type PipeSize = typeof PIPE_SIZES[number];

export interface MaterialRates {
  [category: string]: {
    [subType: string]: number; // Price per sq ft
  };
}

export interface PipeRates {
  [size: string]: number; // Price per stand unit
}

export interface LaborRates {
  tier1: number; // Area < 10
  tier2: number; // Area < 20
  tier3: number; // Area >= 20 (covering > 30)
}

export interface StructuralRates {
  steelPricePerFt: number;
  beadingPricePerFt: number;
  depthCoverPricePerFt: number; // For Perimeter
  backCoverPricePerSqFt: number; // For Area
}

export interface ElectricalRates {
  tubeLightPrice: number;
}

export interface OtherRates {
  offCutPerSqFt: number;
  angleSupportUnit: number;
  concreteBaseUnit: number;
}

export interface PricingConfig {
  materials: MaterialRates;
  pipes: PipeRates;
  labor: LaborRates;
  structural: StructuralRates;
  electrical: ElectricalRates;
  others: OtherRates;
  currencySymbol: string;
}

// 1. Definition of a single sign's physical specs
export interface SignSpecifications {
  category: SignCategory;
  subType: string;
  width: number;
  height: number;
  offCutSqFt: number;
  giStandQty: number;
  giPipeSize: PipeSize;
  angleSupportQty: number;
  concreteBaseQty: number;
  concreteBaseRate?: number;
}

// 2. Result of calculating one specific sign
export interface SignCalculationResult {
  area: number;
  materialCost: number;
  steelCost: number;
  beadingCost: number;
  steelLength: number;
  beadingLength: number;
  perimeterLength: number;
  laborCost: number;
  lightCost: number;
  depthCoverCost: number;
  backCoverCost: number;
  offCutCost: number;
  standCost: number;
  angleSupportCost: number;
  concreteBaseCost: number;
  lightQty: number;
  itemTotal: number; // Total for this specific sign (Materials + Labor + Extras)
}

// 3. A finalized item in the quote list (Supports Sign OR Manual)
export interface QuoteItem {
  id: string;
  type: 'sign' | 'manual';
  
  // For 'sign' type
  specs?: SignSpecifications;
  results?: SignCalculationResult;
  
  // For 'manual' type
  manualDesc?: string;
  manualQty?: number;
  manualRate?: number;
  
  // Common
  total: number;
}

// 4. Global Quote Configuration (Client + Services)
export interface QuoteInputs {
  // Client & Meta
  serialNumber: string;
  clientName: string;
  clientAddress: string;
  clientContact: string;
  date: string;
  expireDate: string;
  quoteBy: string;
  showAreaInPDF: boolean;
  pdfTemplate: 'modern' | 'corporate' | 'minimal';

  // The List of Signs
  items: QuoteItem[];

  // Global Services (Apply to whole job)
  installationNeeded: boolean;
  installationCost: number;
  transportationNeeded: boolean;
  transportationCost: number;
  artWorkCost: number;
  
  // Discount
  discount: number;
  discountType: 'fixed' | 'percentage';
}

// 5. Final Grand Totals
export interface GrandTotalResult {
  itemsSubtotal: number; // Sum of all signs
  installationCost: number;
  transportationCost: number;
  artWorkCost: number;
  subTotalBeforeDiscount: number;
  discountAmount: number;
  finalTotal: number;
}