import React, { useMemo } from 'react';
import { Customer, AttendanceStore } from '../types';
import {
  Utensils,
  Sun,
  Moon,
  Star,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  FileText,
  Clock,
  Sparkles,
  Bike
} from 'lucide-react';
import { sounds } from '../lib/soundEffects';

interface RealTimeCountBarProps {
  selectedDate: string;
  customers: Customer[];
  attendance: AttendanceStore;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRemindersModal: () => void;
  onDownloadManifestPDF: () => void;
  pendingRemindersCount: number;
}

export const RealTimeCountBar: React.FC<RealTimeCountBarProps> = ({
  selectedDate,
  customers,
  attendance,
  soundEnabled,
  onToggleSound,
  onOpenRemindersModal,
  onDownloadManifestPDF,
  pendingRemindersCount
}) => {
  // Compute real-time live counts
  const stats = useMemo(() => {
    let lunchScheduled = 0;
    let lunchDelivered = 0;
    let lunchPending = 0;

    let dinnerScheduled = 0;
    let dinnerDelivered = 0;
    let dinnerPending = 0;

    let breakfastDelivered = 0;
    let extraTiffins = 0;
    let vegTiffins = 0;
    let nonVegTiffins = 0;
    let skippedMeals = 0;

    const riderSet = new Set<string>();

    customers.forEach((customer) => {
      if (customer.status !== 'active') return;
      if (customer.assignedRider) riderSet.add(customer.assignedRider);

      const record = attendance[customer.id]?.[selectedDate];
      const hasLunchSlot = customer.scheduleSlot === 'lunch_only' || customer.scheduleSlot === 'both';
      const hasDinnerSlot = customer.scheduleSlot === 'dinner_only' || customer.scheduleSlot === 'both';

      // Breakfast
      if (record?.breakfast === 'delivered') {
        breakfastDelivered++;
      }

      // Lunch
      if (hasLunchSlot) {
        lunchScheduled++;
        if (record?.lunch === 'delivered') {
          lunchDelivered++;
          if (customer.mealPreference === 'veg' || customer.mealPreference === 'jain') vegTiffins++;
          else nonVegTiffins++;
        } else if (record?.lunch === 'skipped') {
          skippedMeals++;
        } else {
          lunchPending++;
        }
      }

      // Dinner
      if (hasDinnerSlot) {
        dinnerScheduled++;
        if (record?.dinner === 'delivered') {
          dinnerDelivered++;
          if (customer.mealPreference === 'veg' || customer.mealPreference === 'jain') vegTiffins++;
          else nonVegTiffins++;
        } else if (record?.dinner === 'skipped') {
          skippedMeals++;
        } else {
          dinnerPending++;
        }
      }

      // Extra
      if (record?.extraTiffins && record.extraTiffins > 0) {
        extraTiffins += record.extraTiffins;
      }
    });

    const totalDeliveredToday = lunchDelivered + dinnerDelivered + extraTiffins;
    const totalScheduledToday = lunchScheduled + dinnerScheduled + extraTiffins;
    const completionPercent = totalScheduledToday > 0 ? Math.round((totalDeliveredToday / totalScheduledToday) * 100) : 0;

    return {
      totalDeliveredToday,
      totalScheduledToday,
      completionPercent,
      lunchScheduled,
      lunchDelivered,
      lunchPending,
      dinnerScheduled,
      dinnerDelivered,
      dinnerPending,
      breakfastDelivered,
      extraTiffins,
      vegTiffins,
      nonVegTiffins,
      skippedMeals,
      activeRiders: Array.from(riderSet)
    };
  }, [customers, attendance, selectedDate]);

  return (
    <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 shadow-lg border border-stone-800">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Side: Live Tiffin Ticker & Progress */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                  REAL-TIME TIFFIN ENGINE
                </span>
                <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded font-mono">
                  LIVE
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-white">
                  {stats.totalDeliveredToday}
                </span>
                <span className="text-xs text-stone-400 font-medium">
                  / {stats.totalScheduledToday} delivered ({stats.completionPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Mini progress track */}
          <div className="hidden md:block w-28 bg-stone-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.completionPercent}%` }}
            />
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Lunch */}
            <div className="flex items-center gap-1 bg-stone-800/90 px-2.5 py-1.5 rounded-lg border border-stone-700/60">
              <Sun className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-stone-300 font-medium">Lunch:</span>
              <span className="font-bold text-orange-400">{stats.lunchDelivered}</span>
              <span className="text-stone-500 text-[10px]">/{stats.lunchScheduled}</span>
            </div>

            {/* Dinner */}
            <div className="flex items-center gap-1 bg-stone-800/90 px-2.5 py-1.5 rounded-lg border border-stone-700/60">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-stone-300 font-medium">Dinner:</span>
              <span className="font-bold text-indigo-400">{stats.dinnerDelivered}</span>
              <span className="text-stone-500 text-[10px]">/{stats.dinnerScheduled}</span>
            </div>

            {/* Extra Guest Tiffins */}
            {stats.extraTiffins > 0 && (
              <div className="flex items-center gap-1 bg-stone-800/90 px-2.5 py-1.5 rounded-lg border border-stone-700/60">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300 font-medium">Extra:</span>
                <span className="font-bold text-amber-400">+{stats.extraTiffins}</span>
              </div>
            )}

            {/* Breakfast */}
            {stats.breakfastDelivered > 0 && (
              <div className="flex items-center gap-1 bg-stone-800/90 px-2.5 py-1.5 rounded-lg border border-stone-700/60">
                <span>🥪</span>
                <span className="text-stone-300 font-medium">Bfast:</span>
                <span className="font-bold text-amber-300">{stats.breakfastDelivered}</span>
              </div>
            )}

            {/* Veg vs NonVeg */}
            <div className="hidden sm:flex items-center gap-1.5 bg-stone-800/90 px-2.5 py-1.5 rounded-lg border border-stone-700/60 text-[11px]">
              <span className="text-emerald-400 font-bold">🟢 {stats.vegTiffins} Veg</span>
              <span className="text-stone-600">|</span>
              <span className="text-rose-400 font-bold">🔴 {stats.nonVegTiffins} Non-Veg</span>
            </div>

            {/* Skips */}
            {stats.skippedMeals > 0 && (
              <div className="flex items-center gap-1 bg-rose-950/40 text-rose-300 border border-rose-900/60 px-2.5 py-1.5 rounded-lg text-[11px]">
                <XCircle className="w-3 h-3 text-rose-400" />
                <span>{stats.skippedMeals} Skipped</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Fast Action Triggers */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          
          {/* Sound Audio Feedback Toggle */}
          <button
            id="toggle-kitchen-sound-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Kitchen Audio Chimes ON (Click to mute)' : 'Audio Chimes Muted (Click to enable)'}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-stone-800 hover:bg-stone-700 text-amber-400 border-stone-700'
                : 'bg-stone-800/50 hover:bg-stone-800 text-stone-500 border-stone-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Quick PDF Delivery Manifest Download */}
          <button
            id="download-daily-manifest-pdf-btn"
            onClick={onDownloadManifestPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition-all shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Delivery Run-Sheet PDF</span>
          </button>

          {/* Auto Reminders Background Center Button */}
          <button
            id="open-auto-reminders-modal-btn"
            onClick={onOpenRemindersModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-md shadow-amber-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Reminders</span>
            {pendingRemindersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-stone-950 text-amber-400 text-[10px] font-black">
                {pendingRemindersCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
