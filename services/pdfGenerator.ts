
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteInputs, PricingConfig, GrandTotalResult, QuoteItem, SignCategory } from '../types';
import { COMPANY_DETAILS } from '../constants';

// --- THEME CONFIGURATION ---
type TemplateStyle = {
  primaryColor: [number, number, number];
  secondaryColor: [number, number, number];
  headerBg: [number, number, number];
  textColor: [number, number, number];
  accentColor: [number, number, number];
  font: string;
  headerStyle: 'modern' | 'corporate' | 'minimal';
};

const TEMPLATES: Record<string, TemplateStyle> = {
  modern: {
    primaryColor: [59, 130, 246], // Blue-500
    secondaryColor: [30, 41, 59], // Slate-800
    headerBg: [241, 245, 249],    // Slate-100
    textColor: [51, 65, 85],      // Slate-700
    accentColor: [59, 130, 246],  // Blue
    font: 'helvetica',
    headerStyle: 'modern'
  },
  corporate: {
    primaryColor: [15, 23, 42],   // Slate-900
    secondaryColor: [51, 65, 85], // Slate-700
    headerBg: [255, 255, 255],    // White
    textColor: [30, 41, 59],      // Slate-800
    accentColor: [15, 23, 42],    // Slate-900
    font: 'times',
    headerStyle: 'corporate'
  },
  minimal: {
    primaryColor: [0, 0, 0],      // Black
    secondaryColor: [80, 80, 80], // Gray
    headerBg: [255, 255, 255],
    textColor: [0, 0, 0],
    accentColor: [200, 200, 200], // Light Gray
    font: 'courier',
    headerStyle: 'minimal'
  }
};

