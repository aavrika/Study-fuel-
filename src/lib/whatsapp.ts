import { Customer, MonthlyCustomerSummary, DayAttendance } from '../types';
import { formatCurrency } from './storage';

export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

export type MessageTemplateType =
  | 'delivery_confirmed'
  | 'out_for_delivery'
  | 'monthly_invoice'
  | 'leave_confirmed'
  | 'tomorrow_confirmation'
  | 'custom';

export interface TemplateOption {
  id: MessageTemplateType;
  title: string;
  badge: string;
  generateText: (params: {
    customer: Customer;
    slot?: 'lunch' | 'dinner' | string;
    dateStr?: string;
    summary?: MonthlyCustomerSummary;
    monthName?: string;
    riderName?: string;
  }) => string;
}

export const MESSAGE_TEMPLATES: TemplateOption[] = [
  {
    id: 'delivery_confirmed',
    title: 'Tiffin Delivered Confirmation',
    badge: 'Delivered',
    generateText: ({ customer, slot, dateStr, riderName }) => {
      const slotName = slot === 'lunch' ? 'Lunch' : slot === 'dinner' ? 'Dinner' : 'Tiffin';
      return `🍱 *Study Fuel Tiffin Service - Delivery Confirmation*
━━━━━━━━━━━━━━━━━━━━
Hello *${customer.name}*,

Your *${slotName} Tiffin* for ${dateStr || 'today'} has been delivered successfully! ✅

📍 Delivery Address: ${customer.address}
${customer.building ? `🏢 Building: ${customer.building} (${customer.flatNo || 'Flat'})\n` : ''}🛵 Delivered By: ${riderName || customer.assignedRider}

Please enjoy your warm, fresh meal. Fuel your studies and work with good food! 🍲

Thank you! 🙏`;
    }
  },
  {
    id: 'out_for_delivery',
    title: 'Out for Delivery Alert',
    badge: 'On the way',
    generateText: ({ customer, slot, riderName }) => {
      const slotName = slot === 'lunch' ? 'Lunch' : slot === 'dinner' ? 'Dinner' : 'Tiffin';
      return `🛵 *Study Fuel - Tiffin Out for Delivery!*
━━━━━━━━━━━━━━━━━━━━
Hello *${customer.name}*,

Your *${slotName} Tiffin* has departed from our kitchen and will arrive at your address within 15–20 minutes.

🛵 Delivery Rider: ${riderName || customer.assignedRider}
📍 Delivery Address: ${customer.address}

Please keep your phone handy or receive the tiffin box at your door. Thank you! 🍱`;
    }
  },
  {
    id: 'monthly_invoice',
    title: 'Monthly Bill & Tiffin Count',
    badge: 'Invoice / Statement',
    generateText: ({ customer, summary, monthName }) => {
      if (!summary) {
        return `🍱 *Study Fuel Tiffin Service - Monthly Bill*
━━━━━━━━━━━━━━━━━━━━
Hello *${customer.name}*,
Your monthly tiffin statement is ready. Please review and update your payment. Thank you!`;
      }
      return `🍱 *STUDY FUEL TIFFIN SERVICE - MONTHLY BILL (${monthName || 'Current Month'})*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customer.name}
📞 *Phone:* ${customer.phone}
📍 *Area:* ${customer.area}
${customer.building ? `🏢 *Building:* ${customer.building} (${customer.flatNo || ''})\n` : ''}
📊 *MONTHLY TIFFIN COUNT:*
• ☀️ Lunch Delivered: ${summary.lunchDelivered}
• 🌙 Dinner Delivered: ${summary.dinnerDelivered}
• ⭐ Extra Guest Tiffins: ${summary.extraTiffins}
━━━━━━━━━━━━━━━━━━━━
✨ *TOTAL DELIVERED TIFFINS:* ${summary.totalTiffins}
❌ *Leaves/Skips Recorded:* ${summary.skippedDays} days

💰 *BILLING SUMMARY:*
• Plan: ${summary.planType === 'per_tiffin' ? `₹${summary.ratePerTiffin}/tiffin` : `Monthly Fixed Plan (₹${summary.monthlyFixedRate})`}
• Gross Amount: ${formatCurrency(summary.calculatedAmount)}
• Advance/Received: ${formatCurrency(summary.advancePaid)}
━━━━━━━━━━━━━━━━━━━━
🔴 *NET DUE AMOUNT: ${formatCurrency(summary.dueAmount)}*
━━━━━━━━━━━━━━━━━━━━
💳 *Pay via UPI:* studyfuel@upi (GPay / PhonePe / Paytm)
Please share a screenshot after completing payment. Fuel your studies with Study Fuel! 🙏`;
    }
  },
  {
    id: 'leave_confirmed',
    title: 'Leave / Skip Request Confirmed',
    badge: 'Leave Note',
    generateText: ({ customer, dateStr, slot }) => {
      const slotName = slot ? (slot === 'lunch' ? 'Lunch' : 'Dinner') : 'Tiffin';
      return `❌ *Tiffin Skip / Leave Confirmed*
━━━━━━━━━━━━━━━━━━━━
Hello *${customer.name}*,

Your skip / leave request for *${dateStr || 'upcoming date'}* (*${slotName}*) has been recorded.

This meal will not be counted in your monthly billing. Service will resume normally on your next scheduled meal.

Thank you! 🍱`;
    }
  },
  {
    id: 'tomorrow_confirmation',
    title: 'Tomorrow Meal Confirmation',
    badge: 'Advance Check',
    generateText: ({ customer }) => {
      return `👋 *Study Fuel Tiffin Service - Daily Check*
━━━━━━━━━━━━━━━━━━━━
Hello *${customer.name}*,

Checking in regarding your meal schedule for tomorrow:
• Meal Slot: ${customer.scheduleSlot === 'both' ? 'Lunch & Dinner' : customer.scheduleSlot === 'lunch_only' ? 'Lunch Only' : 'Dinner Only'}
• Diet Preference: ${customer.mealPreference.toUpperCase()}

If you need your meal as scheduled, no action is needed. If you wish to skip or request extra tiffins, please inform us before 10:00 PM tonight.

Thank you! 🙏`;
    }
  }
];

