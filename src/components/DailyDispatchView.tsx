import React, { useState, useMemo } from 'react';
import {
  Customer,
  AttendanceStore,
  DayAttendance,
  MealPreference,
  ScheduleSlot,
  DayMealStatus
} from '../types';
import { MessageTemplateType } from '../lib/whatsapp';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Calendar,
  Filter,
  Search,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bike,
  Utensils,
  MessageCircle,
  TrendingUp,
  FileText,
  Zap,
  Building2,
  Send,
  Users
} from 'lucide-react';
import { DailyTiffinsTrendChart } from './DailyTiffinsTrendChart';
import { downloadDailyDispatchManifestPDF } from '../lib/pdfGenerator';
import { sounds } from '../lib/soundEffects';
import { logActivity } from '../lib/automationEngine';
import { BuildingGroupDispatchModal } from './BuildingGroupDispatchModal';

interface DailyDispatchViewProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  customers: Customer[];
  attendance: AttendanceStore;
  onUpdateDayAttendance: (
    customerId: string,
    dateStr: string,
    updated: Partial<DayAttendance>
  ) => void;
  onOpenCustomerCalendar: (customer: Customer) => void;
  onOpenQuickMessage: (
    customer: Customer,
    template?: MessageTemplateType,
    slot?: 'lunch' | 'dinner'
  ) => void;
  onOpenAddCustomer?: () => void;
}

