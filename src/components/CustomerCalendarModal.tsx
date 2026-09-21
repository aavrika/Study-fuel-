import React, { useState, useMemo } from 'react';
import { Customer, CustomerAttendanceMap, DayAttendance, DayMealStatus } from '../types';
import { TODAY_STR } from '../data/initialData';
import { formatCurrency, generateWhatsAppBillMessage } from '../lib/storage';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Calendar,
  Share2,
  Printer,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  MessageCircle,
  Coffee,
  Sun,
  Moon,
  Utensils,
  Zap
} from 'lucide-react';
import { MessageTemplateType } from '../lib/whatsapp';
import { sounds } from '../lib/soundEffects';
import { logActivity } from '../lib/automationEngine';

interface CustomerCalendarModalProps {
  customer: Customer;
  attendanceMap: CustomerAttendanceMap;
  onClose: () => void;
  onUpdateDayAttendance: (
    customerId: string,
    dateStr: string,
    updated: Partial<DayAttendance>
  ) => void;
  onViewInvoice: (customer: Customer, yearMonth: string) => void;
  onOpenQuickMessage: (
    customer: Customer,
    template?: MessageTemplateType,
    slot?: 'lunch' | 'dinner',
    dateStr?: string
  ) => void;
  isCustomerSelfService?: boolean;
}

