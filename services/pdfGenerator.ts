import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteInputs, PricingConfig, GrandTotalResult, QuoteItem, SignCategory } from '../types';
import { COMPANY_DETAILS } from '../constants';

export const generateQuotePDF = (
  inputs: QuoteInputs,
  grandTotal: GrandTotalResult,
  pricing: PricingConfig
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- HEADER SECTION ---
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_DETAILS.name, 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_DETAILS.address, 20, 26);
  doc.text(`Contact: ${COMPANY_DETAILS.contact}`, 20, 31);

  doc.setFontSize(26);
  doc.setTextColor(59, 130, 246);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION", pageWidth - 20, 25, { align: 'right' });

  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(20, 40, pageWidth - 20, 40);

  // --- INFO COLUMNS ---
  const topY = 50;
  
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 20, topY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(inputs.clientName || 'Valued Customer', 20, topY + 6);
  if (inputs.clientAddress) doc.text(inputs.clientAddress, 20, topY + 11);
  if (inputs.clientContact) doc.text(`Phone: ${inputs.clientContact}`, 20, topY + 16);

  const rightColX = pageWidth - 80;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Quote Details:", rightColX, topY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Date: ${inputs.date}`, rightColX, topY + 6);
  doc.text(`Valid Until: ${inputs.expireDate}`, rightColX, topY + 11);
  if (inputs.quoteBy) doc.text(`Prepared By: ${inputs.quoteBy}`, rightColX, topY + 16);
  doc.text(`Quote Ref: ${inputs.serialNumber}`, rightColX, topY + 21);

  // --- GENERATE DESCRIPTION PER ITEM ---
  const generateItemDescription = (item: QuoteItem, index: number) => {
    const is3D = item.specs.category === SignCategory.ThreeD_SS || item.specs.category === SignCategory.ThreeD_DS;
    const isLightBoard = item.specs.category === SignCategory.SSWL || item.specs.category === SignCategory.DSWL;
    
    let desc = `Product Specification\n`;
    desc += `${item.specs.width}' x ${item.specs.height}' ${item.specs.subType}\n\n`;

    // MATERIALS & MANUFACTURING SECTION
    desc += `Materials & Manufacturing\n`;
    if (is3D) {
        desc += `• 4mm Outdoor ACP Backing Sheet\n`;
        desc += `• High-quality acrylic for durability\n`;
        desc += `• Energy-efficient LED lighting for a vibrant and long-lasting glow\n`;
        desc += `• Premium LED lighting components & power supply units\n`;
        desc += `• Weather-resistant ACP backing sheet suitable for outdoor use\n`;
    } else if (isLightBoard) {
        desc += `• Heavy Duty Steel Box Frame (Zinc Coated)\n`;
        desc += `• Aluminum L-Beading for corrosion resistance\n`;
        desc += `• High-quality Translucent Face Material for uniform illumination\n`;
        desc += `• Weather-proof Backing\n`;
    } else {
        desc += `• Heavy Duty Steel Frame Structure\n`;
        desc += `• Rust-proof primer finish\n`;
        desc += `• High-resolution print / Premium finish material\n`;
    }
    desc += `\n`;

    // CONSTRUCTION SECTION
    desc += `Sign Construction\n`;
    desc += `• Face Material: ${item.specs.subType}\n`;
    
    if (is3D) {
        desc += `• Letter Depth: ~2.5" - 3"\n`;
        desc += `• Emboss Strip: 3mm Echo Board with Auto Paint Finish\n`;
        desc += `• Lighting: High-brightness LED Modules\n`;
    } else if (isLightBoard) {
        desc += `• Box Depth: ~6" - 8" for optimal light diffusion\n`;
        if (item.results.lightQty > 0) {
             desc += `• Lighting: ${item.results.lightQty} x LED Tube Lights\n`;
        }
    } else {
        desc += `• Mounting: Standard Steel Frame\n`;
    }

    if (inputs.showAreaInPDF) {
        desc += `• Total Area: ${item.results.area.toFixed(2)} sq.ft\n`;
    }
    desc += `\n`;

    // HARDWARE
    const hardware = [];
    if (item.specs.giStandQty > 0) hardware.push(`${item.specs.giStandQty}x GI Stands (${item.specs.giPipeSize})`);
    if (item.specs.concreteBaseQty > 0) hardware.push(`${item.specs.concreteBaseQty}x Concrete Bases`);
    if (hardware.length > 0) {
        desc += `Mounting Hardware: ${hardware.join(', ')}\n\n`;
    }

    // ARTWORK SECTION
    desc += `Artwork\n`;
    desc += `• Approved artwork file / Design as per client requirement.\n\n`;

    // WARRANTY SECTION
    desc += `Warranty\n`;
    if (is3D) {
        desc += `• Acrylic: 5 Years\n`;
        desc += `• LED Lights: 12 Months\n`;
        desc += `• Cladding / ACP Backing: 5 Years\n`;
    } else if (isLightBoard) {
         desc += `• Steel Structure: 5 Years\n`;
         desc += `• LED Lights: 12 Months\n`;
         desc += `• Color/Print: 1-2 Years (Outdoor)\n`;
    } else {
         desc += `• Steel Structure: 5 Years\n`;
         desc += `• Face Material: Based on manufacturer spec\n`;
    }

    return desc;
  };

  // --- BUILD TABLE ROWS ---
  const tableBody = [];

  // 1. Add all items
  inputs.items.forEach((item, index) => {
      tableBody.push([
          generateItemDescription(item, index),
          `${pricing.currencySymbol} ${item.results.itemTotal.toFixed(2)}`
      ]);
  });

  // 2. Add Global Services (With detailed descriptions)
  if (inputs.installationNeeded) {
      const installDesc = `Installation Services\n` +
                          `• Professional installation by our experienced team\n` +
                          `• Safety & Compliance: Work carried out according to safety standards\n` +
                          `• Fitting & Alignment\n` +
                          `• Machinery Deployment (if required)`;
      tableBody.push([installDesc, `${pricing.currencySymbol} ${inputs.installationCost.toFixed(2)}`]);
  }

  if (inputs.transportationNeeded) {
      const transportDesc = `Transportation & Delivery\n` +
                            `• Safe transport of signage to site\n` +
                            `• Loading & Unloading`;
      tableBody.push([transportDesc, `${pricing.currencySymbol} ${inputs.transportationCost.toFixed(2)}`]);
  }

  if (inputs.artWorkCost > 0) {
      tableBody.push(["Artwork & Design Charges", `${pricing.currencySymbol} ${inputs.artWorkCost.toFixed(2)}`]);
  }

  // 3. Subtotal Row (only if discount exists)
  if (inputs.discount > 0) {
      tableBody.push([
          { content: "Subtotal", styles: { halign: 'right', fontStyle: 'bold' } },
          `${pricing.currencySymbol} ${grandTotal.subTotalBeforeDiscount.toFixed(2)}`
      ]);
      const discountLabel = inputs.discountType === 'percentage' ? `Discount (${inputs.discount}%)` : 'Discount';
      tableBody.push([
          { content: discountLabel, styles: { halign: 'right', fontStyle: 'italic', textColor: [220, 38, 38] } },
          `-${pricing.currencySymbol} ${grandTotal.discountAmount.toFixed(2)}`
      ]);
  }

  // 4. Final Total
  tableBody.push([
      { content: 'Total Amount', styles: { fontStyle: 'bold', fontSize: 14, halign: 'right' } },
      `${pricing.currencySymbol} ${grandTotal.finalTotal.toFixed(2)}`
  ]);

  // --- RENDER TABLE ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Description of Work", 20, topY + 30);

  autoTable(doc, {
    startY: topY + 35,
    head: [['Description', 'Amount']],
    body: tableBody,
    theme: 'grid',
    headStyles: { 
        fillColor: [59, 130, 246],
        halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold', fontSize: 12 },
    },
    styles: { 
        fontSize: 10, 
        cellPadding: 6,
        valign: 'top',
        lineColor: [203, 213, 225]
    },
    didParseCell: (data) => {
        // Special styling for the Total row
        if (data.row.index === tableBody.length - 1) {
             data.cell.styles.fillColor = [240, 253, 244]; // Light green bg for total
        }
    }
  });

  // --- FOOTER ---
  const footerY = doc.internal.pageSize.height - 20;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your business!", pageWidth / 2, footerY - 5, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont("helvetica", "normal");
  doc.text("© 2025 SignQuote Pro By Waytoogo Industries (Pvt) Ltd . All rights reserved", pageWidth / 2, footerY, { align: 'center' });

  const cleanName = inputs.clientName.replace(/[^a-zA-Z0-9]/g, '_') || 'Quote';
  doc.save(`${cleanName}_${inputs.serialNumber}.pdf`);
};