import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, MonthlyCustomerSummary, CustomerAttendanceMap, AttendanceStore } from '../types';
import { formatCurrency } from './storage';

/**
 * 1. Generates an itemized Single Customer Monthly Invoice PDF
 */
export function downloadSingleInvoicePDF(
  customer: Customer,
  summary: MonthlyCustomerSummary,
  monthName: string,
  attendanceMap: CustomerAttendanceMap = {},
  yearMonth: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = [217, 119, 6]; // Amber-600
  const darkColor: [number, number, number] = [28, 25, 23]; // Stone-900
  const grayColor: [number, number, number] = [120, 113, 108]; // Stone-500

  // 1. Header Banner
  doc.setFillColor(...darkColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TIFFINFLOW SERVICES', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11);
  doc.text('PREMIUM HOME-STYLE DAILY MEAL CATERING & TIFFIN SERVICE', 14, 19);

  // Business Meta right side
  doc.setFontSize(8);
  doc.setTextColor(214, 211, 209);
  doc.text('GSTIN/Reg: DL-882941-T', pageWidth - 14, 10, { align: 'right' });
  doc.text('Helpline: +91 98765 11223', pageWidth - 14, 15, { align: 'right' });
  doc.text('support@tiffinflow.com', pageWidth - 14, 20, { align: 'right' });

  // 2. Invoice Meta Subheader
  let y = 36;
  doc.setTextColor(...darkColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY TIFFIN STATEMENT & TAX INVOICE', 14, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(`Billing Period: ${monthName}`, 14, y + 5);

  const invoiceNo = `INV-${yearMonth.replace('-', '')}-${customer.id.toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(`Invoice No: ${invoiceNo}`, pageWidth - 14, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - 14, y + 5, { align: 'right' });

  // 3. Customer Information Box
  y += 12;
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Billed To Customer:', 18, y + 7);

  doc.setFontSize(11);
  doc.text(customer.name, 18, y + 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(`Phone: ${customer.phone}`, 18, y + 18);
  doc.text(`Address: ${customer.address}, ${customer.area}`, 18, y + 23);

  // Subscription Plan on right inside box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Subscription Plan Details:', pageWidth - 70, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  const planLabel = customer.planType === 'per_tiffin' ? `Per Tiffin (Rs. ${customer.ratePerTiffin}/tiffin)` : `Monthly Fixed Plan (Rs. ${customer.monthlyFixedRate}/mo)`;
  doc.text(`Plan: ${planLabel}`, pageWidth - 70, y + 12);
  doc.text(`Slot: ${customer.scheduleSlot.toUpperCase().replace('_', ' ')}`, pageWidth - 70, y + 17);
  doc.text(`Diet: ${customer.mealPreference.toUpperCase()}`, pageWidth - 70, y + 22);

  // 4. Financial Executive Metric Badges
  y += 34;
  const colW = (pageWidth - 28) / 4;

  const metricCards = [
    { label: 'TOTAL TIFFINS', val: `${summary.totalTiffins} Meals`, bg: [254, 243, 199] as [number, number, number], tc: [180, 83, 9] as [number, number, number] },
    { label: 'BREAKFAST', val: `${summary.breakfastDelivered} Meals`, bg: [243, 244, 246] as [number, number, number], tc: [55, 65, 81] as [number, number, number] },
    { label: 'GROSS AMOUNT', val: formatCurrency(summary.calculatedAmount), bg: [241, 245, 249] as [number, number, number], tc: [15, 23, 42] as [number, number, number] },
    { label: 'NET DUE BALANCE', val: formatCurrency(summary.dueAmount), bg: summary.dueAmount > 0 ? [254, 226, 226] as [number, number, number] : [209, 250, 229] as [number, number, number], tc: summary.dueAmount > 0 ? [185, 28, 28] as [number, number, number] : [4, 120, 87] as [number, number, number] }
  ];

  metricCards.forEach((c, idx) => {
    const cx = 14 + idx * colW;
    doc.setFillColor(...c.bg);
    doc.roundedRect(cx, y, colW - 3, 14, 1.5, 1.5, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.tc);
    doc.text(c.label, cx + 3, y + 5);

    doc.setFontSize(10);
    doc.text(c.val, cx + 3, y + 11);
  });

  // 5. Date-Wise Daily Delivery Ledger Table
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Date-by-Date Meal Attendance & Delivery Record', 14, y);

  const [yStr, mStr] = yearMonth.split('-');
  const daysInMonth = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();

  const tableRows: any[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayPad = String(d).padStart(2, '0');
    const dateStr = `${yearMonth}-${dayPad}`;
    const dateObj = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    const rec = attendanceMap[dateStr];
    if (!rec) continue;

    const bfast = rec.breakfast === 'delivered' ? 'Yes (Rs.50)' : rec.breakfast === 'skipped' ? 'Skipped' : '—';
    const lunch = rec.lunch === 'delivered' ? 'Delivered' : rec.lunch === 'skipped' ? 'Skipped' : '—';
    const dinner = rec.dinner === 'delivered' ? 'Delivered' : rec.dinner === 'skipped' ? 'Skipped' : '—';
    const extra = rec.extraTiffins > 0 ? `+${rec.extraTiffins} Extra` : '—';

    let dayCount = 0;
    if (rec.lunch === 'delivered') dayCount++;
    if (rec.dinner === 'delivered') dayCount++;
    if (rec.extraTiffins) dayCount += rec.extraTiffins;

    const totalStr = dayCount > 0 ? `${dayCount} tiffin${dayCount > 1 ? 's' : ''}` : rec.breakfast === 'delivered' ? 'Breakfast only' : 'No service';

    tableRows.push([
      `${d} ${monthName.slice(0, 3)} (${dayName})`,
      bfast,
      lunch,
      dinner,
      extra,
      totalStr
    ]);
  }

  autoTable(doc, {
    startY: y + 3,
    head: [['Delivery Date', 'Breakfast', 'Lunch', 'Dinner', 'Extra Guests', 'Daily Total']],
    body: tableRows.length > 0 ? tableRows : [['No records logged for this month yet', '—', '—', '—', '—', '—']],
    theme: 'striped',
    headStyles: {
      fillColor: [28, 25, 23],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [41, 37, 36],
      cellPadding: 1.5
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249]
    },
    margin: { left: 14, right: 14 }
  });

  // 6. Summary Breakdown Box & Payment Details
  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 60;
  
  if (finalY > 230) {
    doc.addPage();
  }
  const summaryY = finalY > 230 ? 20 : finalY;

  // Payment instructions Box
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(14, summaryY, 100, 32, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('Payment Instructions & UPI:', 18, summaryY + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 53, 15);
  doc.text('• UPI ID: 9876511223@upi (GPay / PhonePe / Paytm)', 18, summaryY + 12);
  doc.text('• Bank: State Bank of India | A/c: 39001284910', 18, summaryY + 17);
  doc.text('• IFSC: SBIN0001234 | Branch: Connaught Place', 18, summaryY + 22);
  doc.text('• Please send payment screenshot to WhatsApp: +91 98765 11223', 18, summaryY + 27);

  // Financial Ledger Box on right
  const rightBoxX = 120;
  const rightBoxW = pageWidth - 120 - 14;

  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(rightBoxX, summaryY, rightBoxW, 32, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(...grayColor);
  doc.text('Tiffins Delivered Total:', rightBoxX + 4, summaryY + 7);
  doc.text(`${summary.totalTiffins} meals`, rightBoxX + rightBoxW - 4, summaryY + 7, { align: 'right' });

  if (summary.breakfastDelivered > 0) {
    doc.text(`Breakfast (${summary.breakfastDelivered} x Rs.${summary.breakfastRate}):`, rightBoxX + 4, summaryY + 12);
    doc.text(formatCurrency(summary.breakfastAmount), rightBoxX + rightBoxW - 4, summaryY + 12, { align: 'right' });
  }

  doc.text('Subtotal Bill:', rightBoxX + 4, summaryY + 17);
  doc.text(formatCurrency(summary.calculatedAmount), rightBoxX + rightBoxW - 4, summaryY + 17, { align: 'right' });

  doc.text('Advance / Paid:', rightBoxX + 4, summaryY + 22);
  doc.text(`- ${formatCurrency(summary.advancePaid)}`, rightBoxX + rightBoxW - 4, summaryY + 22, { align: 'right' });

  // Divider
  doc.setDrawColor(214, 211, 209);
  doc.line(rightBoxX + 4, summaryY + 24, rightBoxX + rightBoxW - 4, summaryY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(summary.dueAmount > 0 ? 185 : 4, summary.dueAmount > 0 ? 28 : 120, summary.dueAmount > 0 ? 28 : 87);
  doc.text('NET BALANCE DUE:', rightBoxX + 4, summaryY + 29);
  doc.text(formatCurrency(summary.dueAmount), rightBoxX + rightBoxW - 4, summaryY + 29, { align: 'right' });

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('TiffinFlow Automated SaaS • Generated digitally. No physical signature required.', pageWidth / 2, 290, { align: 'center' });

  doc.save(`${customer.name.replace(/\s+/g, '_')}_Tiffin_Invoice_${yearMonth}.pdf`);
}

/**
 * 2. Generates Master Monthly Ledger PDF for all subscribers
 */
export function downloadMasterMonthlyLedgerPDF(
  summaries: MonthlyCustomerSummary[],
  monthName: string,
  yearMonth: string
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const darkColor: [number, number, number] = [28, 25, 23];

  // Header Banner
  doc.setFillColor(...darkColor);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TIFFINFLOW SERVICES — MASTER MONTHLY RECONCILIATION STATEMENT', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11);
  doc.text(`Comprehensive Monthly Customer Meal Attendance & Billing Ledger | Month: ${monthName} (${yearMonth})`, 14, 18);

  const genDate = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  doc.setFontSize(8);
  doc.setTextColor(214, 211, 209);
  doc.text(`Generated: ${genDate}`, pageWidth - 14, 15, { align: 'right' });

  // Key KPI Overview Row
  const totalSubscribers = summaries.length;
  const totalTiffins = summaries.reduce((acc, s) => acc + s.totalTiffins, 0);
  const totalBreakfast = summaries.reduce((acc, s) => acc + s.breakfastDelivered, 0);
  const totalRevenue = summaries.reduce((acc, s) => acc + s.calculatedAmount, 0);
  const totalPaid = summaries.reduce((acc, s) => acc + s.advancePaid, 0);
  const totalDue = summaries.reduce((acc, s) => acc + s.dueAmount, 0);

  let y = 30;
  const kpiWidth = (pageWidth - 28) / 5;

  const kpis = [
    { label: 'SUBSCRIBERS', val: `${totalSubscribers} Accounts` },
    { label: 'TIFFINS SERVED', val: `${totalTiffins} Delivered` },
    { label: 'BREAKFASTS', val: `${totalBreakfast} Delivered` },
    { label: 'TOTAL BILLED', val: formatCurrency(totalRevenue) },
    { label: 'OUTSTANDING DUES', val: formatCurrency(totalDue) }
  ];

  kpis.forEach((k, idx) => {
    const kx = 14 + idx * kpiWidth;
    doc.setFillColor(245, 245, 244);
    doc.roundedRect(kx, y, kpiWidth - 3, 12, 1.5, 1.5, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 113, 108);
    doc.text(k.label, kx + 3, y + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(28, 25, 23);
    doc.text(k.val, kx + 3, y + 9.5);
  });

  // Master Table
  const tableRows = summaries.map((s, idx) => {
    const planText = s.planType === 'per_tiffin' ? `Per Tiffin (Rs.${s.ratePerTiffin})` : `Monthly (Rs.${s.monthlyFixedRate})`;
    return [
      idx + 1,
      s.customerName,
      s.phone,
      s.area,
      planText,
      `${s.totalTiffins}`,
      s.breakfastDelivered > 0 ? `${s.breakfastDelivered}` : '—',
      `${s.skippedDays}`,
      formatCurrency(s.calculatedAmount),
      formatCurrency(s.advancePaid),
      formatCurrency(s.dueAmount),
      s.paymentStatus.toUpperCase()
    ];
  });

  // Append Total Row
  tableRows.push([
    '',
    'TOTALS',
    '',
    '',
    '',
    `${totalTiffins}`,
    `${totalBreakfast}`,
    '—',
    formatCurrency(totalRevenue),
    formatCurrency(totalPaid),
    formatCurrency(totalDue),
    ''
  ]);

  autoTable(doc, {
    startY: y + 16,
    head: [['#', 'Customer Name', 'Phone', 'Area', 'Plan', 'Tiffins', 'Breakfast', 'Skips', 'Total Bill', 'Paid', 'Net Due', 'Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [28, 25, 23],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [41, 37, 36],
      cellPadding: 1.8
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right', fontStyle: 'bold' },
      11: { halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  doc.save(`TiffinFlow_Master_Ledger_${yearMonth}.pdf`);
}

/**
 * 3. Generates Daily Delivery Run-Sheet & Kitchen Prep Manifest PDF
 */
export function downloadDailyDispatchManifestPDF(
  dateStr: string,
  customers: Customer[],
  attendance: AttendanceStore
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const darkColor: [number, number, number] = [28, 25, 23];

  // Header Banner
  doc.setFillColor(...darkColor);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DAILY DELIVERY MANIFEST & DISPATCH RUN-SHEET', 14, 12);

  const dObj = new Date(dateStr + 'T00:00:00');
  const dateFormatted = dObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11);
  doc.text(`Operational Delivery Run-Sheet for: ${dateFormatted}`, 14, 19);

  // Compute live dispatch counts
  let lunchCount = 0;
  let dinnerCount = 0;
  let breakfastCount = 0;
  let extraCount = 0;
  let vegCount = 0;
  let skippedCount = 0;

  const manifestItems: any[] = [];

  customers.forEach((customer) => {
    const record = attendance[customer.id]?.[dateStr];
    if (!record) return;

    const isLunchDelivered = record.lunch === 'delivered';
    const isDinnerDelivered = record.dinner === 'delivered';
    const isBfastDelivered = record.breakfast === 'delivered';
    const isSkipped = record.lunch === 'skipped' || record.dinner === 'skipped';

    if (isLunchDelivered) lunchCount++;
    if (isDinnerDelivered) dinnerCount++;
    if (isBfastDelivered) breakfastCount++;
    if (record.extraTiffins) extraCount += record.extraTiffins;

    if (customer.mealPreference === 'veg' && (isLunchDelivered || isDinnerDelivered)) {
      vegCount++;
    }
    if (isSkipped) {
      skippedCount++;
    }

    const slotText = [];
    if (isBfastDelivered) slotText.push('Breakfast');
    if (isLunchDelivered) slotText.push('Lunch');
    if (isDinnerDelivered) slotText.push('Dinner');
    if (record.extraTiffins) slotText.push(`+${record.extraTiffins} Extra`);
    if (isSkipped) slotText.push('SKIPPED');

    const statusText = isSkipped ? 'SKIPPED' : (isLunchDelivered || isDinnerDelivered) ? 'READY / DELIVERED' : 'PENDING';

    manifestItems.push([
      customer.assignedRider || 'Unassigned',
      customer.name,
      customer.phone,
      `${customer.address}, ${customer.area}`,
      slotText.join(' + ') || 'None',
      customer.mealPreference.toUpperCase(),
      statusText,
      '[   ] Sign'
    ]);
  });

  // Quick summary boxes
  let y = 32;
  const colW = (pageWidth - 28) / 4;
  const summaryPills = [
    { label: 'LUNCH TIFFINS', val: `${lunchCount} boxes` },
    { label: 'DINNER TIFFINS', val: `${dinnerCount} boxes` },
    { label: 'PURE VEG', val: `${vegCount} meals` },
    { label: 'EXTRA GUESTS', val: `+${extraCount} extra` }
  ];

  summaryPills.forEach((p, idx) => {
    const px = 14 + idx * colW;
    doc.setFillColor(245, 245, 244);
    doc.roundedRect(px, y, colW - 3, 12, 1.5, 1.5, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 113, 108);
    doc.text(p.label, px + 3, y + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(28, 25, 23);
    doc.text(p.val, px + 3, y + 9.5);
  });

  // Table
  autoTable(doc, {
    startY: y + 16,
    head: [['Rider', 'Customer Name', 'Phone', 'Address & Area', 'Meal Slots', 'Diet', 'Status', 'Delivered']],
    body: manifestItems,
    theme: 'grid',
    headStyles: {
      fillColor: [28, 25, 23],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [41, 37, 36],
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { fontStyle: 'bold', cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 42 },
      4: { fontStyle: 'bold', cellWidth: 24 },
      5: { cellWidth: 16 },
      6: { cellWidth: 18 },
      7: { cellWidth: 18, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  doc.save(`TiffinFlow_Delivery_Manifest_${dateStr}.pdf`);
}