export const DailyDispatchView: React.FC<DailyDispatchViewProps> = ({
  selectedDate,
  setSelectedDate,
  customers,
  attendance,
  onUpdateDayAttendance,
  onOpenCustomerCalendar,
  onOpenQuickMessage,
  onOpenAddCustomer
}) => {
  const [slotFilter, setSlotFilter] = useState<'all' | 'lunch' | 'dinner'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [riderFilter, setRiderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'skipped'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTrendChart, setShowTrendChart] = useState<boolean>(false);
  const [lastAutoSentNotice, setLastAutoSentNotice] = useState<string | null>(null);
  
  // Building group bulk dispatch modal state
  const [activeBuildingModal, setActiveBuildingModal] = useState<{
    buildingName: string;
    customers: Customer[];
    slot: 'lunch' | 'dinner';
  } | null>(null);

  // Group active customers by building drop clusters
  const buildingClusters = useMemo(() => {
    const map = new Map<string, Customer[]>();
    customers.forEach((c) => {
      if (c.status === 'archived' || !c.building) return;
      const list = map.get(c.building) || [];
      list.push(c);
      map.set(c.building, list);
    });
    return Array.from(map.entries()).map(([buildingName, bCustomers]) => ({
      buildingName,
      customers: bCustomers
    }));
  }, [customers]);

  // Next / Prev day navigation
  const handleShiftDate = (offsetDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offsetDays);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Distinct areas and riders
  const areas = Array.from(new Set(customers.map((c) => c.area))).filter(Boolean);
  const riders = Array.from(new Set(customers.map((c) => c.assignedRider))).filter(Boolean);

  // Build flattened delivery order tasks for the selected day
  interface OrderTask {
    id: string;
    customer: Customer;
    slot: 'lunch' | 'dinner';
    status: DayMealStatus;
    extraTiffins: number;
    deliveryTime?: string;
    notes?: string;
  }

  const tasks: OrderTask[] = [];

  customers.forEach((customer) => {
    if (customer.status === 'archived') return;

    const dayRecord: DayAttendance = attendance[customer.id]?.[selectedDate] || {
      date: selectedDate,
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };

    const hasLunch = customer.scheduleSlot === 'lunch_only' || customer.scheduleSlot === 'both';
    const hasDinner = customer.scheduleSlot === 'dinner_only' || customer.scheduleSlot === 'both';

    if (hasLunch) {
      tasks.push({
        id: `${customer.id}_lunch_${selectedDate}`,
        customer,
        slot: 'lunch',
        status: dayRecord.lunch,
        extraTiffins: dayRecord.extraTiffins,
        deliveryTime: dayRecord.deliveryTimeLunch,
        notes: dayRecord.notes
      });
    }

    if (hasDinner) {
      tasks.push({
        id: `${customer.id}_dinner_${selectedDate}`,
        customer,
        slot: 'dinner',
        status: dayRecord.dinner,
        extraTiffins: dayRecord.extraTiffins,
        deliveryTime: dayRecord.deliveryTimeDinner,
        notes: dayRecord.notes
      });
    }
  });

  // KPI calculations for selected date
  const totalTasks = tasks.length;
  const deliveredTasks = tasks.filter((t) => t.status === 'delivered').length;
  const pendingTasks = tasks.filter((t) => t.status === 'none').length;
  const skippedTasks = tasks.filter((t) => t.status === 'skipped').length;
  const percentComplete = totalTasks > 0 ? Math.round((deliveredTasks / totalTasks) * 100) : 0;

  // Kitchen Prep breakdown
  let vegCount = 0;
  let nonVegCount = 0;
  let jainCount = 0;

  tasks.forEach((t) => {
    if (t.status !== 'skipped') {
      const multiplier = 1 + (t.extraTiffins || 0);
      if (t.customer.mealPreference === 'veg') vegCount += multiplier;
      else if (t.customer.mealPreference === 'non_veg') nonVegCount += multiplier;
      else if (t.customer.mealPreference === 'jain') jainCount += multiplier;
    }
  });

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (slotFilter !== 'all' && task.slot !== slotFilter) return false;
    if (areaFilter !== 'all' && task.customer.area !== areaFilter) return false;
    if (riderFilter !== 'all' && task.customer.assignedRider !== riderFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && task.status !== 'none') return false;
      if (statusFilter === 'delivered' && task.status !== 'delivered') return false;
      if (statusFilter === 'skipped' && task.status !== 'skipped') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = task.customer.name.toLowerCase().includes(q);
      const matchPhone = task.customer.phone.toLowerCase().includes(q);
      const matchArea = task.customer.area.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchArea) return false;
    }
    return true;
  });

  // Action handlers
  const handleSetStatus = (task: OrderTask, newStatus: DayMealStatus) => {
    const existing = attendance[task.customer.id]?.[selectedDate] || {
      date: selectedDate,
      lunch: 'none',
      dinner: 'none',
      extraTiffins: 0,
      notes: ''
    };

    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (newStatus === 'delivered') {
      sounds.playDeliveredChime();
      logActivity(
        'delivery',
        `${task.customer.name} — ${task.slot.toUpperCase()} Delivered`,
        `Assigned: ${task.customer.assignedRider || 'rider'}`,
        task.customer.id,
        task.customer.name
      );
    } else if (newStatus === 'skipped') {
      sounds.playSkipAlert();
      logActivity(
        'skip',
        `${task.customer.name} — ${task.slot.toUpperCase()} Marked Skipped`,
        `Meal leave recorded on ${selectedDate}`,
        task.customer.id,
        task.customer.name
      );
    }

    if (task.slot === 'lunch') {
      onUpdateDayAttendance(task.customer.id, selectedDate, {
        ...existing,
        lunch: newStatus,
        deliveryTimeLunch: newStatus === 'delivered' ? (existing.deliveryTimeLunch || currentTime) : undefined
      });
    } else {
      onUpdateDayAttendance(task.customer.id, selectedDate, {
        ...existing,
        dinner: newStatus,
        deliveryTimeDinner: newStatus === 'delivered' ? (existing.deliveryTimeDinner || currentTime) : undefined
      });
    }
  };

  const handleMarkAllPendingDelivered = () => {
    filteredTasks.forEach((task) => {
      if (task.status === 'none') {
        handleSetStatus(task, 'delivered');
      }
    });
  };

  // 1-Click Deliver & Multi-Message for entire building (e.g. Rizvi Apartment 6 Tiffins)
  const handleDeliverBuildingCluster = (
    buildingName: string,
    clusterCustomers: Customer[],
    slotTarget: 'lunch' | 'dinner'
  ) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    sounds.playDeliveredChime();

    // Mark all as delivered in persistent attendance store
    clusterCustomers.forEach((cust) => {
      const existing = attendance[cust.id]?.[selectedDate] || {
        date: selectedDate,
        lunch: 'none',
        dinner: 'none',
        extraTiffins: 0,
        notes: ''
      };

      if (slotTarget === 'lunch') {
        onUpdateDayAttendance(cust.id, selectedDate, {
          ...existing,
          lunch: 'delivered',
          deliveryTimeLunch: existing.deliveryTimeLunch || currentTime
        });
      } else {
        onUpdateDayAttendance(cust.id, selectedDate, {
          ...existing,
          dinner: 'delivered',
          deliveryTimeDinner: existing.deliveryTimeDinner || currentTime
        });
      }

      logActivity(
        'delivery',
        `${cust.name} (${buildingName}) — ${slotTarget.toUpperCase()} Delivered`,
        `Building cluster drop at ${buildingName} (${cust.flatNo || ''})`,
        cust.id,
        cust.name
      );
    });

    setLastAutoSentNotice(`🏢 ${buildingName}: All ${clusterCustomers.length} tiffins marked Delivered! Opening WhatsApp broadcast...`);
    setTimeout(() => setLastAutoSentNotice(null), 5000);

    // Open the building dispatch modal
    setActiveBuildingModal({
      buildingName,
      customers: clusterCustomers,
      slot: slotTarget
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Banner: Date Picker Bar + Daily Refresh Indicator */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-4 py-2 rounded-xl">
              <Calendar className="w-4 h-4 text-amber-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-stone-900 font-extrabold text-sm focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => handleShiftDate(1)}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:block">
            <span className="text-xs font-semibold text-stone-500 block">Dispatch Schedule for</span>
            <span className="text-sm font-bold text-stone-900">
              {new Date(selectedDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Actions: Daily Refresh status + Trend Chart Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Daily Refresh Active:</strong> Live tiffin counts synced!
            </span>
          </div>

          <button
            id="download-daily-manifest-pdf-top-btn"
            onClick={() => {
              downloadDailyDispatchManifestPDF(selectedDate, customers, attendance);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs transition-all shadow-xs"
            title="Download printable daily kitchen and rider delivery manifest PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Delivery Run-Sheet PDF</span>
          </button>

          <button
            id="toggle-month-trend-chart-btn"
            onClick={() => setShowTrendChart(!showTrendChart)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              showTrendChart
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{showTrendChart ? 'Hide Trend Chart' : 'Monthly Trend Chart'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">Total Scheduled</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-stone-900">{totalTasks}</span>
            <span className="text-xs text-stone-500 font-semibold">tiffins</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">Delivered Today</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{deliveredTasks}</span>
            <span className="text-xs font-bold text-emerald-700">({percentComplete}%)</span>
          </div>
          <span className="text-[11px] text-stone-500 block mt-1">Successfully dispatched</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">Pending Deliveries</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{pendingTasks}</span>
            <span className="text-xs text-stone-500 font-semibold">in queue</span>
          </div>
          <span className="text-[11px] text-stone-500 block mt-1">Awaiting rider drop</span>
        </div>

        <div className="bg-stone-900 text-white p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">Kitchen Prep Count</span>
          <div className="flex items-center justify-between text-xs mt-1">
            <div className="text-center">
              <span className="text-[10px] text-emerald-400 block font-bold">VEG</span>
              <span className="text-lg font-black">{vegCount}</span>
            </div>
            <div className="h-6 w-px bg-stone-700" />
            <div className="text-center">
              <span className="text-[10px] text-amber-400 block font-bold">JAIN</span>
              <span className="text-lg font-black">{jainCount}</span>
            </div>
            <div className="h-6 w-px bg-stone-700" />
            <div className="text-center">
              <span className="text-[10px] text-rose-400 block font-bold">NON-VEG</span>
              <span className="text-lg font-black">{nonVegCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Monthly Delivery Trends Chart */}
      {showTrendChart && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <DailyTiffinsTrendChart
            customers={customers}
            attendance={attendance}
            yearMonth={selectedDate.slice(0, 7)}
            selectedDate={selectedDate}
            onSelectDate={(newDate) => {
              setSelectedDate(newDate);
            }}
            title="Monthly Tiffin Delivery Trends"
            subtitle={`Service trends for ${selectedDate.slice(0, 7)}. Click any day point to inspect orders for that date.`}
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3.5">
        
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, phone, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 text-stone-800"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          {/* Meal Slot Filter */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSlotFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                slotFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Slots
            </button>
            <button
              onClick={() => setSlotFilter('lunch')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                slotFilter === 'lunch' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ☀️ Lunch
            </button>
            <button
              onClick={() => setSlotFilter('dinner')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                slotFilter === 'dinner' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🌙 Dinner
            </button>
          </div>

          {/* Area Filter */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Areas ({areas.length})</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Rider Filter */}
          <select
            value={riderFilter}
            onChange={(e) => setRiderFilter(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Riders</option>
            {riders.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="delivered">Delivered Only</option>
            <option value="skipped">Skipped Only</option>
          </select>

          {/* Batch Mark Delivered button */}
          {pendingTasks > 0 && (
            <button
              id="batch-mark-delivered-btn"
              onClick={handleMarkAllPendingDelivered}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Delivered</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Toast Notice for Auto-Dispatched WhatsApp */}
      {lastAutoSentNotice && (
        <div className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{lastAutoSentNotice}</span>
          </div>
          <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded font-black uppercase">
            ✓ Auto-Sent to WhatsApp
          </span>
        </div>
      )}

      {/* Smart Building Drop Points (Ek Sath Delivery & WhatsApp Broadcast) */}
      {buildingClusters.length > 0 && (
        <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 rounded-2xl border border-stone-800 p-5 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
                🏢
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base text-white">Smart Building Drop Points</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Ek Sath Delivery & WhatsApp
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Ek hi jagah jane wale tiffins ko 1-Click me Deliver mark karein aur sabhi residents ke pass ek sath WhatsApp message bhejein
                </p>
              </div>
            </div>

            <div className="text-xs text-amber-300/90 font-medium">
              Study Fuel Multi-Drop Hub
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buildingClusters.map(({ buildingName, customers: bCustomers }) => {
              const effectiveSlot: 'lunch' | 'dinner' = slotFilter === 'dinner' ? 'dinner' : 'lunch';
              
              // Count delivered today for this building
              const deliveredInBuilding = bCustomers.filter((c) => {
                const rec = attendance[c.id]?.[selectedDate];
                return effectiveSlot === 'lunch' ? rec?.lunch === 'delivered' : rec?.dinner === 'delivered';
              }).length;

              const isAllDelivered = deliveredInBuilding === bCustomers.length && bCustomers.length > 0;

              return (
                <div
                  key={buildingName}
                  className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4.5 flex flex-col justify-between gap-4 hover:border-amber-500/40 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🏢</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-base text-white group-hover:text-amber-300 transition-colors">
                              {buildingName}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500 text-stone-950">
                              {bCustomers.length} Tiffins
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{bCustomers[0]?.address || 'Carter Road, Bandra West'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                        isAllDelivered
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {deliveredInBuilding} / {bCustomers.length} Delivered
                      </span>
                    </div>

                    {/* Residents chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {bCustomers.map((cust) => {
                        const rec = attendance[cust.id]?.[selectedDate];
                        const isDelivered = effectiveSlot === 'lunch' ? rec?.lunch === 'delivered' : rec?.dinner === 'delivered';
                        return (
                          <div
                            key={cust.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                              isDelivered
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                                : 'bg-stone-900 text-stone-300 border-stone-800'
                            }`}
                          >
                            <span className="font-mono text-[10px] text-amber-400 font-bold">{cust.flatNo || 'Flat'}</span>
                            <span>{cust.name}</span>
                            {isDelivered && <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-800/80 flex-wrap">
                    <button
                      id={`btn-deliver-cluster-${buildingName.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => handleDeliverBuildingCluster(buildingName, bCustomers, effectiveSlot)}
                      className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      title="Deliver all tiffins at once and open WhatsApp dispatch"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>{isAllDelivered ? 'Re-Send Ek Sath Message' : `⚡ Deliver All ${bCustomers.length} & Msg`}</span>
                    </button>

                    <button
                      id={`btn-open-broadcast-${buildingName.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => setActiveBuildingModal({ buildingName, customers: bCustomers, slot: effectiveSlot })}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Open WhatsApp broadcast and sequence panel"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Ek Sath Message</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery Schedule List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-stone-900 text-base">Delivery Schedule & Order Tracker</h3>
            <span className="text-xs font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
              {filteredTasks.length} orders
            </span>
          </div>
          <span className="text-xs text-stone-500">
            Click customer name or "Calendar" button to open their personal meal calendar
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-14 px-6 text-center text-stone-500">
            <Utensils className="w-12 h-12 mx-auto text-stone-300 mb-3" />
            <p className="font-bold text-base text-stone-800">
              {customers.length === 0 ? 'No Customers Added Yet' : 'No Delivery Orders Found'}
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {customers.length === 0
                ? 'Your daily delivery schedule is clean. Add your real subscribers to start daily meal tracking.'
                : 'Adjust your slot or area filters, or select another date.'}
            </p>
            {customers.length === 0 && onOpenAddCustomer && (
              <button
                id="empty-dispatch-add-customer-btn"
                onClick={onOpenAddCustomer}
                className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition-all"
              >
                <span>+ Add First Customer</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTasks.map((task) => {
              const isDelivered = task.status === 'delivered';
              const isSkipped = task.status === 'skipped';
              const isPending = task.status === 'none';

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                    isDelivered ? 'bg-emerald-50/20' : isSkipped ? 'bg-rose-50/20 opacity-75' : 'hover:bg-stone-50/80'
                  }`}
                >
                  {/* Left: Customer Info & Meal Slot */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <button
                      onClick={() => onOpenCustomerCalendar(task.customer)}
                      className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold flex items-center justify-center shrink-0 text-sm shadow-xs transition-colors"
                      title="Open personal calendar"
                    >
                      {task.slot === 'lunch' ? '☀️' : '🌙'}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => onOpenCustomerCalendar(task.customer)}
                          className="font-extrabold text-sm text-stone-900 hover:text-amber-600 text-left transition-colors flex items-center gap-1.5"
                        >
                          <span>{task.customer.name}</span>
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.2 rounded hover:underline">
                            📅 Calendar
                          </span>
                        </button>

                        <span className={`text-[10px] px-2 py-0.2 rounded font-bold uppercase ${
                          task.customer.mealPreference === 'veg'
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.customer.mealPreference === 'jain'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {task.customer.mealPreference}
                        </span>

                        <span className="text-[10px] px-2 py-0.2 rounded bg-stone-100 text-stone-700 font-semibold">
                          {task.slot === 'lunch' ? 'Lunch Meal' : 'Dinner Meal'}
                        </span>

                        {task.customer.building && (
                          <button
                            onClick={() => {
                              const cluster = buildingClusters.find((b) => b.buildingName === task.customer.building);
                              if (cluster) {
                                setActiveBuildingModal({
                                  buildingName: cluster.buildingName,
                                  customers: cluster.customers,
                                  slot: task.slot
                                });
                              }
                            }}
                            className="text-[10px] px-2 py-0.2 rounded bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 font-black border border-amber-500/30 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Click to view building drop & send Ek Sath WhatsApp"
                          >
                            <span>🏢 {task.customer.building}</span>
                            {task.customer.flatNo && <span>• {task.customer.flatNo}</span>}
                          </button>
                        )}

                        {task.extraTiffins > 0 && (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-amber-200 text-amber-900 font-black">
                            +{task.extraTiffins} Extra Tiffin
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          {task.customer.address}, <strong className="text-stone-700">{task.customer.area}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          {task.customer.phone}
                        </span>
                        <span>•</span>
                        <span className="text-stone-600 font-medium">
                          Rider: {task.customer.assignedRider}
                        </span>
                      </div>

                      {task.notes && (
                        <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                          Note: {task.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Delivery Status & Quick Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    
                    {/* Status badge */}
                    {isDelivered && (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Delivered {task.deliveryTime ? `(${task.deliveryTime})` : ''}</span>
                      </div>
                    )}

                    {isSkipped && (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Leave / Skipped</span>
                      </div>
                    )}

                    {isPending && (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Pending Dispatch</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      {!isDelivered && (
                        <button
                          id={`mark-delivered-${task.id}`}
                          onClick={() => handleSetStatus(task, 'delivered')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                        >
                          ✓ Deliver
                        </button>
                      )}

                      {!isSkipped && (
                        <button
                          id={`mark-skipped-${task.id}`}
                          onClick={() => handleSetStatus(task, 'skipped')}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all"
                        >
                          Skip
                        </button>
                      )}

                      {/* Reset to Pending button if already marked */}
                      {(isDelivered || isSkipped) && (
                        <button
                          onClick={() => handleSetStatus(task, 'none')}
                          title="Reset to Pending"
                          className="px-2 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium"
                        >
                          Reset
                        </button>
                      )}

                      {/* Open Calendar button */}
                      <button
                        id={`open-cal-from-dispatch-${task.customer.id}`}
                        onClick={() => onOpenCustomerCalendar(task.customer)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1"
                        title="Open full attendance calendar"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden sm:inline">Calendar</span>
                      </button>

                      {/* Quick Message Button */}
                      <button
                        id={`quick-msg-dispatch-${task.id}`}
                        onClick={() =>
                          onOpenQuickMessage(
                            task.customer,
                            isDelivered ? 'delivery_confirmed' : isSkipped ? 'leave_confirmed' : 'out_for_delivery',
                            task.slot
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Send WhatsApp Quick Message"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Quick Msg</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Building Group Bulk Dispatch & WhatsApp Broadcast Modal */}
      {activeBuildingModal && (
        <BuildingGroupDispatchModal
          isOpen={!!activeBuildingModal}
          onClose={() => setActiveBuildingModal(null)}
          buildingName={activeBuildingModal.buildingName}
          customers={activeBuildingModal.customers}
          slot={activeBuildingModal.slot}
          dateStr={selectedDate}
          assignedRider={activeBuildingModal.customers[0]?.assignedRider || 'Imran (Bandra Route)'}
        />
      )}

    </div>
  );
};
