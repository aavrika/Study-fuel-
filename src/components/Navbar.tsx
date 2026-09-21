import React from 'react';
import { TODAY_STR } from '../data/initialData';
import {
  Calendar,
  Truck,
  Users,
  BarChart3,
  UtensilsCrossed,
  Plus,
  RotateCcw,
  Download,
  Upload,
  UserCheck,
  Shield,
  Smartphone,
  Sparkles,
  Bell
} from 'lucide-react';

interface NavbarProps {
  appMode: 'admin' | 'customer';
  setAppMode: (mode: 'admin' | 'customer') => void;
  activeTab: 'dispatch' | 'customers' | 'monthly' | 'kitchen';
  setActiveTab: (tab: 'dispatch' | 'customers' | 'monthly' | 'kitchen') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onOpenAddCustomer: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  todayCounts: {
    totalExpected: number;
    deliveredCount: number;
    pendingCount: number;
  };
  loggedInCustomerName?: string;
  onOpenRemindersModal: () => void;
  pendingRemindersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  appMode,
  setAppMode,
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  onOpenAddCustomer,
  onResetData,
  onExportData,
  onImportData,
  todayCounts,
  loggedInCustomerName,
  onOpenRemindersModal,
  pendingRemindersCount
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isViewingToday = selectedDate === TODAY_STR;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-stone-900 border-b border-stone-800 text-stone-100 shadow-md">
      {/* Top Banner with branding & quick stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
          
          {/* Logo & Mode Switcher */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
                🍱
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">Study<span className="text-amber-400">Fuel</span></span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    TIFFIN SERVICE
                  </span>
                </div>
                <p className="text-xs text-stone-400">Fuel Your Studies & Day • Smart Tiffin Hub</p>
              </div>
            </div>

            {/* Mode Switcher Toggle (Admin vs Customer) */}
            <div className="bg-stone-950 p-1 rounded-xl border border-stone-800 flex items-center gap-1">
              <button
                id="mode-admin-btn"
                onClick={() => setAppMode('admin')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  appMode === 'admin'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>👑 Owner</span>
              </button>

              <button
                id="mode-customer-btn"
                onClick={() => setAppMode('customer')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  appMode === 'customer'
                    ? 'bg-emerald-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>📱 Customer Login</span>
                {loggedInCustomerName && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Date Selector with Daily Refresh status (visible in admin mode) */}
          {appMode === 'admin' && (
            <div className="flex items-center gap-2 bg-stone-800/90 border border-stone-700/80 rounded-xl px-3 py-1.5 text-xs text-stone-200">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium text-stone-400">Date:</span>
              <input
                id="global-date-selector"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-stone-900 border border-stone-700 text-amber-300 font-semibold text-xs rounded-md px-2 py-1 outline-none focus:border-amber-400"
              />
              {!isViewingToday && (
                <button
                  id="jump-to-today-btn"
                  onClick={() => setSelectedDate(TODAY_STR)}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-semibold transition-colors"
                >
                  Go to Today
                </button>
              )}
              {isViewingToday && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Today
                </span>
              )}
            </div>
          )}

          {/* Today Quick Metric Counter Pill (in admin mode) */}
          {appMode === 'admin' && (
            <div className="hidden lg:flex items-center gap-3 bg-stone-800/60 border border-stone-700/60 rounded-xl px-4 py-1.5 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Today's Tiffins</span>
                <span className="text-white font-bold text-sm">
                  <span className="text-emerald-400">{todayCounts.deliveredCount}</span>
                  <span className="text-stone-400"> / {todayCounts.totalExpected} Delivered</span>
                </span>
              </div>
              <div className="h-6 w-px bg-stone-700" />
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Pending</span>
                <span className="text-amber-400 font-bold text-sm">{todayCounts.pendingCount}</span>
              </div>
            </div>
          )}

          {/* Right Action buttons */}
          {appMode === 'admin' ? (
            <div className="hidden md:flex items-center gap-2">
              <button
                id="navbar-auto-reminders-btn"
                onClick={onOpenRemindersModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 border border-emerald-500/40"
                title="Open Automated Background Messaging & Reminder Engine"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto Reminders</span>
                {pendingRemindersCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black animate-pulse">
                    {pendingRemindersCount}
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                )}
              </button>

              <button
                id="desktop-add-cust-btn"
                onClick={onOpenAddCustomer}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Customer</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                id="export-data-btn"
                onClick={onExportData}
                title="Backup / Export Data (JSON)"
                className="p-2 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition-colors text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                id="import-data-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Restore / Import Data"
                className="p-2 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition-colors text-xs flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>

              <button
                id="reset-data-btn"
                onClick={onResetData}
                title="Clear All Data (Clean Slate)"
                className="p-2 rounded-lg bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-rose-300 transition-colors text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <UserCheck className="w-4 h-4" />
                {loggedInCustomerName ? `Logged in: ${loggedInCustomerName}` : 'Customer Self-Service Mode'}
              </span>
            </div>
          )}

        </div>

        {/* Primary Tab Navigation (only in admin mode) */}
        {appMode === 'admin' && (
          <div className="flex items-center gap-1 overflow-x-auto border-t border-stone-800 py-1.5 no-scrollbar">
            <button
              id="tab-dispatch"
              onClick={() => setActiveTab('dispatch')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'dispatch'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Daily Dispatch & Schedule</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                activeTab === 'dispatch' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-300'
              }`}>
                {todayCounts.totalExpected}
              </span>
            </button>

            <button
              id="tab-customers"
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customers & Smart Calendars</span>
              <span className="text-[11px] text-amber-300 font-semibold ml-1">★ Click for Calendar</span>
            </button>

            <button
              id="tab-monthly"
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'monthly'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Monthly Sync & Billing</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Auto Sync
              </span>
            </button>

            <button
              id="tab-kitchen"
              onClick={() => setActiveTab('kitchen')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'kitchen'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Kitchen Prep & Menu</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