export const generateQuotePDF = (
  inputs: QuoteInputs,
  grandTotal: GrandTotalResult,
  pricing: PricingConfig
) => {
  const doc = new jsPDF();
  const theme = TEMPLATES[inputs.pdfTemplate || 'modern'];
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Helper for consistent text color
  const setTextColor = (color: [number, number, number]) => doc.setTextColor(color[0], color[1], color[2]);
  
  // --- HEADER SECTION ---
  if (theme.headerStyle === 'modern') {
    // Blue bar at top
    doc.setFillColor(theme.primaryColor[0], theme.primaryColor[1], theme.primaryColor[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');
    
    // Company Name (Top Left)
    doc.setFont(theme.font, "bold");
    doc.setFontSize(18); // Reduced to prevent overlap
    setTextColor(theme.secondaryColor);
    doc.text(COMPANY_DETAILS.name, 20, 20);

    // QUOTATION Label (Top Right)
    doc.setFontSize(24); // Reduced to prevent overlap
    setTextColor(theme.primaryColor);
    doc.text("QUOTATION", pageWidth - 20, 28, { align: 'right' }); // Lowered slightly
    
    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 38, pageWidth - 20, 38); // Moved down

  } else if (theme.headerStyle === 'corporate') {
    // Left Box Header
    doc.setFillColor(theme.primaryColor[0], theme.primaryColor[1], theme.primaryColor[2]);
    doc.rect(0, 0, pageWidth, 45, 'F'); // Increased height
    
    doc.setFont(theme.font, "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(COMPANY_DETAILS.name, 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(theme.font, "normal");
    doc.text(COMPANY_DETAILS.address, 20, 28);
    doc.text(COMPANY_DETAILS.contact, 20, 34);

    // Right Box Quote
    doc.setFontSize(26);
    doc.text("QUOTATION", pageWidth - 20, 38, { align: 'right' }); // Aligned bottom right of header

  } else {
    // Minimal
    doc.setFont(theme.font, "bold");
    doc.setFontSize(18);
    setTextColor([0, 0, 0]);
    doc.text(COMPANY_DETAILS.name.toUpperCase(), pageWidth/2, 20, { align: 'center' });
    doc.setLineWidth(1);
    doc.line(pageWidth/2 - 20, 25, pageWidth/2 + 20, 25);
  }

  // --- INFO COLUMNS (Sender & Receiver) ---
  const startY = theme.headerStyle === 'corporate' ? 60 : 48; // Adjusted start Y
  
  // From Details (If not in header already)
  if (theme.headerStyle !== 'corporate') {
    doc.setFont(theme.font, "normal");
    doc.setFontSize(9);
    setTextColor(theme.secondaryColor);
    doc.text(COMPANY_DETAILS.address, 20, theme.headerStyle === 'minimal' ? 35 : 26);
    doc.text(`Tel: ${COMPANY_DETAILS.contact}`, 20, theme.headerStyle === 'minimal' ? 40 : 31);
  }

  // Client Details Box
  const boxY = startY;
  
  // BILL TO
  doc.setFont(theme.font, "bold");
  doc.setFontSize(10);
  setTextColor(theme.primaryColor);
  doc.text("BILL TO:", 20, boxY);
  
  doc.setFont(theme.font, "normal");
  doc.setFontSize(10);
  setTextColor(theme.textColor);
  doc.text(inputs.clientName || 'Valued Customer', 20, boxY + 6);
  if (inputs.clientAddress) doc.text(inputs.clientAddress, 20, boxY + 11);
  if (inputs.clientContact) doc.text(inputs.clientContact, 20, boxY + 16);

  // QUOTE DETAILS (Right Aligned)
  const rightX = pageWidth - 80;
  doc.setFont(theme.font, "bold");
  setTextColor(theme.primaryColor);
  doc.text("DETAILS:", rightX, boxY);
  
  doc.setFont(theme.font, "normal");
  setTextColor(theme.textColor);
  
  const drawDetailRow = (label: string, value: string, yOffset: number) => {
    doc.setFont(theme.font, "bold");
    doc.text(label, rightX, boxY + yOffset);
    doc.setFont(theme.font, "normal");
    doc.text(value, pageWidth - 20, boxY + yOffset, { align: 'right' });
  };

  drawDetailRow("Date:", inputs.date, 6);
  drawDetailRow("Ref #:", inputs.serialNumber, 11);
  drawDetailRow("Valid Until:", inputs.expireDate, 16);
  if (inputs.quoteBy) drawDetailRow("Prepared By:", inputs.quoteBy, 21);

  // Subject Line
  let tableStartY = boxY + 35;
  if (inputs.subject) {
    doc.setFont(theme.font, "bold");
    doc.setFontSize(10);
    setTextColor(theme.secondaryColor);
    doc.text(`Subject: ${inputs.subject}`, 20, boxY + 30);
    tableStartY = boxY + 42;
  }

  // --- DESCRIPTION GENERATOR ---
  const generateItemDescription = (item: QuoteItem) => {
    if (item.type === 'manual') return item.manualDesc || 'Manual Item';

    const is3D = item.specs?.category === SignCategory.ThreeD_SS || item.specs?.category === SignCategory.ThreeD_DS;
    const isLightBoard = item.specs?.category === SignCategory.SSWL || item.specs?.category === SignCategory.DSWL;
    
    let parts = [];
    
    // 1. Headline
    parts.push(`Product Specification`);
    parts.push(`${item.specs?.width}' x ${item.specs?.height}' ${item.specs?.category}`);
    parts.push(`Type: ${item.specs?.subType}\n`);
    
    // 2. Technical Specs
    parts.push(`Materials & Manufacturing`);
    if (is3D) {
       parts.push("• 4mm Outdoor ACP Backing Sheet");
       parts.push("• High-quality Acrylic Face");
       parts.push("• Premium LED Illumination (Modules/Pixel)");
       parts.push("• Weather-resistant construction\n");
    } else if (isLightBoard) {
       parts.push("• Heavy Duty Steel Box Frame (Zinc Coated)");
       parts.push("• Translucent Face Material");
       parts.push(`• Box Depth: 6-8 inches`);
       parts.push("• Weather-proof Backing (Zinc/ACP)\n");
    } else {
       parts.push("• Heavy Duty Steel Frame Structure");
       parts.push("• Rust-proof primer finish");
       parts.push("• High-resolution print / Premium finish material\n");
    }

    parts.push(`Sign Construction`);
    if (is3D) {
        parts.push(`• Letter Depth: ~2.5" - 3"`);
        parts.push(`• Emboss Strip: 3mm Echo Board with Auto Paint Finish`);
        parts.push(`• Lighting: High-brightness LED Modules`);
    } else if (isLightBoard) {
        if (item.results?.lightQty && item.results.lightQty > 0) parts.push(`• Lighting: ${item.results.lightQty} x LED Tube Lights (Samsung/Phillips/Equiv)`);
        parts.push(`• Beading: Aluminum L-Beading`);
    } else {
        parts.push(`• Mounting: Standard Steel Frame`);
    }
    
    if (inputs.showAreaInPDF && item.results) {
        parts.push(`• Total Area: ${item.results.area.toFixed(2)} sq.ft`);
    }
    parts.push('');

    // 3. Hardware
    if (item.specs?.giStandQty && item.specs.giStandQty > 0 || item.specs?.concreteBaseQty && item.specs.concreteBaseQty > 0) {
        parts.push(`Mounting Hardware`);
        if (item.specs?.giStandQty && item.specs.giStandQty > 0) parts.push(`• ${item.specs.giStandQty}x GI Stands (${item.specs.giPipeSize})`);
        if (item.specs?.concreteBaseQty && item.specs.concreteBaseQty > 0) parts.push(`• ${item.specs.concreteBaseQty}x Concrete Bases`);
        parts.push('');
    }

    // Warranty
    parts.push(`Warranty`);
    if (is3D) {
        parts.push(`• Acrylic: 5 Years | LED: 1 Year | ACP: 5 Years`);
    } else if (isLightBoard) {
        parts.push(`• Structure: 5 Years | LED: 1 Year | Print: 1-2 Years`);
    } else {
        parts.push(`• Structure: 5 Years | Face: Manufacturer Spec`);
    }

    return parts.join('\n');
  };

  // --- TABLE CONTENT ---
  const tableBody = [];
  
  inputs.items.forEach((item, index) => {
      tableBody.push([
          (index + 1).toString(),
          generateItemDescription(item),
          `${pricing.currencySymbol} ${item.total.toFixed(2)}`
      ]);
  });

  // Services
  const addServiceRow = (name: string, desc: string, cost: number) => {
      if (cost > 0) {
          tableBody.push([
              '',
              `${name}\n${desc}`,
              `${pricing.currencySymbol} ${cost.toFixed(2)}`
          ]);
      }
  };

  if (inputs.installationNeeded) {
      const installDesc = `Installation Services\n` +
                          `• Professional mounting & alignment\n` +
                          `• Safety & Compliance (Work at heights)\n` +
                          `• Machinery Deployment (if required)`;
      addServiceRow("Installation Services", installDesc, inputs.installationCost);
  }

  if (inputs.transportationNeeded) {
       const transportDesc = `Transportation & Logistics\n` +
                             `• Safe delivery to site\n` +
                             `• Loading & Unloading`;
       addServiceRow("Transportation", transportDesc, inputs.transportationCost);
  }

  if (inputs.artWorkCost > 0) addServiceRow("Artwork & Design", "Custom design as per client requirements", inputs.artWorkCost);

  // Totals Logic
  if (inputs.discount > 0) {
     tableBody.push(['', { content: "Subtotal", styles: { halign: 'right', fontStyle: 'bold' } }, `${pricing.currencySymbol} ${grandTotal.subTotalBeforeDiscount.toFixed(2)}`]);
     const discLabel = inputs.discountType === 'percentage' ? `Discount (${inputs.discount}%)` : 'Discount';
     tableBody.push(['', { content: discLabel, styles: { halign: 'right', textColor: [220, 50, 50] } }, `-${pricing.currencySymbol} ${grandTotal.discountAmount.toFixed(2)}`]);
  }

  // Final Total Row
  tableBody.push([
      '', 
      { content: 'TOTAL AMOUNT', styles: { halign: 'right', fontSize: 14, fontStyle: 'bold' } }, 
      { content: `${pricing.currencySymbol} ${grandTotal.finalTotal.toFixed(2)}`, styles: { fontSize: 14, fontStyle: 'bold' } }
  ]);

  // --- RENDER TABLE ---
  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Description', 'Amount']],
    body: tableBody,
    theme: theme.headerStyle === 'minimal' ? 'plain' : 'grid',
    styles: {
        font: theme.font,
        fontSize: 10,
        cellPadding: 6,
        textColor: theme.textColor,
        lineColor: [230, 230, 230],
        valign: 'top'
    },
    headStyles: {
        fillColor: theme.headerStyle === 'minimal' ? [255, 255, 255] : theme.primaryColor,
        textColor: theme.headerStyle === 'minimal' ? [0, 0, 0] : [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'left'
    },
    columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40, halign: 'right' }
    },
    didParseCell: (data) => {
        // Style the total row background
        if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fillColor = theme.headerBg;
            if (theme.headerStyle === 'modern') data.cell.styles.textColor = theme.primaryColor;
        }
    }
  });

  // --- FOOTER & SIGNATURE ---
  const lastY = (doc as any).lastAutoTable.finalY;
  let footerY = lastY + 30;
  
  if (footerY > pageHeight - 50) {
      doc.addPage();
      footerY = 40;
  }

  // Terms & Conditions
  doc.setFontSize(8);
  doc.setFont(theme.font, 'bold');
  setTextColor(theme.secondaryColor);
  doc.text("TERMS & CONDITIONS:", 20, footerY);
  doc.setFont(theme.font, 'normal');
  doc.text([
      "1. 50% Advance payment required to commence work.",
      "2. Balance payment to be settled upon completion/delivery.",
      "3. Quotation valid for 30 days.",
      "4. Goods once sold are not returnable.",
  ], 20, footerY + 5);

  // Signature Lines
  const sigY = footerY + 30;
  doc.setDrawColor(150);
  doc.setLineWidth(0.5);
  doc.line(20, sigY, 80, sigY); // Customer Sig
  doc.line(pageWidth - 80, sigY, pageWidth - 20, sigY); // Authorized Sig

  doc.setFontSize(9);
  doc.text("Customer Signature", 20, sigY + 5);
  doc.text("Authorized Signature", pageWidth - 80, sigY + 5);
  doc.text(COMPANY_DETAILS.name, pageWidth - 80, sigY + 10);

  // Bottom Footer
  doc.setFontSize(8);
  setTextColor([150, 150, 150]);
  doc.text("© 2025 SignQuote Pro By Waytoogo Industries (Pvt) Ltd . All rights reserved", pageWidth/2, pageHeight - 10, { align: 'center' });

  // Save
  const cleanName = inputs.clientName.replace(/[^a-zA-Z0-9]/g, '_') || 'Quote';
  doc.save(`${cleanName}_${inputs.serialNumber}.pdf`);
};
