import {
  Customer,
  AttendanceStore,
  MonthlyCustomerSummary,
  DayAttendance
} from '../types';
import { INITIAL_CUSTOMERS, generateInitialAttendance } from '../data/initialData';

const STORAGE_KEY_CUSTOMERS = 'studyfuel_clean_customers_v1';
const STORAGE_KEY_ATTENDANCE = 'studyfuel_clean_attendance_v1';
const STORAGE_KEY_LOGGED_IN_PHONE = 'studyfuel_clean_logged_in_phone_v1';
const STORAGE_DEMO_PURGED_FLAG = 'studyfuel_demo_purged_flag_v1';

/**
 * Automatically purges old mock demo data keys from browser localStorage once
 * so the application starts with a 100% clean slate.
 */
function purgeLegacyDemoDataIfNeeded(): void {
  try {
    if (!localStorage.getItem(STORAGE_DEMO_PURGED_FLAG)) {
      localStorage.removeItem('studyfuel_customers_v2');
      localStorage.removeItem('studyfuel_attendance_v2');
      localStorage.removeItem('studyfuel_logged_in_phone_v2');
      localStorage.removeItem('tiffinsaas_customers_v1');
      localStorage.removeItem('tiffinsaas_attendance_v1');
      localStorage.removeItem('tiffinsaas_reminder_queue_v1');
      localStorage.removeItem('tiffinsaas_reminder_sent_v1');
      localStorage.removeItem('tiffinsaas_activity_stream_v1');
      localStorage.setItem(STORAGE_DEMO_PURGED_FLAG, 'true');
    }
  } catch (e) {
    console.error('Error during purgeLegacyDemoDataIfNeeded', e);
  }
}

// Run cleanup immediately on script execution
purgeLegacyDemoDataIfNeeded();

export function clearAllData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOMERS);
    localStorage.removeItem(STORAGE_KEY_ATTENDANCE);
    localStorage.removeItem(STORAGE_KEY_LOGGED_IN_PHONE);
    localStorage.removeItem('studyfuel_customers_v2');
    localStorage.removeItem('studyfuel_attendance_v2');
    localStorage.removeItem('studyfuel_logged_in_phone_v2');
    localStorage.removeItem('tiffinsaas_reminder_queue_v1');
    localStorage.removeItem('tiffinsaas_reminder_sent_v1');
    localStorage.removeItem('tiffinsaas_activity_stream_v1');
  } catch (e) {
    console.error('Error clearing data from localStorage', e);
  }
}

export function getStoredCustomers(): Customer[] {
  try {
    purgeLegacyDemoDataIfNeeded();
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (raw) {
      const parsed: Customer[] = JSON.parse(raw);
      // Filter out any lingering mock IDs if present
      const cleanList = parsed.filter(
        (c) => !c.id.startsWith('cust-demo-') && c.id !== 'cust-1' && c.id !== 'cust-2'
      );
      return cleanList;
    }
  } catch (e) {
    console.error('Error loading customers from localStorage', e);
  }
  // Initialize clean empty list
  saveStoredCustomers([]);
  return [];
}

export function saveStoredCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers to localStorage', e);
  }
}

/**
 * Permanently deletes a customer and their linked attendance data from localStorage
 */
export function deleteCustomerFromStorage(customerId: string): void {
  try {
    const rawCust = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (rawCust) {
      const parsed: Customer[] = JSON.parse(rawCust);
      const filtered = parsed.filter((c) => c.id !== customerId);
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(filtered));
    }

    const rawAtt = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (rawAtt) {
      const attParsed: AttendanceStore = JSON.parse(rawAtt);
      delete attParsed[customerId];
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attParsed));
    }
  } catch (e) {
    console.error('Error deleting customer from storage', e);
  }
}

export function getStoredAttendance(): AttendanceStore {
  try {
    purgeLegacyDemoDataIfNeeded();
    const raw = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (raw) {
      const parsed: AttendanceStore = JSON.parse(raw);
      return parsed;
    }
  } catch (e) {
    console.error('Error loading attendance from localStorage', e);
  }
  const cleanStore: AttendanceStore = {};
  saveStoredAttendance(cleanStore);
  return cleanStore;
}

