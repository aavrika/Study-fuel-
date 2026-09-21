import React, { useState } from 'react';
import {
  Customer,
  AttendanceStore,
  CustomerStatus,
  MealPreference
} from '../types';
import { TODAY_STR } from '../data/initialData';
import { calculateMonthlySummaries, formatCurrency } from '../lib/storage';
import { MessageTemplateType } from '../lib/whatsapp';
import {
  Calendar,
  Phone,
  MapPin,
  Plus,
  Search,
  Filter,
  UserCheck,
  PauseCircle,
  MoreVertical,
  Share2,
  Edit,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  MessageCircle,
  Smartphone,
  Coffee,
  Zap,
  Trash2,
  Upload
} from 'lucide-react';
import { sendAutomaticDeliveryWhatsApp } from '../lib/whatsapp';
import { sounds } from '../lib/soundEffects';
import { logActivity } from '../lib/automationEngine';
import { DayAttendance } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  attendance: AttendanceStore;
  currentYearMonth: string;
  selectedDate?: string;
  onOpenCustomerCalendar: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onOpenEditCustomer: (customer: Customer) => void;
  onToggleCustomerStatus: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onOpenImportIAS?: () => void;
  onViewInvoice: (customer: Customer, yearMonth: string) => void;
  onOpenQuickMessage: (
    customer: Customer,
    template?: MessageTemplateType
  ) => void;
  onLoginAsCustomer?: (customer: Customer) => void;
  onUpdateDayAttendance?: (
    customerId: string,
    dateStr: string,
    updated: Partial<DayAttendance>
  ) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  attendance,
  currentYearMonth,
  selectedDate = TODAY_STR,
  onOpenCustomerCalendar,
  onOpenAddCustomer,
  onOpenEditCustomer,
  onToggleCustomerStatus,
  onDeleteCustomer,
  onOpenImportIAS,
  onViewInvoice,
  onOpenQuickMessage,
  onLoginAsCustomer,
  onUpdateDayAttendance
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [prefFilter, setPrefFilter] = useState<MealPreference | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  // Compute monthly summary for all customers to show running totals
  const monthlySummaries = React.useMemo(() => {
    return calculateMonthlySummaries(currentYearMonth, customers, attendance);
  }, [currentYearMonth, customers, attendance]);

  const summaryMap = React.useMemo(() => {
    const map = new Map<string, (typeof monthlySummaries)[0]>();
    monthlySummaries.forEach((s) => map.set(s.customerId, s));
    return map;
  }, [monthlySummaries]);

  // Unique areas for filter
  const areas = Array.from(new Set(customers.map((c) => c.area)));

  // Filtered customer list
  const filteredCustomers = customers.filter((cust) => {
    // Search query matches name, phone, area, notes
    const matchesSearch =
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.phone.includes(searchQuery) ||
      cust.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust.notes && cust.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : cust.status === statusFilter;

    const matchesPref =
      prefFilter === 'all' ? true : cust.mealPreference === prefFilter;

    const matchesArea =
      areaFilter === 'all' ? true : cust.area === areaFilter;

    return matchesSearch && matchesStatus && matchesPref && matchesArea;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Callout for the Personal Calendar feature */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-base shadow-xs">
              📅
            </span>
            <h2 className="text-lg font-bold text-stone-900">
              Customer Directory & Smart Attendance Calendars
            </h2>
          </div>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl">
            Click any customer card to open their Smart Calendar (Breakfast ₹50, Lunch, Dinner, Extra). Customers can also log in with their phone number to mark meals themselves!
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenImportIAS && (
            <button
              id="import-ias-pg-btn"
              onClick={onOpenImportIAS}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 shadow-xs transition-all active:scale-95"
              title="Import customers from IAS PG ERP / Excel"
            >
              <Upload className="w-4 h-4 text-stone-600" />
              <span>Import IAS PG</span>
            </button>
          )}

          <button
            id="add-customer-main-btn"
            onClick={onOpenAddCustomer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 text-stone-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'active' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Active ({customers.filter((c) => c.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'paused' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Paused ({customers.filter((c) => c.status === 'paused').length})
            </button>
          </div>

          {/* Meal Preference */}
          <select
            value={prefFilter}
            onChange={(e) => setPrefFilter(e.target.value as any)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Food Types</option>
            <option value="veg">Pure Veg</option>
            <option value="jain">Jain Only</option>
            <option value="non_veg">Non-Veg</option>
          </select>

          {/* Area */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            {customers.length === 0 ? 'No Customers Added Yet' : 'No Matching Customers Found'}
          </h3>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            {customers.length === 0
              ? 'Your customer directory is clean and ready. Add your real subscribers to start tracking daily tiffins and automatic bills.'
              : 'Try clearing your search keyword or area filter to view all customers.'}
          </p>
          {customers.length === 0 && (
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              <button
                id="empty-state-add-customer-btn"
                onClick={onOpenAddCustomer}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Customer</span>
              </button>

              {onOpenImportIAS && (
                <button
                  id="empty-state-import-ias-btn"
                  onClick={onOpenImportIAS}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-sm shadow-xs transition-all"
                >
                  <Upload className="w-4 h-4 text-stone-600" />
                  <span>Import Old IAS PG List</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const summary = summaryMap.get(cust.id);
          const totalTiffins = summary?.totalTiffins || 0;
          const breakfastDelivered = summary?.breakfastDelivered || 0;
          const totalAmount = summary?.calculatedAmount || 0;
          const dueAmount = summary?.dueAmount || 0;
          const skippedDays = summary?.skippedDays || 0;

          return (
            <div
              key={cust.id}
              className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden group ${
                cust.status === 'paused'
                  ? 'border-stone-300 opacity-80 bg-stone-50/50'
                  : 'border-stone-200 hover:border-amber-400'
              }`}
            >
              {/* Card Header - Clicking anywhere on header opens calendar */}
              <div 
                onClick={() => onOpenCustomerCalendar(cust)}
                className="p-5 pb-3 cursor-pointer hover:bg-stone-50/60 transition-colors"
                title="Click customer to open Monthly Calendar"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className="font-bold text-base text-stone-900 group-hover:text-amber-600 transition-colors"
                      >
                        {cust.name}
                      </h3>
                      {cust.status === 'paused' && (
                        <span className="text-[10px] font-bold px-2 py-0.2 bg-stone-200 text-stone-600 rounded">
                          Paused
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{cust.phone}</span>
                    </p>
                  </div>

                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    cust.mealPreference === 'veg'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : cust.mealPreference === 'jain'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {cust.mealPreference}
                  </span>
                </div>

                {/* Plan & Schedule slot */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="px-2 py-0.5 bg-stone-100 rounded-md text-stone-800 font-semibold">
                    {cust.scheduleSlot === 'both' ? '☀️ Lunch + 🌙 Dinner' : cust.scheduleSlot === 'lunch_only' ? '☀️ Lunch Only' : '🌙 Dinner Only'}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 font-bold">
                    {cust.planType === 'per_tiffin' ? `₹${cust.ratePerTiffin}/tiffin` : `₹${cust.monthlyFixedRate}/month`}
                  </span>
                  {cust.includesBreakfast && (
                    <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-md text-amber-900 font-bold flex items-center gap-1">
                      <Coffee className="w-3 h-3 text-amber-700" />
                      <span>BF ₹{cust.breakfastRate ?? 50}</span>
                    </span>
                  )}
                </div>

                {/* Address & Area */}
                <p className="text-xs text-stone-500 mt-2.5 flex items-start gap-1 line-clamp-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{cust.address}, <strong>{cust.area}</strong></span>
                </p>
              </div>

              {/* Monthly Tiffin Stats Box */}
              <div 
                onClick={() => onOpenCustomerCalendar(cust)}
                className="px-4 py-2.5 bg-stone-50/80 border-t border-b border-stone-100 grid grid-cols-4 gap-1 text-center cursor-pointer hover:bg-stone-100/80 transition-colors"
                title="Click to open Monthly Calendar"
              >
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Tiffins</span>
                  <span className="text-base font-black text-amber-600">{totalTiffins}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Breakfast</span>
                  <span className="text-base font-black text-amber-700">{breakfastDelivered}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Skips</span>
                  <span className="text-base font-black text-rose-600">{skippedDays}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Net Due</span>
                  <span className="text-xs font-black text-stone-900">{formatCurrency(dueAmount)}</span>
                </div>
              </div>

              {/* Today's Delivery & Auto-Message Trigger Row */}
              {(() => {
                const todayRecord = attendance[cust.id]?.[selectedDate];
                const isLunchDelivered = todayRecord?.lunch === 'delivered';
                const isDinnerDelivered = todayRecord?.dinner === 'delivered';
                const hasDeliveredToday = isLunchDelivered || isDinnerDelivered;
                const slotToDeliver = cust.scheduleSlot === 'dinner_only' ? 'dinner' : 'lunch';

                const handleQuickDeliver = () => {
                  if (!onUpdateDayAttendance) return;
                  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  const existing = attendance[cust.id]?.[selectedDate] || {
                    date: selectedDate,
                    lunch: 'none',
                    dinner: 'none',
                    extraTiffins: 0,
                    notes: ''
                  };

                  onUpdateDayAttendance(cust.id, selectedDate, {
                    ...existing,
                    [slotToDeliver]: 'delivered',
                    [slotToDeliver === 'lunch' ? 'deliveryTimeLunch' : 'deliveryTimeDinner']: timeStr
                  });

                  sounds.playDeliveredChime();
                  logActivity(
                    'delivery',
                    `${cust.name} — ${slotToDeliver.toUpperCase()} Delivered via Card`,
                    `Delivered count updated in profile & calendar`,
                    cust.id,
                    cust.name
                  );
                };

                return (
                  <div className="px-3.5 py-2 bg-amber-50/40 border-b border-stone-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-stone-600">Today:</span>
                      {hasDeliveredToday ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Delivered ({isLunchDelivered ? 'Lunch' : 'Dinner'})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending ({slotToDeliver})</span>
                        </span>
                      )}
                    </div>

                    {!hasDeliveredToday && cust.status === 'active' && onUpdateDayAttendance && (
                      <div className="flex items-center gap-1">
                        <button
                          id={`quick-deliver-card-${cust.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickDeliver();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                          title="Mark Delivered (counts in profile and calendar)"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Deliver</span>
                        </button>
                        <button
                          id={`quick-msg-card-${cust.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenQuickMessage(cust, 'delivery_confirmed', slotToDeliver);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                          title="Send WhatsApp Delivery Confirmation Message"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Msg</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Card Bottom: Open Calendar Button & Quick Actions */}
              <div className="p-3.5 bg-white flex items-center justify-between gap-1.5 flex-wrap">
                <button
                  id={`open-cal-btn-${cust.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCustomerCalendar(cust);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>

                {/* Login as this customer (Portal Preview) */}
                {onLoginAsCustomer && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoginAsCustomer(cust);
                    }}
                    className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold transition-colors"
                    title="Customer Login View"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Portal</span>
                  </button>
                )}

                {/* Quick Message WhatsApp Button */}
                <button
                  id={`quick-msg-cust-${cust.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuickMessage(cust, 'monthly_invoice');
                  }}
                  className="flex items-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold text-xs transition-colors cursor-pointer"
                  title="Quick WhatsApp Message"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Msg</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditCustomer(cust);
                  }}
                  className="p-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                  title="Edit Customer Details & Rate"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewInvoice(cust, currentYearMonth);
                  }}
                  className="p-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                  title="View Invoice"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onToggleCustomerStatus(cust)}
                  className={`p-1.5 rounded-xl border transition-colors ${
                    cust.status === 'active'
                      ? 'border-stone-200 text-stone-600 hover:bg-stone-100'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={cust.status === 'active' ? 'Pause Customer' : 'Resume Customer'}
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                </button>

                <button
                  id={`delete-customer-${cust.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomer(cust);
                  }}
                  className="p-1.5 rounded-xl border border-stone-200 text-stone-400 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title={`Permanently delete ${cust.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>
      )}

    </div>
  );
};
