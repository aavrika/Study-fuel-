import React, { useState } from 'react';
import { Customer, AttendanceStore } from '../types';
import { calculateMonthlySummaries, formatCurrency, generateWhatsAppBillMessage } from '../lib/storage';
import { downloadSingleInvoicePDF } from '../lib/pdfGenerator';
import { X, Printer, Share2, Check, Download, Utensils, FileText } from 'lucide-react';

interface InvoiceModalProps {
  customer: Customer | null;
  yearMonth: string;
  attendance: AttendanceStore;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  customer,
  yearMonth,
  attendance,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !customer) return null;

  const [yearStr, monthStr] = yearMonth.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthTitle = `${monthNames[parseInt(monthStr, 10) - 1]} ${yearStr}`;

  const summaries = calculateMonthlySummaries(yearMonth, [customer], attendance);
  const summary = summaries[0];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!customer || !summary) return;
    const custAttendance = attendance[customer.id] || {};
    downloadSingleInvoicePDF(customer, summary, monthTitle, custAttendance, yearMonth);
  };

  const handleCopyWhatsApp = () => {
    if (!summary) return;
    const msg = generateWhatsAppBillMessage(summary, monthTitle);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl my-4 overflow-hidden flex flex-col">
        
        {/* Top Control Bar */}
        <div className="bg-stone-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">Monthly Tiffin Invoice & Statement</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="download-invoice-pdf-btn"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-xs"
              title="Download official PDF invoice"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'WhatsApp'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-8 space-y-6 text-stone-800 bg-white" id="printable-invoice">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b border-stone-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍱</span>
                <h1 className="text-2xl font-black tracking-tight text-stone-900">
                  Swad Tiffin Service
                </h1>
              </div>
              <p className="text-xs text-stone-500 mt-1">Fresh Home-Style Meals Delivered Daily</p>
              <p className="text-xs text-stone-500">Contact: +91 98765 11223 • GST/MSME Registered</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600 block">
                MONTHLY BILL
              </span>
              <span className="text-base font-extrabold text-stone-900">{monthTitle}</span>
              <p className="text-[11px] text-stone-500 mt-1">Invoice ID: #TFN-{customer.id.toUpperCase()}-{yearMonth.replace('-', '')}</p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-600 block">Billed To</span>
              <h2 className="text-sm font-black text-stone-900">{customer.name}</h2>
              <p className="text-stone-600 mt-0.5">{customer.phone}</p>
              <p className="text-stone-600">{customer.address}, {customer.area}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-600 block">Plan Details</span>
              <p className="font-semibold text-stone-900 mt-0.5">
                {customer.planType === 'per_tiffin' ? `Per Tiffin Rate (₹${customer.ratePerTiffin}/tiffin)` : `Monthly Fixed Plan (₹${customer.monthlyFixedRate}/month)`}
              </p>
              <p className="text-stone-600">
                Slot: {customer.scheduleSlot === 'both' ? 'Lunch + Dinner' : customer.scheduleSlot === 'lunch_only' ? 'Lunch Only' : 'Dinner Only'}
              </p>
              <p className="text-stone-600">Diet: <span className="uppercase font-bold">{customer.mealPreference}</span></p>
            </div>
          </div>

          {/* Tiffin Attendance Breakdown Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Monthly Consumption & Attendance Summary
            </h3>
            <table className="w-full text-xs text-left border border-stone-200 rounded-xl overflow-hidden">
              <thead className="bg-stone-100 text-stone-700 font-bold">
                <tr>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 text-center">Unit / Days</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                <tr>
                  <td className="p-2.5 font-medium">☀️ Lunch Tiffins Delivered</td>
                  <td className="p-2.5 text-center font-bold text-emerald-700">{summary?.lunchDelivered || 0}</td>
                  <td className="p-2.5 text-right text-stone-600">₹{customer.ratePerTiffin}</td>
                  <td className="p-2.5 text-right font-semibold">
                    {formatCurrency((summary?.lunchDelivered || 0) * customer.ratePerTiffin)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">🌙 Dinner Tiffins Delivered</td>
                  <td className="p-2.5 text-center font-bold text-indigo-700">{summary?.dinnerDelivered || 0}</td>
                  <td className="p-2.5 text-right text-stone-600">₹{customer.ratePerTiffin}</td>
                  <td className="p-2.5 text-right font-semibold">
                    {formatCurrency((summary?.dinnerDelivered || 0) * customer.ratePerTiffin)}
                  </td>
                </tr>
                {(summary?.extraTiffins || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 font-medium">⭐ Extra Guest Tiffins</td>
                    <td className="p-2.5 text-center font-bold text-amber-700">+{summary?.extraTiffins}</td>
                    <td className="p-2.5 text-right text-stone-600">₹{customer.ratePerTiffin}</td>
                    <td className="p-2.5 text-right font-semibold">
                      {formatCurrency((summary?.extraTiffins || 0) * customer.ratePerTiffin)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="p-2.5 font-medium text-rose-600">❌ Skips / Leaves Recorded</td>
                  <td className="p-2.5 text-center font-bold text-rose-600">{summary?.skippedDays || 0} days</td>
                  <td className="p-2.5 text-right text-stone-600">—</td>
                  <td className="p-2.5 text-right text-stone-500 font-medium">Not Billed</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col gap-2 text-xs">
            <div className="flex justify-between font-bold text-stone-700">
              <span>Total Tiffins Delivered:</span>
              <span className="text-amber-700 text-sm font-black">{summary?.totalTiffins || 0} tiffins</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Gross Bill Amount:</span>
              <span>{formatCurrency(summary?.calculatedAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Advance / Paid Amount:</span>
              <span>- {formatCurrency(customer.advancePaid)}</span>
            </div>
            <div className="h-px bg-stone-300 my-1" />
            <div className="flex justify-between items-baseline font-black text-base text-stone-900">
              <span>Net Balance Due:</span>
              <span className="text-xl text-rose-600">{formatCurrency(summary?.dueAmount || 0)}</span>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
            <p className="font-bold">Payment Methods: UPI / Bank Transfer / Cash</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Google Pay / PhonePe / Paytm to: <strong>9876511223@upi</strong>. Please share payment confirmation or screenshot on WhatsApp after paying.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