export function saveStoredAttendance(attendance: AttendanceStore): void {
  try {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendance));
  } catch (e) {
    console.error('Error saving attendance to localStorage', e);
  }
}

export function getStoredLoggedInCustomerPhone(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LOGGED_IN_PHONE);
  } catch {
    return null;
  }
}

export function saveStoredLoggedInCustomerPhone(phone: string | null): void {
  try {
    if (phone) {
      localStorage.setItem(STORAGE_KEY_LOGGED_IN_PHONE, phone);
    } else {
      localStorage.removeItem(STORAGE_KEY_LOGGED_IN_PHONE);
    }
  } catch (e) {
    console.error('Error saving login state', e);
  }
}

/**
 * Normalizes any phone string to the last 10 digits for accurate matching
 * Example: "+91 98765 43210" -> "9876543210"
 * "09876543210" -> "9876543210"
 */
export function normalizePhone10(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Finds customer strictly by their phone number
 */
export function findCustomerByPhone(phoneInput: string, customers: Customer[]): Customer | null {
  const normalizedInput = normalizePhone10(phoneInput);
  if (normalizedInput.length < 10) return null;

  return (
    customers.find((c) => {
      const custPhone = normalizePhone10(c.phone);
      return custPhone === normalizedInput;
    }) || null
  );
}

/**
 * Ensures today's date has initialized attendance entries for all active customers.
 * If a new day has arrived, it automatically creates default pending entries according to the customer's plan
 * so the daily counting starts fresh and clean!
 */
export function ensureDailyRefresh(
  customers: Customer[],
  attendance: AttendanceStore,
  targetDate: string
): { updatedAttendance: AttendanceStore; isRefreshed: boolean } {
  let modified = false;
  const newStore: AttendanceStore = { ...attendance };

  customers.forEach((customer) => {
    if (!newStore[customer.id]) {
      newStore[customer.id] = {};
    }

    if (!newStore[customer.id][targetDate]) {
      modified = true;
      // Fresh new day initialization
      if (customer.status === 'active') {
        const expectsLunch = customer.scheduleSlot === 'lunch_only' || customer.scheduleSlot === 'both';
        const expectsDinner = customer.scheduleSlot === 'dinner_only' || customer.scheduleSlot === 'both';
        const expectsBreakfast = !!customer.includesBreakfast;

        newStore[customer.id][targetDate] = {
          date: targetDate,
          breakfast: expectsBreakfast ? 'none' : 'none',
          lunch: expectsLunch ? 'none' : 'none',
          dinner: expectsDinner ? 'none' : 'none',
          extraTiffins: 0,
          notes: ''
        };
      } else {
        // Paused customer
        newStore[customer.id][targetDate] = {
          date: targetDate,
          breakfast: 'skipped',
          lunch: 'skipped',
          dinner: 'skipped',
          extraTiffins: 0,
          notes: 'Customer subscription paused'
        };
      }
    }
  });

  if (modified) {
    saveStoredAttendance(newStore);
  }

  return { updatedAttendance: newStore, isRefreshed: modified };
}

/**
 * Calculates monthly summary for all customers for a given yearMonth ("YYYY-MM")
 */
export function calculateMonthlySummaries(
  yearMonth: string, // e.g. "2026-09"
  customers: Customer[],
  attendance: AttendanceStore
): MonthlyCustomerSummary[] {
  return customers.map((customer) => {
    const custAttendance = attendance[customer.id] || {};
    
    let breakfastDelivered = 0;
    let lunchDelivered = 0;
    let dinnerDelivered = 0;
    let extraTiffins = 0;
    let totalDaysServed = 0;
    let skippedDays = 0;

    const breakfastRate = customer.breakfastRate ?? 50;

    // Filter dates matching yearMonth
    Object.entries(custAttendance).forEach(([dateStr, record]: [string, DayAttendance]) => {
      if (!dateStr.startsWith(yearMonth)) return;

      const servedBreakfast = record.breakfast === 'delivered';
      const servedLunch = record.lunch === 'delivered';
      const servedDinner = record.dinner === 'delivered';
      const hasExtra = (record.extraTiffins || 0) > 0;
      const isSkipped =
        record.lunch === 'skipped' || record.dinner === 'skipped' || record.breakfast === 'skipped';

      if (servedBreakfast) breakfastDelivered++;
      if (servedLunch) lunchDelivered++;
      if (servedDinner) dinnerDelivered++;
      if (hasExtra) extraTiffins += record.extraTiffins;

      if (servedBreakfast || servedLunch || servedDinner || hasExtra) {
        totalDaysServed++;
      }
      if (isSkipped && !servedLunch && !servedDinner && !servedBreakfast) {
        skippedDays++;
      }
    });

    const totalTiffins = lunchDelivered + dinnerDelivered + extraTiffins;
    const totalMealsDelivered = totalTiffins + breakfastDelivered;
    const breakfastAmount = breakfastDelivered * breakfastRate;

    let calculatedAmount = 0;
    if (customer.planType === 'per_tiffin') {
      calculatedAmount = totalTiffins * customer.ratePerTiffin + breakfastAmount;
    } else {
      // Monthly fixed plan + extra tiffins + breakfast
      calculatedAmount = customer.monthlyFixedRate + (extraTiffins * customer.ratePerTiffin) + breakfastAmount;
    }

    const dueAmount = Math.max(0, calculatedAmount - customer.advancePaid);
    const paymentStatus =
      customer.advancePaid >= calculatedAmount
        ? 'paid'
        : customer.advancePaid > 0
        ? 'partial'
        : 'pending';

    return {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      area: customer.area,
      planType: customer.planType,
      ratePerTiffin: customer.ratePerTiffin,
      breakfastRate,
      monthlyFixedRate: customer.monthlyFixedRate,
      breakfastDelivered,
      breakfastAmount,
      lunchDelivered,
      dinnerDelivered,
      extraTiffins,
      totalTiffins,
      totalMealsDelivered,
      totalDaysServed,
      skippedDays,
      calculatedAmount,
      advancePaid: customer.advancePaid,
      dueAmount,
      paymentStatus
    };
  });
}

/**
 * Format currency in Indian format: ₹1,250
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Creates formatted WhatsApp billing text in English
 */
export function generateWhatsAppBillMessage(
  summary: MonthlyCustomerSummary,
  monthName: string
): string {
  return `🍱 *TIFFIN SERVICE MONTHLY INVOICE (${monthName})*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${summary.customerName}
📞 *Phone:* ${summary.phone}
📍 *Area:* ${summary.area}

📊 *TIFFIN COUNT SUMMARY:*
${summary.breakfastDelivered > 0 ? `• 🥪 Breakfast (₹${summary.breakfastRate} fixed): ${summary.breakfastDelivered} (${formatCurrency(summary.breakfastAmount)})\n` : ''}• ☀️ Lunch Delivered: ${summary.lunchDelivered}
• 🌙 Dinner Delivered: ${summary.dinnerDelivered}
• ⭐ Extra Guest Tiffins: ${summary.extraTiffins}
━━━━━━━━━━━━━━━━━━━━
✨ *TOTAL DELIVERED TIFFINS:* ${summary.totalTiffins}
${summary.breakfastDelivered > 0 ? `✨ *TOTAL MEALS (inc. Breakfast):* ${summary.totalMealsDelivered}\n` : ''}❌ *Leaves / Skips Recorded:* ${summary.skippedDays} days

💰 *BILLING BREAKDOWN:*
• Plan Type: ${summary.planType === 'per_tiffin' ? `Per Tiffin (₹${summary.ratePerTiffin}/tiffin)` : `Monthly Fixed Plan (₹${summary.monthlyFixedRate})`}
${summary.breakfastDelivered > 0 ? `• Breakfast Total: ${formatCurrency(summary.breakfastAmount)}\n` : ''}• Gross Total: ${formatCurrency(summary.calculatedAmount)}
• Advance / Received: ${formatCurrency(summary.advancePaid)}
━━━━━━━━━━━━━━━━━━━━
🔴 *NET DUE AMOUNT:* ${formatCurrency(summary.dueAmount)}
━━━━━━━━━━━━━━━━━━━━
💳 *Payment Methods:* UPI (Google Pay / PhonePe / Paytm to: 9876511223@upi)
Thank you! We always welcome your valuable feedback. 🙏`;
}
