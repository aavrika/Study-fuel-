import React, { useState, useMemo } from 'react';
import { Customer, AttendanceStore, DayAttendance, DayMealStatus } from '../types';
import { TODAY_STR } from '../data/initialData';
import {
  findCustomerByPhone,
  saveStoredLoggedInCustomerPhone,
  formatCurrency,
  generateWhatsAppBillMessage,
  calculateMonthlySummaries
} from '../lib/storage';
import { downloadSingleInvoicePDF } from '../lib/pdfGenerator';
import {
  Phone,
  User,
  MapPin,
  Calendar,
  LogOut,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Coffee,
  Sun,
  Moon,
  Utensils,
  ArrowRight,
  Download
} from 'lucide-react';

interface CustomerPortalProps {
  customers: Customer[];
  attendance: AttendanceStore;
  loggedInCustomer: Customer | null;
  onLogin: (customer: Customer) => void;
  onLogout: () => void;
  onUpdateDayAttendance: (
    customerId: string,
    dateStr: string,
    updated: Partial<DayAttendance>
  ) => void;
  onSwitchToAdmin: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  customers,
  attendance,
  loggedInCustomer,
  onLogin,
  onLogout,
  onUpdateDayAttendance,
  onSwitchToAdmin
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calendar State for the customer
  const todayParts = TODAY_STR.split('-');
  const [currentYear, setCurrentYear] = useState(() => todayParts[0] ? parseInt(todayParts[0], 10) : new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => todayParts[1] ? parseInt(todayParts[1], 10) - 1 : new Date().getMonth());
  const [activeDateStr, setActiveDateStr] = useState(TODAY_STR);
  const [showUpiModal, setShowUpiModal] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYearMonth = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phoneInput.trim()) {
      setErrorMessage('Please enter your mobile phone number.');
      return;
    }

    const matchedCustomer = findCustomerByPhone(phoneInput, customers);

    if (!matchedCustomer) {
      setErrorMessage(
        '❌ Incorrect Number! This phone number does not match any registered customer profile. Please enter the exact number added by the owner.'
      );
      return;
    }

    // Success login
    saveStoredLoggedInCustomerPhone(matchedCustomer.phone);
    onLogin(matchedCustomer);
  };

  const handleQuickPickCustomer = (cust: Customer) => {
    setPhoneInput(cust.phone);
    setErrorMessage(null);
    saveStoredLoggedInCustomerPhone(cust.phone);
    onLogin(cust);
  };

  // Monthly stats for the logged-in customer
  const custAttendance = loggedInCustomer ? attendance[loggedInCustomer.id] || {} : {};

  const {
    breakfastCount,
    breakfastAmount,
    lunchCount,
    dinnerCount,
    extraCount,
    totalDeliveredTiffins,
    totalMealsDelivered,
    skippedCount,
    totalActiveDays,
    calculatedAmount,
    dueAmount
  } = useMemo(() => {
    if (!loggedInCustomer) {
      return {
        breakfastCount: 0,
        breakfastAmount: 0,
        lunchCount: 0,
        dinnerCount: 0,
        extraCount: 0,
        totalDeliveredTiffins: 0,
        totalMealsDelivered: 0,
        skippedCount: 0,
        totalActiveDays: 0,
        calculatedAmount: 0,
        dueAmount: 0
      };
    }

    let bCount = 0;
    let lCount = 0;
    let dCount = 0;
    let extCount = 0;
    let skipCount = 0;
    let activeDays = 0;

    const bRate = loggedInCustomer.breakfastRate ?? 50;

    Object.entries(custAttendance).forEach(([dStr, rec]: [string, DayAttendance]) => {
      if (!dStr.startsWith(currentYearMonth)) return;

      const servedB = rec.breakfast === 'delivered';
      const servedL = rec.lunch === 'delivered';
      const servedD = rec.dinner === 'delivered';
      const hasExt = (rec.extraTiffins || 0) > 0;
      const isSkip = rec.lunch === 'skipped' || rec.dinner === 'skipped' || rec.breakfast === 'skipped';

      if (servedB) bCount++;
      if (servedL) lCount++;
      if (servedD) dCount++;
      if (hasExt) extCount += rec.extraTiffins;

      if (servedB || servedL || servedD || hasExt) activeDays++;
      if (isSkip && !servedL && !servedD && !servedB) skipCount++;
    });

    const totTiffins = lCount + dCount + extCount;
    const bAmt = bCount * bRate;

    let calcAmt = 0;
    if (loggedInCustomer.planType === 'per_tiffin') {
      calcAmt = totTiffins * loggedInCustomer.ratePerTiffin + bAmt;
    } else {
      calcAmt = loggedInCustomer.monthlyFixedRate + (extCount * loggedInCustomer.ratePerTiffin) + bAmt;
    }

    const netDue = Math.max(0, calcAmt - (loggedInCustomer.advancePaid || 0));

    return {
      breakfastCount: bCount,
      breakfastAmount: bAmt,
      lunchCount: lCount,
      dinnerCount: dCount,
      extraCount: extCount,
      totalDeliveredTiffins: totTiffins,
      totalMealsDelivered: totTiffins + bCount,
      skippedCount: skipCount,
      totalActiveDays: activeDays,
      calculatedAmount: calcAmt,
      dueAmount: netDue
    };
  }, [custAttendance, currentYearMonth, loggedInCustomer]);

  // If customer is NOT logged in, show Login Screen
  if (!loggedInCustomer) {
    return (
      <div className="max-w-xl mx-auto my-8 p-4">
        {/* Back to Admin Switcher */}
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={onSwitchToAdmin}
            className="text-xs text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs"
          >
            ← Back to Owner / Admin Mode
          </button>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
            Customer Self-Service
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-stone-900 text-white p-6 sm:p-8 text-center relative">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-3xl mx-auto mb-3 shadow-lg shadow-amber-500/20">
              🍱
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Customer Portal Login</h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-md mx-auto">
              Mark your meals (Breakfast, Lunch, Dinner, or Skip/Leave) and review your monthly statement.
            </p>
          </div>

          {/* Login Form */}
          <div className="p-6 sm:p-8 space-y-6">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                  <span>Enter Registered Phone Number *</span>
                  <span className="text-[11px] text-stone-500 font-normal">Only 10-digit number</span>
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="customer-phone-input"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full text-sm pl-11 pr-4 py-3 bg-stone-50 rounded-2xl border-2 border-stone-200 focus:outline-none focus:border-amber-500 text-stone-900 font-bold"
                  />
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                id="submit-customer-login-btn"
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Login & Open My Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Pick for registered customers */}
            {customers.length > 0 ? (
              <div className="pt-4 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-500 block mb-2 uppercase tracking-wider">
                  Registered Customers (Click to test login):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customers.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleQuickPickCustomer(c)}
                      className="p-2 text-left rounded-xl bg-stone-50 hover:bg-amber-50 hover:border-amber-300 border border-stone-200 transition-all text-xs"
                    >
                      <div className="font-bold text-stone-900 truncate">{c.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{c.phone}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-stone-100 text-center text-xs text-stone-400">
                <span>No registered customer profiles found. Add customers in Admin mode first.</span>
              </div>
            )}

            <div className="text-center text-[11px] text-stone-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Only profiles registered by the tiffin owner can log in.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active day record for the logged-in customer
  const activeDayRecord: DayAttendance = custAttendance[activeDateStr] || {
    date: activeDateStr,
    breakfast: 'none',
    lunch: 'none',
    dinner: 'none',
    extraTiffins: 0,
    notes: ''
  };

  // Handlers for customer self-marking
  const handleBreakfastToggle = (status: DayMealStatus) => {
    onUpdateDayAttendance(loggedInCustomer.id, activeDateStr, {
      ...activeDayRecord,
      breakfast: status,
      deliveryTimeBreakfast: status === 'delivered' ? '08:15 AM' : undefined
    });
  };

  const handleLunchToggle = (status: DayMealStatus) => {
    onUpdateDayAttendance(loggedInCustomer.id, activeDateStr, {
      ...activeDayRecord,
      lunch: status,
      deliveryTimeLunch: status === 'delivered' ? '01:00 PM' : undefined
    });
  };

  const handleDinnerToggle = (status: DayMealStatus) => {
    onUpdateDayAttendance(loggedInCustomer.id, activeDateStr, {
      ...activeDayRecord,
      dinner: status,
      deliveryTimeDinner: status === 'delivered' ? '08:30 PM' : undefined
    });
  };

  const handleExtraTiffins = (delta: number) => {
    const current = activeDayRecord.extraTiffins || 0;
    const nextVal = Math.max(0, current + delta);
    onUpdateDayAttendance(loggedInCustomer.id, activeDateStr, {
      ...activeDayRecord,
      extraTiffins: nextVal
    });
  };

  const handleNotesChange = (notes: string) => {
    onUpdateDayAttendance(loggedInCustomer.id, activeDateStr, {
      ...activeDayRecord,
      notes
    });
  };

  // Days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = (firstDayWeekday + 6) % 7;

  // Active day's total delivered tiffins
  const activeDayDeliveredTotal =
    (activeDayRecord.lunch === 'delivered' ? 1 : 0) +
    (activeDayRecord.dinner === 'delivered' ? 1 : 0) +
    (activeDayRecord.extraTiffins || 0);

  return (
    <div className="space-y-6">
      
      {/* Customer Header Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-stone-800 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-2xl shadow-md">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{loggedInCustomer.name}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500 text-stone-950">
                  Customer Portal
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-stone-800 text-emerald-400 border border-stone-700">
                  {loggedInCustomer.phone}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-stone-800 text-amber-300 border border-stone-700">
                  {loggedInCustomer.mealPreference}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>📍 {loggedInCustomer.address}, {loggedInCustomer.area}</span>
                <span>•</span>
                <span>🛵 Delivery Rider: {loggedInCustomer.assignedRider}</span>
                <span>•</span>
                <span>
                  Plan: {loggedInCustomer.scheduleSlot === 'both' ? '☀️ Lunch + 🌙 Dinner' : loggedInCustomer.scheduleSlot === 'lunch_only' ? '☀️ Lunch Only' : '🌙 Dinner Only'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap">
            <button
              id="customer-download-pdf-btn"
              onClick={() => {
                if (!loggedInCustomer) return;
                const summaries = calculateMonthlySummaries(currentYearMonth, [loggedInCustomer], attendance);
                if (summaries[0]) {
                  downloadSingleInvoicePDF(
                    loggedInCustomer,
                    summaries[0],
                    `${monthNames[currentMonth]} ${currentYear}`,
                    custAttendance,
                    currentYearMonth
                  );
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-xs"
              title="Download official PDF invoice and statement"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Bill</span>
            </button>
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all"
            >
              👑 Owner Mode
            </button>
            <button
              id="customer-logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold border border-rose-500/30 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Real-time Month Account Summary Bar */}
        <div className="mt-5 pt-4 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Tiffins</span>
            <span className="text-xl font-black text-amber-400">{totalDeliveredTiffins}</span>
          </div>

          <div className="bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">🥪 Breakfast (₹50)</span>
            <span className="text-xl font-black text-amber-400">{breakfastCount}</span>
          </div>

          <div className="bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">☀️ Lunch</span>
            <span className="text-xl font-black text-emerald-400">{lunchCount}</span>
          </div>

          <div className="bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block">🌙 Dinner</span>
            <span className="text-xl font-black text-indigo-400">{dinnerCount}</span>
          </div>

          <div className="bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] uppercase font-bold text-rose-400 block">❌ Skips / Leaves</span>
            <span className="text-xl font-black text-rose-400">{skippedCount}</span>
          </div>

          <div className="bg-amber-500 text-stone-950 p-3 rounded-2xl font-bold shadow-sm">
            <span className="text-[10px] uppercase block tracking-wider text-stone-900/80">Net Balance Due</span>
            <span className="text-xl font-black">{formatCurrency(dueAmount)}</span>
          </div>
        </div>
      </div>

      {/* Smart Calendar & Self-Marking Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Smart Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col">
          
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-stone-700" />
              </button>
              <h2 className="text-base font-black text-stone-900 tracking-tight min-w-36 text-center">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-stone-700" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-stone-600 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 🥪 Breakfast (₹50)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ☀️ Lunch
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> 🌙 Dinner
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> ❌ Skip
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-500 mb-3">
            👇 <strong>Click any date</strong> to mark your Breakfast, Lunch, Dinner, or record a Skip / Leave:
          </p>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-stone-500 mb-2">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div className="text-amber-700">Sat</div>
            <div className="text-rose-700">Sun</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`cust-off-${i}`} className="min-h-20 rounded-2xl bg-stone-50/50" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayPad = dayNum.toString().padStart(2, '0');
              const dateStr = `${currentYearMonth}-${dayPad}`;
              const record = custAttendance[dateStr];
              
              const isToday = dateStr === TODAY_STR;
              const isSelected = dateStr === activeDateStr;

              const breakfastDelivered = record?.breakfast === 'delivered';
              const lunchDelivered = record?.lunch === 'delivered';
              const dinnerDelivered = record?.dinner === 'delivered';
              const hasExtra = (record?.extraTiffins || 0) > 0;
              
              const dayTiffinsDelivered = 
                (lunchDelivered ? 1 : 0) + 
                (dinnerDelivered ? 1 : 0) + 
                (record?.extraTiffins || 0);

              const hasAnyDelivered = dayTiffinsDelivered > 0 || breakfastDelivered;

              return (
                <button
                  key={dateStr}
                  id={`cust-portal-day-${dateStr}`}
                  onClick={() => setActiveDateStr(dateStr)}
                  className={`min-h-24 rounded-2xl p-2 text-left border-2 transition-all flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/60 shadow-sm'
                      : isToday
                      ? 'border-amber-400 bg-amber-50/30'
                      : hasAnyDelivered
                      ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400'
                      : 'border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black ${isToday ? 'text-amber-700' : 'text-stone-800'}`}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-amber-500 text-stone-950 rounded">
                        Today
                      </span>
                    )}
                    {hasExtra && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1 rounded">
                        +{record?.extraTiffins}
                      </span>
                    )}
                  </div>

                  {/* Meal Badges in cell */}
                  <div className="flex flex-col gap-0.5 mt-1 w-full">
                    {record && (
                      <>
                        {record.breakfast && record.breakfast !== 'none' && (
                          <div className={`text-[9px] px-1 py-0.2 rounded font-bold flex items-center justify-between ${
                            record.breakfast === 'delivered'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            <span>🥪 B (₹50)</span>
                            <span>{record.breakfast === 'delivered' ? '✓' : '✗'}</span>
                          </div>
                        )}

                        {record.lunch !== 'none' && (
                          <div className={`text-[9px] px-1 py-0.2 rounded font-semibold flex items-center justify-between ${
                            record.lunch === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            <span>☀️ L</span>
                            <span>{record.lunch === 'delivered' ? '✓' : '✗'}</span>
                          </div>
                        )}

                        {record.dinner !== 'none' && (
                          <div className={`text-[9px] px-1 py-0.2 rounded font-semibold flex items-center justify-between ${
                            record.dinner === 'delivered'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            <span>🌙 D</span>
                            <span>{record.dinner === 'delivered' ? '✓' : '✗'}</span>
                          </div>
                        )}

                        {record.breakfast === 'none' && record.lunch === 'none' && record.dinner === 'none' && !hasExtra && (
                          <span className="text-[9px] text-stone-400 italic">No meal</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Daily Total Tiffins Delivered */}
                  <div className="mt-1 pt-1 border-t border-stone-200/60 flex items-center justify-between">
                    {dayTiffinsDelivered > 0 ? (
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                        {dayTiffinsDelivered} {dayTiffinsDelivered === 1 ? 'tiffin' : 'tiffins'}
                      </span>
                    ) : (
                      <span className="text-[8px] text-stone-400">0 tiffins</span>
                    )}
                    {breakfastDelivered && (
                      <span className="text-[8px] font-bold text-amber-700">+BF</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Inspector & Interactive Marking (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[11px] uppercase font-bold text-stone-500 block">Marking for Date</span>
                <h3 className="text-lg font-black text-stone-900">{activeDateStr}</h3>
              </div>
              {activeDateStr === TODAY_STR && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-stone-950">
                  Today
                </span>
              )}
            </div>

            {/* Daily Total Tiffins Delivered Indicator */}
            <div className="mt-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Total Delivered for this Day
                </span>
                <span className="text-base font-black text-emerald-950">
                  {activeDayDeliveredTotal} {activeDayDeliveredTotal === 1 ? 'Tiffin' : 'Tiffins'} Delivered
                </span>
              </div>
              {activeDayRecord.breakfast === 'delivered' && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-200 text-amber-900 font-bold text-xs">
                  + 1 Breakfast (₹50)
                </span>
              )}
            </div>

            {/* Breakfast Option (Fix Price 50) */}
            <div className="mt-4 p-3 bg-amber-50/70 rounded-2xl border border-amber-200">
              <label className="block text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-700" />
                  <span>🥪 Breakfast (Fix ₹50)</span>
                </span>
                <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                  ₹50 / breakfast
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  id="cust-mark-bf-delivered"
                  onClick={() => handleBreakfastToggle('delivered')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                    activeDayRecord.breakfast === 'delivered'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-amber-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Take (Deliver)</span>
                </button>
                <button
                  id="cust-mark-bf-skipped"
                  onClick={() => handleBreakfastToggle('skipped')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                    activeDayRecord.breakfast === 'skipped'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Skip / Leave</span>
                </button>
                <button
                  id="cust-mark-bf-none"
                  onClick={() => handleBreakfastToggle('none')}
                  className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
                    !activeDayRecord.breakfast || activeDayRecord.breakfast === 'none'
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Lunch Slot Marking */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-emerald-600" />
                  <span>☀️ Lunch Tiffin</span>
                </span>
                {activeDayRecord.deliveryTimeLunch && (
                  <span className="text-[10px] text-emerald-600 font-bold">
                    Delivered {activeDayRecord.deliveryTimeLunch}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  id="cust-mark-lunch-delivered"
                  onClick={() => handleLunchToggle('delivered')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                    activeDayRecord.lunch === 'delivered'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Take (Deliver)</span>
                </button>
                <button
                  id="cust-mark-lunch-skipped"
                  onClick={() => handleLunchToggle('skipped')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                    activeDayRecord.lunch === 'skipped'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Skip / Leave</span>
                </button>
                <button
                  id="cust-mark-lunch-none"
                  onClick={() => handleLunchToggle('none')}
                  className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
                    activeDayRecord.lunch === 'none'
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Dinner Slot Marking */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>🌙 Dinner Tiffin</span>
                </span>
                {activeDayRecord.deliveryTimeDinner && (
                  <span className="text-[10px] text-indigo-600 font-bold">
                    Delivered {activeDayRecord.deliveryTimeDinner}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  id="cust-mark-dinner-delivered"
                  onClick={() => handleDinnerToggle('delivered')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                    activeDayRecord.dinner === 'delivered'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-indigo-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Take (Deliver)</span>
                </button>
                <button
                  id="cust-mark-dinner-skipped"
                  onClick={() => handleDinnerToggle('skipped')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                    activeDayRecord.dinner === 'skipped'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Skip / Leave</span>
                </button>
                <button
                  id="cust-mark-dinner-none"
                  onClick={() => handleDinnerToggle('none')}
                  className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
                    activeDayRecord.dinner === 'none'
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Extra Guest Tiffin Option */}
            <div className="mt-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <label className="block text-xs font-bold text-stone-800 mb-1">
                ⭐ Extra Guest Tiffins (For guests / friends)
              </label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500">Rate: ₹{loggedInCustomer.ratePerTiffin}/extra</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExtraTiffins(-1)}
                    disabled={(activeDayRecord.extraTiffins || 0) <= 0}
                    className="w-7 h-7 rounded-lg bg-white border border-stone-300 disabled:opacity-30 flex items-center justify-center text-stone-800 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-stone-900">
                    {activeDayRecord.extraTiffins || 0}
                  </span>
                  <button
                    onClick={() => handleExtraTiffins(1)}
                    className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-stone-950 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Note / Instruction to kitchen */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Note for Kitchen (e.g. Traveling, Extra Rice, Spicy)
              </label>
              <input
                type="text"
                placeholder="e.g. Out of town tomorrow, less spicy, extra rotis..."
                value={activeDayRecord.notes || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 text-stone-800"
              />
            </div>
          </div>

          {/* Bottom Actions: Pay via UPI & WhatsApp Owner */}
          <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col gap-2">
            <button
              onClick={() => setShowUpiModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all active:scale-98"
            >
              <QrCode className="w-4 h-4" />
              <span>Pay Bill via UPI (GPay / PhonePe / Paytm)</span>
            </button>

            <a
              href={`https://wa.me/919876511223?text=${encodeURIComponent(
                `Hello! I am ${loggedInCustomer.name} (${loggedInCustomer.phone}). I have a query regarding my tiffin service.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all text-center"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Chat with Tiffin Owner on WhatsApp</span>
            </a>
          </div>

        </div>

      </div>

      {/* UPI Payment Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-stone-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-2xl mx-auto mb-3">
              💳
            </div>
            <h3 className="text-lg font-black text-stone-900">Pay Tiffin Bill via UPI</h3>
            <p className="text-xs text-stone-500 mt-1">Scan or pay to registered kitchen UPI</p>

            <div className="my-4 p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Customer:</span>
                <span className="font-bold text-stone-800">{loggedInCustomer.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Amount Due:</span>
                <span className="font-black text-emerald-700 text-base">{formatCurrency(dueAmount)}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 text-xs">
                <span className="text-stone-500 block mb-1">UPI ID:</span>
                <span className="font-mono font-bold bg-white px-3 py-1 rounded-lg border border-stone-300 inline-block text-stone-900 select-all">
                  9876511223@upi
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-400 mb-4">
              Supported: Google Pay, PhonePe, Paytm, BHIM UPI
            </p>

            <button
              onClick={() => setShowUpiModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
