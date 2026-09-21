import React, { useState } from 'react';
import {
  Customer,
  AttendanceStore,
  MonthlyCustomerSummary
} from '../types';
import {
  calculateMonthlySummaries,
  formatCurrency,
  generateWhatsAppBillMessage
} from '../lib/storage';
import { DailyTiffinsTrendChart } from './DailyTiffinsTrendChart';
import { downloadMasterMonthlyLedgerPDF, downloadSingleInvoicePDF } from '../lib/pdfGenerator';
import {
  Calendar,
  RotateCw,
  Download,
  Share2,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  MessageCircle
} from 'lucide-react';
import { MessageTemplateType } from '../lib/whatsapp';

interface MonthlySyncViewProps {
  customers: Customer[];
  attendance: AttendanceStore;
  currentYearMonth: string;
  setCurrentYearMonth: (ym: string) => void;
  onOpenCustomerCalendar: (customer: Customer) => void;
  onViewInvoice: (customer: Customer, yearMonth: string) => void;
  onRecordPayment: (customerId: string, newAdvance: number) => void;
  onOpenQuickMessage: (
    customer: Customer,
    template?: MessageTemplateType
  ) => void;
}

export const MonthlySyncView: React.FC<MonthlySyncViewProps> = ({
  customers,
  attendance,
  currentYearMonth,
  setCurrentYearMonth,
  onOpenCustomerCalendar,
  onViewInvoice,
  onRecordPayment,
  onOpenQuickMessage
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Parse Year and Month
  const [yearStr, monthStr] = currentYearMonth.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10) - 1;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthName = monthNames[monthNum] || 'Current Month';

  // Navigation
  const handleShiftMonth = (offset: number) => {
    let nextMonth = monthNum + offset;
    let nextYear = yearNum;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    const mm = String(nextMonth + 1).padStart(2, '0');
    setCurrentYearMonth(`${nextYear}-${mm}`);
  };

  // Perform calculations
  const summaries = calculateMonthlySummaries(currentYearMonth, customers, attendance);

  // Business Totals
  const totalBusinessTiffins = summaries.reduce((acc, s) => acc + s.totalTiffins, 0);
  const totalBusinessRevenue = summaries.reduce((acc, s) => acc + s.calculatedAmount, 0);
  const totalBusinessCollected = summaries.reduce((acc, s) => acc + s.advancePaid, 0);
  const totalBusinessDue = summaries.reduce((acc, s) => acc + s.dueAmount, 0);
  const totalLeaves = summaries.reduce((acc, s) => acc + s.skippedDays, 0);

  // Filter summaries
  const filteredSummaries = summaries.filter((s) => {
    if (paymentFilter === 'pending' && s.dueAmount <= 0) return false;
    if (paymentFilter === 'paid' && s.dueAmount > 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.customerName.toLowerCase().includes(q);
      const matchPhone = s.phone.toLowerCase().includes(q);
      const matchArea = s.area.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchArea) return false;
    }
    return true;
  });

  // Master Sync Trigger
  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(`Synced at ${time}`);
    }, 600);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Phone',
      'Area',
      'Plan Type',
      'Lunch Delivered',
      'Dinner Delivered',
      'Extra Tiffins',
      'Total Tiffins',
      'Leaves/Skips',
      'Total Amount (INR)',
      'Paid (INR)',
      'Due Balance (INR)',
      'Status'
    ];

    const rows = filteredSummaries.map((s) => [
      `"${s.customerName}"`,
      `"${s.phone}"`,
      `"${s.area}"`,
      `"${s.planType}"`,
      s.lunchDelivered,
      s.dinnerDelivered,
      s.extraTiffins,
      s.totalTiffins,
      s.skippedDays,
      s.calculatedAmount,
      s.advancePaid,
      s.dueAmount,
      `"${s.paymentStatus}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TiffinFlow_${currentYearMonth}_Monthly_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy WhatsApp bill for a specific customer
  const handleCopyWhatsApp = (summary: MonthlyCustomerSummary) => {
    const text = generateWhatsAppBillMessage(summary, `${monthName} ${yearNum}`);
    navigator.clipboard.writeText(text);
    setCopiedId(summary.customerId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Month Selector + Master Sync Button */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleShiftMonth(-1)}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center">
              <span className="font-extrabold text-stone-900 text-sm">
                {monthName} {yearNum}
              </span>
            </div>
            <button
              onClick={() => handleShiftMonth(1)}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-500 block">Monthly Billing & Tiffin Sync</span>
            <span className="text-xs text-stone-700 font-medium">
              Monthly meal counts and ledger across all subscribers
            </span>
          </div>
        </div>

        {/* Master Sync & Export Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-stone-400 block font-medium">Status</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {lastSyncTime}
            </span>
          </div>

          <button
            id="sync-all-tiffins-btn"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-70"
          >
            <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Tiffins Now'}</span>
          </button>

          <button
            id="export-master-ledger-pdf-btn"
            onClick={() => {
              downloadMasterMonthlyLedgerPDF(summaries, `${monthName} ${yearNum}`, currentYearMonth);
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs transition-colors shadow-xs"
            title="Download Master Reconciliation Ledger PDF"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Master Ledger PDF</span>
          </button>

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors"
            title="Export CSV / Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">Total Tiffins Served</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{totalBusinessTiffins}</span>
            <span className="text-xs text-stone-500 font-semibold">tiffins</span>
          </div>
          <span className="text-[11px] text-stone-400 block mt-1">Across all active subscribers</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">Total Revenue</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{formatCurrency(totalBusinessRevenue)}</span>
          </div>
          <span className="text-[11px] text-stone-400 block mt-1">Gross billable this month</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">Collected / Advance</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-stone-900">{formatCurrency(totalBusinessCollected)}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold block mt-1">Received in bank / cash</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block">Pending Due Balance</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{formatCurrency(totalBusinessDue)}</span>
          </div>
          <span className="text-[11px] text-rose-500 font-semibold block mt-1">To collect from customers</span>
        </div>
      </div>

      {/* Visual Service Trends Line Chart (Recharts) */}
      <DailyTiffinsTrendChart
        customers={customers}
        attendance={attendance}
        yearMonth={currentYearMonth}
        title="Tiffins Delivered Per Day"
        subtitle={`Daily delivery volumes, lunch vs dinner volume distribution, and service trends for ${monthName} ${yearNum}`}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, phone, area in report..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 text-stone-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paymentFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({summaries.length})
            </button>
            <button
              onClick={() => setPaymentFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paymentFilter === 'pending' ? 'bg-white text-rose-700 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Payment Pending ({summaries.filter((s) => s.dueAmount > 0).length})
            </button>
            <button
              onClick={() => setPaymentFilter('paid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paymentFilter === 'paid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Fully Paid ({summaries.filter((s) => s.dueAmount <= 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* Master Customer Sync & Tiffin Count Table ("sabke samne show kare kitne tiffin ho gye") */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-stone-900 text-base">
              Customer-wise Monthly Tiffin Count & Balance Sheet
            </h3>
            <p className="text-xs text-stone-500">
              Live delivery counts and calculated statements across all customer accounts
            </p>
          </div>
          <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-full">
            {filteredSummaries.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-600 font-extrabold text-[11px] uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="px-5 py-3">Customer & Area</th>
                <th className="px-3 py-3">Plan Rate</th>
                <th className="px-3 py-3 text-center">☀️ Lunch</th>
                <th className="px-3 py-3 text-center">🌙 Dinner</th>
                <th className="px-3 py-3 text-center">⭐ Extra</th>
                <th className="px-3 py-3 text-center">❌ Leaves</th>
                <th className="px-4 py-3 text-center bg-amber-500/10 text-amber-900">🍱 Total Tiffins</th>
                <th className="px-3 py-3 text-right">Total Bill</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Net Due</th>
                <th className="px-5 py-3 text-center">Actions & Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-stone-500">
                    <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <p className="font-bold text-sm text-stone-800">
                      {customers.length === 0 ? 'No Customer Accounts Yet' : 'No Matching Billing Records'}
                    </p>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                      {customers.length === 0
                        ? 'Add customers to start generating automated monthly tiffin balance sheets and invoices.'
                        : 'Try adjusting your search or payment filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => {
                const customerObj = customers.find((c) => c.id === s.customerId);
                const isPaid = s.dueAmount <= 0;

                return (
                  <tr
                    key={s.customerId}
                    className="hover:bg-amber-50/20 transition-colors"
                  >
                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => customerObj && onOpenCustomerCalendar(customerObj)}
                        className="font-bold text-stone-900 hover:text-amber-600 text-left block transition-colors"
                      >
                        {s.customerName}
                      </button>
                      <span className="text-[11px] text-stone-500 block">{s.phone} • {s.area}</span>
                    </td>

                    {/* Plan */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-stone-800">
                        {s.planType === 'per_tiffin' ? `₹${s.ratePerTiffin}/tiffin` : `₹${s.monthlyFixedRate} Fix`}
                      </span>
                    </td>

                    {/* Counts */}
                    <td className="px-3 py-3.5 text-center font-bold text-emerald-700">
                      {s.lunchDelivered}
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold text-indigo-700">
                      {s.dinnerDelivered}
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold text-amber-700">
                      {s.extraTiffins > 0 ? `+${s.extraTiffins}` : '0'}
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold text-rose-700">
                      {s.skippedDays}
                    </td>

                    {/* Total Tiffins Highlighted */}
                    <td className="px-4 py-3.5 text-center font-black text-sm bg-amber-500/10 text-amber-950">
                      {s.totalTiffins}
                    </td>

                    {/* Financials */}
                    <td className="px-3 py-3.5 text-right font-bold text-stone-900 whitespace-nowrap">
                      {formatCurrency(s.calculatedAmount)}
                    </td>

                    <td className="px-3 py-3.5 text-right text-stone-600 whitespace-nowrap">
                      {formatCurrency(s.advancePaid)}
                    </td>

                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                      <span className={`font-black text-sm ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(s.dueAmount)}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Open Calendar button */}
                        <button
                          id={`monthly-open-cal-${s.customerId}`}
                          onClick={() => customerObj && onOpenCustomerCalendar(customerObj)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1"
                          title="Open Customer Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          <span>Calendar</span>
                        </button>

                        {/* Quick Message WhatsApp Modal Button */}
                        <button
                          id={`quick-msg-monthly-${s.customerId}`}
                          onClick={() => customerObj && onOpenQuickMessage(customerObj, 'monthly_invoice')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          title="Open WhatsApp Quick Message"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Quick Msg</span>
                        </button>

                        {/* WhatsApp Share / Copy Button */}
                        <button
                          id={`whatsapp-share-${s.customerId}`}
                          onClick={() => handleCopyWhatsApp(s)}
                          className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Copy WhatsApp Statement Message"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{copiedId === s.customerId ? 'Copied!' : 'Copy'}</span>
                        </button>

                        {/* Invoice View Modal */}
                        <button
                          onClick={() => customerObj && onViewInvoice(customerObj, currentYearMonth)}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                          title="View Official Invoice Modal"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Direct PDF Download */}
                        <button
                          id={`download-pdf-${s.customerId}`}
                          onClick={() => {
                            if (!customerObj) return;
                            const custAttendance = attendance[customerObj.id] || {};
                            downloadSingleInvoicePDF(
                              customerObj,
                              s,
                              `${monthName} ${yearNum}`,
                              custAttendance,
                              currentYearMonth
                            );
                          }}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 border border-stone-200 text-amber-700 transition-colors"
                          title="Download PDF Statement"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Record Payment */}
                        {!isPaid && (
                          <button
                            onClick={() => onRecordPayment(s.customerId, s.advancePaid + s.dueAmount)}
                            className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] font-semibold"
                            title="Mark as fully paid"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
