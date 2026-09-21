import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Customer, AttendanceStore } from '../types';
import { TODAY_STR } from '../data/initialData';
import {
  TrendingUp,
  Sun,
  Moon,
  Star,
  Award,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react';

interface DailyTiffinsTrendChartProps {
  customers: Customer[];
  attendance: AttendanceStore;
  yearMonth: string; // e.g. "2026-09"
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
  title?: string;
  subtitle?: string;
}

export const DailyTiffinsTrendChart: React.FC<DailyTiffinsTrendChartProps> = ({
  customers,
  attendance,
  yearMonth,
  selectedDate,
  onSelectDate,
  title = 'Tiffins Delivered Per Day',
  subtitle
}) => {
  const [viewMode, setViewMode] = useState<'total' | 'slots' | 'all'>('total');
  const [rangeMode, setRangeMode] = useState<'month' | 'upto_today'>('month');

  // Parse Year and Month
  const [year, month] = useMemo(() => {
    const parts = yearMonth.split('-');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }, [yearMonth]);

  const monthName = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [year, month]);

  // Compute Daily Trend Data
  const { chartData, metrics } = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const data: Array<{
      date: string;
      dayNum: number;
      dayLabel: string;
      dayName: string;
      lunch: number;
      dinner: number;
      breakfast: number;
      extra: number;
      totalDelivered: number;
      skips: number;
      isToday: boolean;
      isPastOrToday: boolean;
    }> = [];

    let totalMonthTiffins = 0;
    let totalLunch = 0;
    let totalDinner = 0;
    let totalExtra = 0;
    let daysWithDeliveries = 0;
    let maxTiffinsInADay = 0;
    let peakDayLabel = '';
    let peakDayDate = '';

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearMonth}-${dayStr}`;
      const dateObj = new Date(year, month - 1, d);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isToday = dateStr === TODAY_STR;
      const isPastOrToday = dateStr <= TODAY_STR;

      let lunchCount = 0;
      let dinnerCount = 0;
      let breakfastCount = 0;
      let extraCount = 0;
      let skipsCount = 0;

      customers.forEach((customer) => {
        const record = attendance[customer.id]?.[dateStr];
        if (!record) return;

        if (record.lunch === 'delivered') lunchCount++;
        if (record.dinner === 'delivered') dinnerCount++;
        if (record.breakfast === 'delivered') breakfastCount++;
        if (record.extraTiffins && record.extraTiffins > 0) extraCount += record.extraTiffins;

        if (record.lunch === 'skipped' || record.dinner === 'skipped') skipsCount++;
      });

      const dayTotal = lunchCount + dinnerCount + extraCount;

      if (dayTotal > 0) {
        daysWithDeliveries++;
        totalMonthTiffins += dayTotal;
        totalLunch += lunchCount;
        totalDinner += dinnerCount;
        totalExtra += extraCount;

        if (dayTotal > maxTiffinsInADay) {
          maxTiffinsInADay = dayTotal;
          peakDayLabel = `${dayName}, ${d} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}`;
          peakDayDate = dateStr;
        }
      }

      data.push({
        date: dateStr,
        dayNum: d,
        dayLabel: `${d}`,
        dayName,
        lunch: lunchCount,
        dinner: dinnerCount,
        breakfast: breakfastCount,
        extra: extraCount,
        totalDelivered: dayTotal,
        skips: skipsCount,
        isToday,
        isPastOrToday
      });
    }

    const avgPerDay = daysWithDeliveries > 0 ? (totalMonthTiffins / daysWithDeliveries).toFixed(1) : '0';

    return {
      chartData: data,
      metrics: {
        totalMonthTiffins,
        totalLunch,
        totalDinner,
        totalExtra,
        daysWithDeliveries,
        avgPerDay,
        maxTiffinsInADay,
        peakDayLabel,
        peakDayDate
      }
    };
  }, [customers, attendance, yearMonth, year, month]);

  // Filter based on range selection
  const displayedData = useMemo(() => {
    if (rangeMode === 'upto_today' && yearMonth === TODAY_STR.slice(0, 7)) {
      return chartData.filter((d) => d.isPastOrToday);
    }
    return chartData;
  }, [chartData, rangeMode, yearMonth]);

  // Custom Chart Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    const fullDateStr = new Date(item.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return (
      <div className="bg-stone-900 text-white p-3.5 rounded-xl shadow-xl border border-stone-700 text-xs min-w-[200px] z-50">
        <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-stone-200">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>{fullDateStr}</span>
          </div>
          {item.isToday && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[10px]">
              TODAY
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-amber-300 font-extrabold text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Total Delivered:
            </span>
            <span>{item.totalDelivered} tiffins</span>
          </div>

          <div className="h-px bg-stone-800 my-1" />

          <div className="flex items-center justify-between text-stone-300">
            <span className="flex items-center gap-1.5 text-orange-400">
              <Sun className="w-3 h-3" /> Lunch:
            </span>
            <span className="font-semibold">{item.lunch}</span>
          </div>

          <div className="flex items-center justify-between text-stone-300">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <Moon className="w-3 h-3" /> Dinner:
            </span>
            <span className="font-semibold">{item.dinner}</span>
          </div>

          {item.extra > 0 && (
            <div className="flex items-center justify-between text-stone-300">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Star className="w-3 h-3" /> Extra Guest:
              </span>
              <span className="font-semibold">+{item.extra}</span>
            </div>
          )}

          {item.breakfast > 0 && (
            <div className="flex items-center justify-between text-stone-300">
              <span className="flex items-center gap-1.5 text-amber-200">
                🥪 Breakfast:
              </span>
              <span className="font-semibold">{item.breakfast}</span>
            </div>
          )}

          {item.skips > 0 && (
            <div className="flex items-center justify-between text-rose-400 pt-1 border-t border-stone-800/80">
              <span className="flex items-center gap-1.5">
                <XCircle className="w-3 h-3" /> Skips / Leaves:
              </span>
              <span className="font-bold">{item.skips}</span>
            </div>
          )}
        </div>

        {onSelectDate && (
          <div className="mt-2.5 pt-2 border-t border-stone-800 text-[10px] text-amber-400 text-center font-medium">
            Click to view orders for this date →
          </div>
        )}
      </div>
    );
  };

  const todayDayNum = useMemo(() => {
    if (yearMonth === TODAY_STR.slice(0, 7)) {
      return parseInt(TODAY_STR.split('-')[2], 10);
    }
    return null;
  }, [yearMonth]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
      
      {/* Header with Title and Mode Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
              {title}
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {monthName}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {subtitle || 'Daily distribution of delivered tiffins, lunch vs dinner volume, and operational trends'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range Mode */}
          {yearMonth === TODAY_STR.slice(0, 7) && (
            <div className="bg-stone-100 p-0.5 rounded-xl border border-stone-200 flex items-center text-xs">
              <button
                id="chart-range-upto-today"
                onClick={() => setRangeMode('upto_today')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  rangeMode === 'upto_today'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                1 to Today ({todayDayNum}th)
              </button>
              <button
                id="chart-range-month"
                onClick={() => setRangeMode('month')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  rangeMode === 'month'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Full Month (1–{new Date(year, month, 0).getDate()})
              </button>
            </div>
          )}

          {/* View Line Mode */}
          <div className="bg-stone-100 p-0.5 rounded-xl border border-stone-200 flex items-center text-xs">
            <button
              id="chart-view-total"
              onClick={() => setViewMode('total')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'total'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Total Tiffins</span>
            </button>
            <button
              id="chart-view-slots"
              onClick={() => setViewMode('slots')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'slots'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Lunch vs Dinner</span>
            </button>
            <button
              id="chart-view-all"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>All Breakdown</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Trend Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">
            Delivered This Month
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-amber-600">
              {metrics.totalMonthTiffins}
            </span>
            <span className="text-xs font-semibold text-stone-500">tiffins</span>
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            across {metrics.daysWithDeliveries} active delivery days
          </span>
        </div>

        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Daily Average
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-emerald-600">
              {metrics.avgPerDay}
            </span>
            <span className="text-xs font-semibold text-stone-500">per day</span>
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            mean operational delivery volume
          </span>
        </div>

        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
          <span className="text-[10px] uppercase font-bold text-indigo-700 block flex items-center gap-1">
            <Award className="w-3 h-3 text-indigo-600" /> Peak Volume Day
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-indigo-600">
              {metrics.maxTiffinsInADay}
            </span>
            <span className="text-xs font-semibold text-stone-500">tiffins</span>
          </div>
          <span className="text-[10px] text-stone-500 font-medium block truncate mt-0.5" title={metrics.peakDayLabel}>
            {metrics.peakDayLabel || 'N/A'}
          </span>
        </div>

        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
          <span className="text-[10px] uppercase font-bold text-orange-700 block">
            Meal Ratio
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black text-stone-800">
              ☀️ {metrics.totalLunch} : 🌙 {metrics.totalDinner}
            </span>
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            Lunch vs Dinner + {metrics.totalExtra} extra
          </span>
        </div>
      </div>

      {/* The Recharts Line Chart Container */}
      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayedData}
            margin={{ top: 12, right: 16, left: -16, bottom: 4 }}
            onClick={(e: any) => {
              if (onSelectDate && e && e.activePayload && e.activePayload.length) {
                const clickedDate = e.activePayload[0].payload.date;
                onSelectDate(clickedDate);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            
            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(val, idx) => {
                // Show label every few days or day number
                const item = displayedData[idx];
                if (!item) return val;
                return `${item.dayNum}`;
              }}
            />

            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fontSize: 11, fill: '#64748b' }}
              domain={[0, (dataMax: number) => Math.max(dataMax + 2, 8)]}
            />

            <Tooltip content={renderCustomTooltip} />

            {/* Reference Line for Today */}
            {todayDayNum && (
              <ReferenceLine
                x={`${todayDayNum}`}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{
                  value: 'Today',
                  position: 'top',
                  fill: '#d97706',
                  fontSize: 10,
                  fontWeight: 700
                }}
              />
            )}

            {/* Total Line */}
            {(viewMode === 'total' || viewMode === 'all') && (
              <Line
                name="Total Tiffins"
                type="monotone"
                dataKey="totalDelivered"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{
                  r: 3.5,
                  fill: '#f59e0b',
                  strokeWidth: 2,
                  stroke: '#ffffff'
                }}
                activeDot={{
                  r: 6,
                  fill: '#d97706',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
              />
            )}

            {/* Lunch Line */}
            {(viewMode === 'slots' || viewMode === 'all') && (
              <Line
                name="Lunch Delivered"
                type="monotone"
                dataKey="lunch"
                stroke="#ea580c"
                strokeWidth={2}
                strokeDasharray={viewMode === 'all' ? '4 2' : undefined}
                dot={{
                  r: 3,
                  fill: '#ea580c',
                  strokeWidth: 1.5,
                  stroke: '#ffffff'
                }}
                activeDot={{
                  r: 5,
                  fill: '#ea580c',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
              />
            )}

            {/* Dinner Line */}
            {(viewMode === 'slots' || viewMode === 'all') && (
              <Line
                name="Dinner Delivered"
                type="monotone"
                dataKey="dinner"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray={viewMode === 'all' ? '4 2' : undefined}
                dot={{
                  r: 3,
                  fill: '#6366f1',
                  strokeWidth: 1.5,
                  stroke: '#ffffff'
                }}
                activeDot={{
                  r: 5,
                  fill: '#6366f1',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
              />
            )}

            {/* Extra Guest Tiffins Line */}
            {viewMode === 'all' && (
              <Line
                name="Extra Guest Tiffins"
                type="monotone"
                dataKey="extra"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={{
                  r: 2.5,
                  fill: '#10b981',
                  strokeWidth: 1,
                  stroke: '#ffffff'
                }}
              />
            )}

            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Helper */}
      <div className="mt-2 pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Total Tiffins
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600" /> Lunch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Dinner
          </span>
        </div>
        <span className="text-[11px] text-stone-400">
          💡 Click any point or day to filter/jump directly to that delivery date
        </span>
      </div>

    </div>
  );
};
