import React, { useState } from 'react';
import { Customer, AttendanceStore, DailyMenuItem } from '../types';
import { WEEKLY_MENU } from '../data/initialData';
import {
  UtensilsCrossed,
  ChefHat,
  Calendar,
  Flame,
  CheckCircle2,
  Sparkles,
  Layers,
  Edit2
} from 'lucide-react';

interface KitchenPrepViewProps {
  selectedDate: string;
  customers: Customer[];
  attendance: AttendanceStore;
}

export const KitchenPrepView: React.FC<KitchenPrepViewProps> = ({
  selectedDate,
  customers,
  attendance
}) => {
  const [menu, setMenu] = useState<DailyMenuItem[]>(WEEKLY_MENU);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  // Compute kitchen prep counts for the selected date
  let lunchVeg = 0;
  let lunchJain = 0;
  let lunchNonVeg = 0;

  let dinnerVeg = 0;
  let dinnerJain = 0;
  let dinnerNonVeg = 0;

  customers.forEach((customer) => {
    if (customer.status === 'archived') return;

    const dayRecord = attendance[customer.id]?.[selectedDate];
    const lunchActive = dayRecord?.lunch !== 'skipped' && (customer.scheduleSlot === 'lunch_only' || customer.scheduleSlot === 'both');
    const dinnerActive = dayRecord?.dinner !== 'skipped' && (customer.scheduleSlot === 'dinner_only' || customer.scheduleSlot === 'both');

    const extra = dayRecord?.extraTiffins || 0;

    if (lunchActive) {
      const count = 1 + extra;
      if (customer.mealPreference === 'veg') lunchVeg += count;
      else if (customer.mealPreference === 'jain') lunchJain += count;
      else if (customer.mealPreference === 'non_veg') lunchNonVeg += count;
    }

    if (dinnerActive) {
      const count = 1 + (dayRecord?.lunch === 'none' ? extra : 0); // avoid double counting extra
      if (customer.mealPreference === 'veg') dinnerVeg += count;
      else if (customer.mealPreference === 'jain') dinnerJain += count;
      else if (customer.mealPreference === 'non_veg') dinnerNonVeg += count;
    }
  });

  const totalLunch = lunchVeg + lunchJain + lunchNonVeg;
  const totalDinner = dinnerVeg + dinnerJain + dinnerNonVeg;
  const totalDayTiffins = totalLunch + totalDinner;

  // Approximate food preparation guidelines
  const totalRotis = totalDayTiffins * 4;
  const totalRicePortions = totalDayTiffins;

  // Current day name for menu highlight
  const dateObj = new Date(selectedDate);
  const currentDayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-2xl">
            👨‍🍳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Kitchen Prep & Chef Sheet</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                {currentDayName}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Live cooking quantities calculated directly from active customer attendance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-stone-800/80 px-4 py-2.5 rounded-xl border border-stone-700/60 text-xs">
          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Estimated Rotis</span>
            <span className="text-amber-400 font-extrabold text-base">{totalRotis} phulkas</span>
          </div>
          <div className="h-7 w-px bg-stone-700" />
          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Rice Portions</span>
            <span className="text-white font-extrabold text-base">{totalRicePortions} bowls</span>
          </div>
        </div>
      </div>

      {/* Lunch & Dinner Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Lunch Slot */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="text-xl">☀️</span>
              <h3 className="font-extrabold text-stone-900 text-base">Lunch Prep Quantities</h3>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-black text-xs">
              {totalLunch} Tiffins
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Pure Veg</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{lunchVeg}</span>
              <span className="text-[10px] text-stone-500">boxes</span>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Jain (No Onion/Garlic)</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">{lunchJain}</span>
              <span className="text-[10px] text-stone-500">separate</span>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">Non-Veg</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">{lunchNonVeg}</span>
              <span className="text-[10px] text-stone-500">portions</span>
            </div>
          </div>
        </div>

        {/* Dinner Slot */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌙</span>
              <h3 className="font-extrabold text-stone-900 text-base">Dinner Prep Quantities</h3>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-900 rounded-full font-black text-xs">
              {totalDinner} Tiffins
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Pure Veg</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{dinnerVeg}</span>
              <span className="text-[10px] text-stone-500">boxes</span>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Jain (No Onion/Garlic)</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">{dinnerJain}</span>
              <span className="text-[10px] text-stone-500">separate</span>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">Non-Veg</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">{dinnerNonVeg}</span>
              <span className="text-[10px] text-stone-500">portions</span>
            </div>
          </div>
        </div>

      </div>

      {/* Weekly Menu Plan */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-stone-900 text-base">Weekly Tiffin Service Menu</h3>
            <p className="text-xs text-stone-500">Monday to Sunday scheduled meal planner</p>
          </div>
          <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-full">
            Standard Healthy Home-Style Meals
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {menu.map((item) => {
            const isTodayMenu = item.dayName.toLowerCase() === currentDayName.toLowerCase();

            return (
              <div
                key={item.dayName}
                className={`rounded-2xl p-4 border transition-all ${
                  isTodayMenu
                    ? 'border-amber-500 bg-amber-50/30 shadow-md ring-2 ring-amber-400/30'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-stone-900 text-sm">{item.dayName}</span>
                    {isTodayMenu && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.2 bg-amber-500 text-stone-950 rounded">
                        Today's Menu
                      </span>
                    )}
                  </div>
                </div>

                {/* Lunch items */}
                <div className="mb-3">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                    ☀️ Lunch
                  </span>
                  <p className="text-xs text-stone-800 font-semibold">{item.lunch.sabzi1} + {item.lunch.sabzi2}</p>
                  <p className="text-xs text-stone-600">{item.lunch.dal} • {item.lunch.bread} • {item.lunch.rice}</p>
                  {item.lunch.special && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">⭐ {item.lunch.special}</p>
                  )}
                </div>

                {/* Dinner items */}
                <div>
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                    🌙 Dinner
                  </span>
                  <p className="text-xs text-stone-800 font-semibold">{item.dinner.sabzi1} + {item.dinner.sabzi2}</p>
                  <p className="text-xs text-stone-600">{item.dinner.dal} • {item.dinner.bread} • {item.dinner.rice}</p>
                  {item.dinner.special && (
                    <p className="text-[11px] text-amber-700 font-bold mt-0.5">🍮 {item.dinner.special}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