export function getWhatsAppUrl(phone: string, text: string): string {
  const sanitized = sanitizePhoneNumber(phone);
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${sanitized}?text=${encoded}`;
}

export function openWhatsAppWithText(phone: string, text: string): void {
  const url = getWhatsAppUrl(phone, text);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 200);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Automatically dispatches the instant delivery confirmation WhatsApp message
 * when a meal is marked as delivered for a customer.
 */
export function sendAutomaticDeliveryWhatsApp(
  customer: Customer,
  slot: 'breakfast' | 'lunch' | 'dinner' | string,
  dateStr?: string,
  riderName?: string
): void {
  // Automatic WhatsApp popup on Deliver click has been disabled as requested by user.
  // Delivery clicks only count and save attendance in profiles/calendars.
  // Messages are sent exclusively via manual message buttons.
}

/**
 * Generates an all-in-one building group broadcast message (e.g. for Rizvi Apartment WhatsApp group)
 */
export function generateBuildingGroupBroadcastText(
  buildingName: string,
  customers: Customer[],
  slot: 'lunch' | 'dinner' | string,
  dateStr?: string,
  riderName?: string
): string {
  const slotName = slot === 'lunch' ? 'Lunch' : slot === 'dinner' ? 'Dinner' : 'Tiffin';
  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const residentList = customers
    .map((c, i) => `${i + 1}. *${c.flatNo || `Flat ${i + 1}`}* — ${c.name} (${c.mealPreference.toUpperCase()}) ✅`)
    .join('\n');

  return `🍱 *Study Fuel Tiffin Service - ${buildingName} Bulk Delivery* 🏢
━━━━━━━━━━━━━━━━━━━━
Hello Residents of *${buildingName}*!

All *${customers.length} ${slotName} Tiffins* for ${dateStr || 'today'} have been safely delivered to your building! 🛵💨

📋 *Delivered Residents (${customers.length} Tiffins):*
${residentList}

⏰ Delivery Time: ${currentTime}
🛵 Delivered By: ${riderName || 'Imran (Bandra Route)'}

Please collect your fresh, warm tiffins. Fuel your studies & work with healthy food! 🍲
*Study Fuel* 🙏`;
}

/**
 * Generates individual resident delivery message
 */
export function generateResidentDeliveryText(
  customer: Customer,
  slot: 'lunch' | 'dinner' | string,
  dateStr?: string,
  riderName?: string
): string {
  const slotName = slot === 'lunch' ? 'Lunch' : slot === 'dinner' ? 'Dinner' : 'Tiffin';
  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return `🍱 *Study Fuel Tiffin Service - Delivery Confirmation*
━━━━━━━━━━━━━━━━━━━━
Hello *${customer.name}*,

Your *${slotName} Tiffin* for ${dateStr || 'today'} has been delivered at *${customer.building || customer.address || 'Drop Point'}* (${customer.flatNo ? `Flat ${customer.flatNo}` : customer.address})! ✅

⏰ Delivery Time: ${currentTime}
🏢 Location: ${customer.building || customer.address || 'Drop Point'}
🛵 Delivered By: ${riderName || customer.assignedRider || 'Delivery Executive'}

Please enjoy your warm, fresh meal. Fuel your studies and work with good food! 🍲
Thank you for choosing Study Fuel! 🙏`;
}