export const CustomerCalendarModal: React.FC<CustomerCalendarModalProps> = ({
  customer,
  attendanceMap,
  onClose,
  onUpdateDayAttendance,
  onViewInvoice,
  onOpenQuickMessage,
  isCustomerSelfService = false
}) => {
  // Dynamic initial year, month & active date from today's real date
  const todayParts = TODAY_STR.split('-');
  const initialYear = todayParts[0] ? parseInt(todayParts[0], 10) : new Date().getFullYear();
  const initialMonth = todayParts[1] ? parseInt(todayParts[1], 10) - 1 : new Date().getMonth();

  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [activeDateStr, setActiveDateStr] = useState<string>(TODAY_STR);
  const [quickDateModalOpen, setQuickDateModalOpen] = useState<boolean>(false);
  const [quickSavedNotice, setQuickSavedNotice] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYearMonth = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

  // Month navigation - provides clean, fresh calendar for any month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const parts = TODAY_STR.split('-');
    const tYear = parts[0] ? parseInt(parts[0], 10) : new Date().getFullYear();
    const tMonth = parts[1] ? parseInt(parts[1], 10) - 1 : new Date().getMonth();
    setCurrentYear(tYear);
    setCurrentMonth(tMonth);
    setActiveDateStr(TODAY_STR);
    setQuickDateModalOpen(true);
  };

  const handleNavigateActiveDay = (deltaDays: number) => {
    try {
      const [y, m, d] = activeDateStr.split('-').map(Number);
      const curDate = new Date(y, m - 1, d);
      curDate.setDate(curDate.getDate() + deltaDays);
      const newY = curDate.getFullYear();
      const newM = curDate.getMonth();
      const newD = String(curDate.getDate()).padStart(2, '0');
      const newDateStr = `${newY}-${String(newM + 1).padStart(2, '0')}-${newD}`;
      setCurrentYear(newY);
      setCurrentMonth(newM);
      setActiveDateStr(newDateStr);
    } catch {
      // ignore
    }
  };

  const formatDateReadable = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      return dObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dStr;
    }
  };

  // Days in selected month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay();
  // Monday is 0 for our UI layout
  const startOffset = (firstDayWeekday + 6) % 7;

  // Active day record
  const activeDayRecord: DayAttendance = attendanceMap[activeDateStr] || {
    date: activeDateStr,
    breakfast: 'none',
    lunch: 'none',
    dinner: 'none',
    extraTiffins: 0,
    notes: ''
  };

  // Aggregate monthly stats for this customer
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
    estimatedAmount,
    dueAmount
  } = useMemo(() => {
    let bCount = 0;
    let lCount = 0;
    let dCount = 0;
    let extCount = 0;
    let skipCount = 0;
    let activeDays = 0;

    const bRate = customer.breakfastRate ?? 50;

    Object.entries(attendanceMap).forEach(([dStr, rec]: [string, DayAttendance]) => {
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

    let estAmt = 0;
    if (customer.planType === 'per_tiffin') {
      estAmt = totTiffins * customer.ratePerTiffin + bAmt;
    } else {
      estAmt = customer.monthlyFixedRate + (extCount * customer.ratePerTiffin) + bAmt;
    }

    const netDue = Math.max(0, estAmt - (customer.advancePaid || 0));

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
      estimatedAmount: estAmt,
      dueAmount: netDue
    };
  }, [attendanceMap, currentYearMonth, customer]);

  // Handlers for active date meal statuses with instant saving & feedback
  const handleBreakfastToggle = (status: DayMealStatus, targetDate: string = activeDateStr) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const targetRecord: DayAttendance = attendanceMap[targetDate] || {
      date: targetDate,
      breakfast: 'none',
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };
    onUpdateDayAttendance(customer.id, targetDate, {
      ...targetRecord,
      breakfast: status,
      deliveryTimeBreakfast: status === 'delivered' ? timeStr : undefined
    });

    if (status === 'delivered') {
      sounds.playDeliveredChime();
      setQuickSavedNotice('🥪 Breakfast marked DELIVERED (₹50) & Saved!');
      logActivity(
        'delivery',
        `${customer.name} — Breakfast Delivered via Profile`,
        `Attendance updated for ${customer.name}`,
        customer.id,
        customer.name
      );
    } else if (status === 'skipped') {
      sounds.playNotificationPing();
      setQuickSavedNotice('🥪 Breakfast marked SKIPPED & Saved!');
    } else {
      sounds.playNotificationPing();
      setQuickSavedNotice('🥪 Breakfast set to OFF / None & Saved!');
    }
    setTimeout(() => setQuickSavedNotice(null), 3000);
  };

  const handleLunchToggle = (status: DayMealStatus, targetDate: string = activeDateStr) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const targetRecord: DayAttendance = attendanceMap[targetDate] || {
      date: targetDate,
      breakfast: 'none',
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };
    onUpdateDayAttendance(customer.id, targetDate, {
      ...targetRecord,
      lunch: status,
      deliveryTimeLunch: status === 'delivered' ? timeStr : undefined
    });

    if (status === 'delivered') {
      sounds.playDeliveredChime();
      setQuickSavedNotice('☀️ Lunch marked DELIVERED & Saved!');
      logActivity(
        'delivery',
        `${customer.name} — Lunch Delivered via Profile`,
        `Attendance updated for ${customer.name}`,
        customer.id,
        customer.name
      );
    } else if (status === 'skipped') {
      sounds.playNotificationPing();
      setQuickSavedNotice('☀️ Lunch marked SKIPPED & Saved!');
    } else {
      sounds.playNotificationPing();
      setQuickSavedNotice('☀️ Lunch set to OFF / None & Saved!');
    }
    setTimeout(() => setQuickSavedNotice(null), 3000);
  };

  const handleDinnerToggle = (status: DayMealStatus, targetDate: string = activeDateStr) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const targetRecord: DayAttendance = attendanceMap[targetDate] || {
      date: targetDate,
      breakfast: 'none',
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };
    onUpdateDayAttendance(customer.id, targetDate, {
      ...targetRecord,
      dinner: status,
      deliveryTimeDinner: status === 'delivered' ? timeStr : undefined
    });

    if (status === 'delivered') {
      sounds.playDeliveredChime();
      setQuickSavedNotice('🌙 Dinner marked DELIVERED & Saved!');
      logActivity(
        'delivery',
        `${customer.name} — Dinner Delivered via Profile`,
        `Attendance updated for ${customer.name}`,
        customer.id,
        customer.name
      );
    } else if (status === 'skipped') {
      sounds.playNotificationPing();
      setQuickSavedNotice('🌙 Dinner marked SKIPPED & Saved!');
    } else {
      sounds.playNotificationPing();
      setQuickSavedNotice('🌙 Dinner set to OFF / None & Saved!');
    }
    setTimeout(() => setQuickSavedNotice(null), 3000);
  };

  // Row 4 Fast One-Click Actions
  const handleFullDaySkip = (targetDate: string = activeDateStr) => {
    const targetRecord: DayAttendance = attendanceMap[targetDate] || {
      date: targetDate,
      breakfast: 'none',
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };
    onUpdateDayAttendance(customer.id, targetDate, {
      ...targetRecord,
      lunch: 'skipped',
      dinner: 'skipped'
    });
    sounds.playNotificationPing();
    setQuickSavedNotice('🚫 Full Day (Lunch + Dinner) SKIPPED & Saved!');
    setTimeout(() => setQuickSavedNotice(null), 3000);
  };

  const handleDeliverBoth = (targetDate: string = activeDateStr) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const targetRecord: DayAttendance = attendanceMap[targetDate] || {
      date: targetDate,
      breakfast: 'none',
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };
    onUpdateDayAttendance(customer.id, targetDate, {
      ...targetRecord,
      lunch: 'delivered',
      deliveryTimeLunch: timeStr,
      dinner: 'delivered',
      deliveryTimeDinner: timeStr
    });
    sounds.playDeliveredChime();
    setQuickSavedNotice('✅ Lunch & Dinner DELIVERED & Saved!');
    setTimeout(() => setQuickSavedNotice(null), 3000);
  };

  const handleResetDay = (targetDate: string = activeDateStr) => {
    const targetRecord: DayAttendance = attendanceMap[targetDate] || {
      date: targetDate,
      breakfast: 'none',
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };
    onUpdateDayAttendance(customer.id, targetDate, {
      ...targetRecord,
      breakfast: 'none',
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0
    });
    sounds.playNotificationPing();
    setQuickSavedNotice('🔄 Date cleared & reset to OFF!');
    setTimeout(() => setQuickSavedNotice(null), 3000);
  };

  const handleExtraTiffins = (delta: number) => {
    const current = activeDayRecord.extraTiffins || 0;
    const nextVal = Math.max(0, current + delta);
    onUpdateDayAttendance(customer.id, activeDateStr, {
      ...activeDayRecord,
      extraTiffins: nextVal
    });
  };

  const handleNotesChange = (notes: string) => {
    onUpdateDayAttendance(customer.id, activeDateStr, {
      ...activeDayRecord,
      notes
    });
  };

  // Quick WhatsApp message copy
  const handleCopyWhatsApp = () => {
    const msg = generateWhatsAppBillMessage(
      {
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        area: customer.area,
        planType: customer.planType,
        ratePerTiffin: customer.ratePerTiffin,
        breakfastRate: customer.breakfastRate ?? 50,
        monthlyFixedRate: customer.monthlyFixedRate,
        breakfastDelivered: breakfastCount,
        breakfastAmount: breakfastAmount,
        lunchDelivered: lunchCount,
        dinnerDelivered: dinnerCount,
        extraTiffins: extraCount,
        totalTiffins: totalDeliveredTiffins,
        totalMealsDelivered: totalMealsDelivered,
        totalDaysServed: totalActiveDays,
        skippedDays: skippedCount,
        calculatedAmount: estimatedAmount,
        advancePaid: customer.advancePaid,
        dueAmount,
        paymentStatus: dueAmount === 0 ? 'paid' : customer.advancePaid > 0 ? 'partial' : 'pending'
      },
      `${monthNames[currentMonth]} ${currentYear}`
    );

    navigator.clipboard.writeText(msg);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // Active day's total delivered tiffins
  const activeDayDeliveredTotal =
    (activeDayRecord.lunch === 'delivered' ? 1 : 0) +
    (activeDayRecord.dinner === 'delivered' ? 1 : 0) +
    (activeDayRecord.extraTiffins || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        id="customer-calendar-modal"
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[95vh]"
      >
        
        {/* Modal Top Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-start justify-between border-b border-stone-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-2xl">
              🍱
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white">{customer.name}</h2>
                {isCustomerSelfService && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-stone-950 font-black text-[10px] tracking-wider uppercase">
                    Self-Service Portal
                  </span>
                )}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-stone-800 text-stone-300 border border-stone-700">
                  {customer.phone}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  customer.mealPreference === 'veg'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : customer.mealPreference === 'jain'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {customer.mealPreference}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-stone-800 text-amber-300 border border-stone-700">
                  {customer.scheduleSlot === 'both' ? '☀️ Lunch + 🌙 Dinner' : customer.scheduleSlot === 'lunch_only' ? '☀️ Lunch Only' : '🌙 Dinner Only'}
                </span>
                {customer.includesBreakfast && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-600/30 text-amber-300 border border-amber-500/40">
                    🥪 Breakfast (₹{customer.breakfastRate ?? 50})
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-2">
                <span>📍 {customer.address}, {customer.area}</span>
                <span>•</span>
                <span>🛵 Rider: {customer.assignedRider}</span>
                <span>•</span>
                <span>Rate: ₹{customer.ratePerTiffin}/tiffin</span>
              </p>
            </div>
          </div>

          <button
            id="close-calendar-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Real-time Month Statistics Ribbon */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-base font-bold text-stone-900 tracking-tight min-w-36 text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleJumpToToday}
              className="ml-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-xs flex items-center gap-1"
              title="Jump to Today's date & open marker"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-stone-600 block">Total Tiffins</span>
              <span className="text-lg font-black text-amber-600">{totalDeliveredTiffins}</span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">🥪 Breakfast (₹50)</span>
              <span className="text-lg font-black text-amber-700">{breakfastCount}</span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">☀️ Lunch</span>
              <span className="text-lg font-black text-emerald-700">{lunchCount}</span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">🌙 Dinner</span>
              <span className="text-lg font-black text-indigo-700">{dinnerCount}</span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-stone-600 block">⭐ Extra</span>
              <span className="text-lg font-black text-stone-700">+{extraCount}</span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">❌ Skips</span>
              <span className="text-lg font-black text-rose-700">{skippedCount}</span>
            </div>

            <div className="bg-amber-500 text-stone-950 px-3.5 py-1.5 rounded-xl shadow-xs text-center font-bold">
              <span className="text-[10px] uppercase block tracking-wider text-stone-900/80">Month Bill</span>
              <span className="text-lg font-black">{formatCurrency(estimatedAmount)}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area: Smart Calendar Grid (Left) + Interactive Day Inspector (Right) */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          
          {/* Calendar Grid (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Smart Calendar (Click any date to mark/edit your tiffin)</span>
              </span>
              <div className="flex items-center gap-2.5 text-[11px] text-stone-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 🥪 Breakfast (₹50)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> ☀️ Lunch
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> 🌙 Dinner
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> ❌ Skip
                </span>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-stone-600 mb-1.5">
              <div className="py-1">Mon</div>
              <div className="py-1">Tue</div>
              <div className="py-1">Wed</div>
              <div className="py-1">Thu</div>
              <div className="py-1">Fri</div>
              <div className="py-1 text-amber-700">Sat</div>
              <div className="py-1 text-rose-700">Sun</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 flex-1">
              {/* Empty leading offsets */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`offset-${i}`} className="min-h-16 rounded-xl bg-stone-50/50 border border-transparent" />
              ))}

              {/* Real days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayPad = dayNum.toString().padStart(2, '0');
                const dateStr = `${currentYearMonth}-${dayPad}`;
                const record = attendanceMap[dateStr];
                
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
                    id={`cal-day-${dateStr}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveDateStr(dateStr);
                      setQuickDateModalOpen(true);
                    }}
                    title="Click date to open Lunch, Dinner, Breakfast & Skip options"
                    className={`min-h-24 rounded-xl p-1.5 text-left border transition-all flex flex-col justify-between relative group cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/60 shadow-sm'
                        : isToday
                        ? 'border-amber-400 bg-amber-50/30'
                        : hasAnyDelivered
                        ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400'
                        : 'border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50/80'
                    }`}
                  >
                    {/* Date Number and Today Tag */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-extrabold ${
                        isToday ? 'text-amber-700' : 'text-stone-800'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-amber-500 text-stone-950 rounded tracking-tight">
                          Today
                        </span>
                      )}
                      {hasExtra && (
                        <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1 rounded">
                          +{record?.extraTiffins}
                        </span>
                      )}
                    </div>

                    {/* Meal Badges in cell: Breakfast, Lunch, Dinner */}
                    <div className="flex flex-col gap-0.5 mt-1 w-full">
                      {record && (
                        <>
                          {/* Breakfast Badge */}
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

                          {/* Lunch Badge */}
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

                          {/* Dinner Badge */}
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
                            <span className="text-[9px] text-stone-400 italic">No meals</span>
                          )}
                        </>
                      )}
                      {!record && (
                        <span className="text-[9px] text-stone-400 italic">—</span>
                      )}
                    </div>

                    {/* Daily Total Tiffins Delivered Badge */}
                    <div className="mt-1 pt-1 border-t border-stone-200/60 flex items-center justify-between">
                      {dayTiffinsDelivered > 0 ? (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded">
                          {dayTiffinsDelivered} {dayTiffinsDelivered === 1 ? 'tiffin' : 'tiffins'}
                        </span>
                      ) : (
                        <span className="text-[8px] text-stone-400 font-medium">0 tiffins</span>
                      )}

                      {breakfastDelivered && (
                        <span className="text-[8px] font-bold text-amber-700">
                          +BF
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Inspector & Interactive Controls (4 cols on lg) */}
          <div className="lg:col-span-4 bg-stone-50 rounded-2xl p-5 border border-stone-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <span className="text-[11px] uppercase font-bold text-stone-500 block">Selected Date</span>
                  <h3 className="text-base font-extrabold text-stone-900">{activeDateStr}</h3>
                  <span className="text-xs text-stone-500 font-medium">{formatDateReadable(activeDateStr)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeDateStr === TODAY_STR && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                      Today
                    </span>
                  )}
                  <button
                    onClick={() => setQuickDateModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-900 hover:bg-stone-800 text-white shadow-xs"
                    title="Open full popup dialog"
                  >
                    Open Rows
                  </button>
                </div>
              </div>

              {/* Instant Saved Notification Banner */}
              {quickSavedNotice && (
                <div className="mt-2.5 py-2 px-3 bg-emerald-600 text-white rounded-xl text-xs font-black text-center shadow-xs animate-bounce">
                  ✓ {quickSavedNotice}
                </div>
              )}

              {/* Daily Total Delivered Tiffin Badge for this selected day */}
              <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Daily Total Delivered
                  </span>
                  <span className="text-sm font-black text-emerald-950">
                    {activeDayDeliveredTotal} {activeDayDeliveredTotal === 1 ? 'Tiffin' : 'Tiffins'} Delivered
                  </span>
                </div>
                {activeDayRecord.breakfast === 'delivered' && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold text-xs">
                    + 1 Breakfast (₹50)
                  </span>
                )}
              </div>

              {/* Separate WhatsApp Message Box */}
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-950 block">
                      WhatsApp Message
                    </span>
                    <span className="text-[10px] text-emerald-800">
                      Manual WhatsApp msg bhejne ke liye
                    </span>
                  </div>
                </div>
                <button
                  id="sidebar-send-whatsapp-btn"
                  onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', activeDayRecord.lunch === 'delivered' ? 'lunch' : 'dinner', activeDateStr)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Send WhatsApp confirmation message"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send Msg</span>
                </button>
              </div>

              {/* Row 1: Lunch Slot Marking */}
              <div className="mt-4 p-3 bg-white rounded-xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold">Row 1: ☀️ Lunch Tiffin</span>
                  </span>
                  {activeDayRecord.deliveryTimeLunch && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Delivered at {activeDayRecord.deliveryTimeLunch}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    id="mark-lunch-delivered"
                    onClick={() => handleLunchToggle('delivered')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                      activeDayRecord.lunch === 'delivered'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Deliver</span>
                  </button>
                  <button
                    id="mark-lunch-skipped"
                    onClick={() => handleLunchToggle('skipped')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                      activeDayRecord.lunch === 'skipped'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Skip</span>
                  </button>
                  <button
                    id="mark-lunch-none"
                    onClick={() => handleLunchToggle('none')}
                    className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
                      activeDayRecord.lunch === 'none'
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Off / None
                  </button>
                  <button
                    id="mark-lunch-msg"
                    onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', 'lunch', activeDateStr)}
                    className="py-2 px-1 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 transition-all"
                    title="Send WhatsApp message for Lunch"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Msg</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Dinner Slot Marking */}
              <div className="mt-3 p-3 bg-white rounded-xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="font-extrabold">Row 2: 🌙 Dinner Tiffin</span>
                  </span>
                  {activeDayRecord.deliveryTimeDinner && (
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                      Delivered at {activeDayRecord.deliveryTimeDinner}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    id="mark-dinner-delivered"
                    onClick={() => handleDinnerToggle('delivered')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                      activeDayRecord.dinner === 'delivered'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-indigo-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Deliver</span>
                  </button>
                  <button
                    id="mark-dinner-skipped"
                    onClick={() => handleDinnerToggle('skipped')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                      activeDayRecord.dinner === 'skipped'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Skip</span>
                  </button>
                  <button
                    id="mark-dinner-none"
                    onClick={() => handleDinnerToggle('none')}
                    className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
                      activeDayRecord.dinner === 'none'
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Off / None
                  </button>
                  <button
                    id="mark-dinner-msg"
                    onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', 'dinner', activeDateStr)}
                    className="py-2 px-1 text-xs font-bold rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 flex items-center justify-center gap-1 transition-all"
                    title="Send WhatsApp message for Dinner"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Msg</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Breakfast Slot Marking (Fix Price 50) */}
              <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                <label className="block text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-amber-700" />
                    <span className="font-extrabold">Row 3: 🥪 Breakfast (Fix ₹50)</span>
                  </span>
                  <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">
                    Fix Rate ₹50
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    id="mark-breakfast-delivered"
                    onClick={() => handleBreakfastToggle('delivered')}
                    className={`py-1.5 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                      activeDayRecord.breakfast === 'delivered'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-amber-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Deliver</span>
                  </button>
                  <button
                    id="mark-breakfast-skipped"
                    onClick={() => handleBreakfastToggle('skipped')}
                    className={`py-1.5 px-1 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                      activeDayRecord.breakfast === 'skipped'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Skip</span>
                  </button>
                  <button
                    id="mark-breakfast-none"
                    onClick={() => handleBreakfastToggle('none')}
                    className={`py-1.5 px-1 text-xs font-medium rounded-xl border transition-all ${
                      !activeDayRecord.breakfast || activeDayRecord.breakfast === 'none'
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    Off / None
                  </button>
                  <button
                    id="mark-breakfast-msg"
                    onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', 'lunch', activeDateStr)}
                    className="py-1.5 px-1 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center gap-1 transition-all"
                    title="Send WhatsApp message"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Msg</span>
                  </button>
                </div>
              </div>

              {/* Row 4: Skip & Fast Actions */}
              <div className="mt-3 p-3 bg-stone-100 rounded-xl border border-stone-300">
                <label className="block text-xs font-extrabold text-stone-800 mb-1.5">
                  Row 4: 🚫 Quick Skip & 1-Click Fast Actions
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleFullDaySkip()}
                    className="py-2 px-1 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 flex items-center justify-center gap-1 transition-all shadow-xs"
                    title="Skip both Lunch & Dinner for this day"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Skip All Day</span>
                  </button>
                  <button
                    onClick={() => handleDeliverBoth()}
                    className="py-2 px-1 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center gap-1 transition-all shadow-xs"
                    title="Mark both Lunch & Dinner delivered"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Deliver Both</span>
                  </button>
                  <button
                    onClick={() => handleResetDay()}
                    className="py-2 px-1 text-xs font-bold rounded-xl bg-stone-200 hover:bg-stone-300 border border-stone-300 text-stone-700 flex items-center justify-center gap-1 transition-all"
                    title="Reset meals to None/Off"
                  >
                    <span>Reset Day</span>
                  </button>
                </div>
              </div>

              {/* Extra Tiffins Counter */}
              <div className="mt-3 bg-white p-3 rounded-xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ⭐ Extra Guest Tiffins (For guests / friends)
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">Rate: ₹{customer.ratePerTiffin}/extra</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExtraTiffins(-1)}
                      disabled={(activeDayRecord.extraTiffins || 0) <= 0}
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 flex items-center justify-center text-stone-800 font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-extrabold text-sm text-stone-900">
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

              {/* Notes for this day */}
              <div className="mt-3">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Day Note (e.g. Leave reason, special instruction)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fasting, Out of town, Extra rotis..."
                  value={activeDayRecord.notes || ''}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-800"
                />
              </div>

              {/* Quick info reminder */}
              <div className="mt-3 p-2.5 rounded-xl bg-stone-100 border border-stone-200/80 text-[11px] text-stone-600 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Selecting a date and marking attendance instantly syncs daily tiffin counts and monthly billing!
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col gap-2">
              <button
                id="open-quick-msg-from-cal-btn"
                onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', 'lunch', activeDateStr)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Quick WhatsApp Message</span>
              </button>

              <button
                id="copy-whatsapp-bill-btn"
                onClick={handleCopyWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>{copiedSuccess ? '✓ Copied to Clipboard!' : 'Copy Monthly Bill Text'}</span>
              </button>

              <button
                id="view-invoice-modal-btn"
                onClick={() => onViewInvoice(customer, currentYearMonth)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-all"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>View Full Month Invoice</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Quick Date Marking 4-Row Modal Popup - Opens directly on clicking any calendar date */}
      {quickDateModalOpen && (
        <div 
          id="quick-date-marker-modal"
          className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQuickDateModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigateActiveDay(-1)}
                  className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      {formatDateReadable(activeDateStr)}
                    </h3>
                    {activeDateStr === TODAY_STR && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">{activeDateStr}</span>
                </div>
                <button
                  onClick={() => handleNavigateActiveDay(1)}
                  className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setQuickDateModalOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
              {/* Instant Saved Notice */}
              {quickSavedNotice && (
                <div className="py-2 px-3 bg-emerald-600 text-white rounded-xl text-xs font-black text-center shadow-xs animate-bounce">
                  ✓ {quickSavedNotice}
                </div>
              )}

              {/* Status overview pill */}
              <div className="p-2.5 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                <span className="text-stone-600 font-medium">Customer: <strong className="text-stone-900">{customer.name}</strong></span>
                <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {activeDayDeliveredTotal} Delivered {activeDayRecord.breakfast === 'delivered' ? '+ 1 BF' : ''}
                </span>
              </div>

              {/* ROW 1: Lunch Tiffin */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                    <Sun className="w-4 h-4 text-emerald-600" />
                    <span>Row 1: ☀️ Lunch Tiffin</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                    activeDayRecord.lunch === 'delivered'
                      ? 'bg-emerald-600 text-white'
                      : activeDayRecord.lunch === 'skipped'
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    {activeDayRecord.lunch}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleLunchToggle('delivered')}
                    className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all shadow-xs ${
                      activeDayRecord.lunch === 'delivered'
                        ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/50'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Delivered</span>
                  </button>
                  <button
                    onClick={() => handleLunchToggle('skipped')}
                    className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all shadow-xs ${
                      activeDayRecord.lunch === 'skipped'
                        ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/50'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Skip</span>
                  </button>
                  <button
                    onClick={() => handleLunchToggle('none')}
                    className={`py-2.5 px-1.5 text-xs font-medium rounded-xl border transition-all ${
                      activeDayRecord.lunch === 'none'
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    Off / None
                  </button>
                  <button
                    onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', 'lunch', activeDateStr)}
                    className="py-2.5 px-1.5 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 transition-all"
                    title="Send WhatsApp message for Lunch"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Msg</span>
                  </button>
                </div>
              </div>

              {/* ROW 2: Dinner Tiffin */}
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span>Row 2: 🌙 Dinner Tiffin</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                    activeDayRecord.dinner === 'delivered'
                      ? 'bg-indigo-600 text-white'
                      : activeDayRecord.dinner === 'skipped'
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    {activeDayRecord.dinner}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleDinnerToggle('delivered')}
                    className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all shadow-xs ${
                      activeDayRecord.dinner === 'delivered'
                        ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/50'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-indigo-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Delivered</span>
                  </button>
                  <button
                    onClick={() => handleDinnerToggle('skipped')}
                    className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all shadow-xs ${
                      activeDayRecord.dinner === 'skipped'
                        ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/50'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Skip</span>
                  </button>
                  <button
                    onClick={() => handleDinnerToggle('none')}
                    className={`py-2.5 px-1.5 text-xs font-medium rounded-xl border transition-all ${
                      activeDayRecord.dinner === 'none'
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    Off / None
                  </button>
                  <button
                    onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', 'dinner', activeDateStr)}
                    className="py-2.5 px-1.5 text-xs font-bold rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 flex items-center justify-center gap-1 transition-all"
                    title="Send WhatsApp message for Dinner"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Msg</span>
                  </button>
                </div>
              </div>

              {/* ROW 3: Breakfast (Fix ₹50) */}
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                    <Coffee className="w-4 h-4 text-amber-700" />
                    <span>Row 3: 🥪 Breakfast (Fix ₹50)</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                    activeDayRecord.breakfast === 'delivered'
                      ? 'bg-amber-600 text-white'
                      : activeDayRecord.breakfast === 'skipped'
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    {activeDayRecord.breakfast || 'none'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleBreakfastToggle('delivered')}
                    className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all shadow-xs ${
                      activeDayRecord.breakfast === 'delivered'
                        ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/50'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-amber-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Deliver (₹50)</span>
                  </button>
                  <button
                    onClick={() => handleBreakfastToggle('skipped')}
                    className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all shadow-xs ${
                      activeDayRecord.breakfast === 'skipped'
                        ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/50'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Skip</span>
                  </button>
                  <button
                    onClick={() => handleBreakfastToggle('none')}
                    className={`py-2.5 px-1.5 text-xs font-medium rounded-xl border transition-all ${
                      !activeDayRecord.breakfast || activeDayRecord.breakfast === 'none'
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    Off / None
                  </button>
                  <button
                    onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', 'lunch', activeDateStr)}
                    className="py-2.5 px-1.5 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center gap-1 transition-all"
                    title="Send WhatsApp message"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Msg</span>
                  </button>
                </div>
              </div>

              {/* ROW 4: Quick Skip & Fast Actions */}
              <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-stone-900">
                    Row 4: 🚫 Quick Skip & 1-Click Fast Actions
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">1-Click Auto Save</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleFullDaySkip()}
                    className="py-2.5 px-2 text-xs font-black rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Skip Full Day</span>
                  </button>
                  <button
                    onClick={() => handleDeliverBoth()}
                    className="py-2.5 px-2 text-xs font-black rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Deliver Both</span>
                  </button>
                  <button
                    onClick={() => handleResetDay()}
                    className="py-2.5 px-2 text-xs font-bold rounded-xl bg-stone-200 hover:bg-stone-300 border border-stone-300 text-stone-800 flex items-center justify-center gap-1 transition-all"
                  >
                    <span>Clear Day</span>
                  </button>
                </div>
              </div>

              {/* Extra Guest Tiffins & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">Extra Tiffins</span>
                    <span className="text-[10px] text-stone-500">Rate: ₹{customer.ratePerTiffin}/each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExtraTiffins(-1)}
                      disabled={(activeDayRecord.extraTiffins || 0) <= 0}
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 flex items-center justify-center text-stone-800 font-bold"
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

                <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                  <input
                    type="text"
                    placeholder="Day note (e.g. Leave, extra rotis)..."
                    value={activeDayRecord.notes || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-800"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigateActiveDay(-1)}
                  className="px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev Day</span>
                </button>
                <button
                  onClick={() => handleNavigateActiveDay(1)}
                  className="px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 flex items-center gap-1"
                >
                  <span>Next Day</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="modal-footer-whatsapp-btn"
                  onClick={() => onOpenQuickMessage(customer, 'delivery_confirmed', activeDayRecord.lunch === 'delivered' ? 'lunch' : 'dinner', activeDateStr)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Send WhatsApp confirmation message"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Msg</span>
                </button>
                <button
                  onClick={() => setQuickDateModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold shadow-sm transition-all"
                >
                  Done & Saved ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
