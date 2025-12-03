import { SignCategory, PricingConfig, PIPE_SIZES } from './types';

export const SIGN_TYPES_HIERARCHY: Record<SignCategory, string[]> = {
  [SignCategory.SSWOL]: [
    "Flex",
    "PVC Paste on Cladding",
    "Paint Finish Echo Letters / Cladding letters"
  ],
  [SignCategory.SSWL]: [
    "Flex Light Board",
    "PVC Paste on Acrylic Sheet",
    "Cladding CNC Cut Backlit"
  ],
  [SignCategory.DSWO]: [
    "Flex",
    "PVC Paste on Cladding",
    "Paint Finish Echo Letters"
  ],
  [SignCategory.DSWL]: [
    "Flex Light Board",
    "PVC Paste on Acrylic Sheet",
    "Cladding CNC Cut Backlit",
    "3D Echo Letter Sign"
  ],
  [SignCategory.ThreeD_SS]: [
    "3D Acrylic Glow Sign (S/S)",
    "3D Echo Board Backlit Sign (S/S)"
  ],
  [SignCategory.ThreeD_DS]: [
    "3D Acrylic Glow Sign (D/S)",
    "3D Echo Board Backlit Sign (D/S)",
    "3D Acrylic Glow Sign (D/S Type B)"
  ]
};

export const COMPANY_DETAILS = {
  name: "Waytoogo Industries (Pvt) Ltd.",
  address: "A10, Commercial Centre\nBandarawela Uva Province 90100\nSriLanka",
  contact: "0743724000",
  email: "waytoogoindustries@gmail.com"
};

// Initial default prices
export const DEFAULT_PRICING: PricingConfig = {
  currencySymbol: "Rs.",
  materials: {
    [SignCategory.SSWOL]: {
      "Flex": 260,
      "PVC Paste on Cladding": 600,
      "Paint Finish Echo Letters / Cladding letters": 2250
    },
    [SignCategory.SSWL]: {
      "Flex Light Board": 350,
      "PVC Paste on Acrylic Sheet": 1250,
      "Cladding CNC Cut Backlit": 2500
    },
    [SignCategory.DSWO]: {
      "Flex": 260,
      "PVC Paste on Cladding": 600,
      "Paint Finish Echo Letters": 2250
    },
    [SignCategory.DSWL]: {
      "Flex Light Board": 350,
      "PVC Paste on Acrylic Sheet": 1250,
      "Cladding CNC Cut Backlit": 2500,
      "3D Echo Letter Sign": 2000
    },
    [SignCategory.ThreeD_SS]: {
      "3D Acrylic Glow Sign (S/S)": 3500,
      "3D Echo Board Backlit Sign (S/S)": 3500
    },
    [SignCategory.ThreeD_DS]: {
      "3D Acrylic Glow Sign (D/S)": 3500,
      "3D Echo Board Backlit Sign (D/S)": 3500,
      "3D Acrylic Glow Sign (D/S Type B)": 3500
    }
  },
  pipes: {
    [PIPE_SIZES[0]]: 4500, // 1.5" x 1.6mm
    [PIPE_SIZES[1]]: 5500, // 1.5" x 2mm
    [PIPE_SIZES[2]]: 6500, // 2" x 1.6mm
    [PIPE_SIZES[3]]: 8500, // 2" x 2mm
    [PIPE_SIZES[4]]: 11000, // 3" x 1.6mm
    [PIPE_SIZES[5]]: 13500, // 3" x 2mm
    [PIPE_SIZES[6]]: 15000, // 4" x 2mm
  },
  labor: {
    tier1: 150, // < 10 sqft
    tier2: 100,  // < 20 sqft
    tier3: 100   // > 20 sqft
  },
  structural: {
    steelPricePerFt: 120,
    beadingPricePerFt: 125,
    depthCoverPricePerFt: 250,
    backCoverPricePerSqFt: 150
  },
  electrical: {
    tubeLightPrice: 850
  },
  others: {
    offCutPerSqFt: 100,
    angleSupportUnit: 4500,
    concreteBaseUnit: 5000
  }
};