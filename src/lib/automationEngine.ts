import {
  Customer,
  AttendanceStore,
  AutomatedReminder,
  ActivityLogItem,
  AutomationSettings,
  ReminderType
} from '../types';
import { TODAY_STR } from '../data/initialData';
import { sounds } from './soundEffects';

const STORAGE_KEY_AUTOMATION_SETTINGS = 'tiffinsaas_automation_settings_v1';
const STORAGE_KEY_REMINDER_QUEUE = 'tiffinsaas_reminder_queue_v1';
const STORAGE_KEY_REMINDER_SENT = 'tiffinsaas_reminder_sent_v1';
const STORAGE_KEY_ACTIVITY_STREAM = 'tiffinsaas_activity_stream_v1';

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  enabled: true,
  morningTime: '08:30',
  lunchDispatchTime: '12:15',
  eveningTime: '16:30',
  dinnerDispatchTime: '19:30',
  paymentDueThreshold: 500,
  enableBrowserNotifications: true,
  enableSoundAlerts: true,
  autoQueueDeliveryConfirmations: true
};

export function getStoredAutomationSettings(): AutomationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTOMATION_SETTINGS);
    if (raw) {
      return { ...DEFAULT_AUTOMATION_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading automation settings', e);
  }
  return DEFAULT_AUTOMATION_SETTINGS;
}

export function saveStoredAutomationSettings(settings: AutomationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTOMATION_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving automation settings', e);
  }
}

export function getStoredReminderQueue(): AutomatedReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REMINDER_QUEUE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading reminder queue', e);
  }
  return [];
}

export function saveStoredReminderQueue(queue: AutomatedReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REMINDER_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving reminder queue', e);
  }
}

export function getStoredSentReminders(): AutomatedReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REMINDER_SENT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading sent reminders', e);
  }
  return [];
}

export function saveStoredSentReminders(list: AutomatedReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REMINDER_SENT, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving sent reminders', e);
  }
}

export function getStoredActivityStream(): ActivityLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITY_STREAM);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading activity stream', e);
  }
  return [];
}

export function saveStoredActivityStream(items: ActivityLogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVITY_STREAM, JSON.stringify(items.slice(0, 50)));
  } catch (e) {
    console.error('Error saving activity stream', e);
  }
}

export function logActivity(
  type: ActivityLogItem['type'],
  message: string,
  details?: string,
  customerId?: string,
  customerName?: string
): void {
  const current = getStoredActivityStream();
  const newItem: ActivityLogItem = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    details,
    customerId,
    customerName
  };
  saveStoredActivityStream([newItem, ...current]);
}

/**
 * Generates automated reminder message templates
 */
export function buildReminderMessage(
  type: ReminderType,
  customer: Customer,
  dateStr: string,
  extraData?: { dueAmount?: number; riderName?: string; meal?: string }
): string {
  const dObj = new Date(dateStr + 'T00:00:00');
  const dayName = dObj.toLocaleDateString('en-US', { weekday: 'long' });

  switch (type) {
    case 'morning_confirm':
      return `🍱 *Good Morning ${customer.name}!*\n\nYour *${dayName} Lunch Tiffin* is scheduled for preparation. If you need any change or wish to take a leave/skip today, please inform us or toggle on your customer portal before 10:00 AM.\n\nHave a wonderful and productive day! 🙏`;

    case 'lunch_dispatch':
      return `🛵 *Lunch Tiffin Out For Delivery!*\n\nHello ${customer.name}, your fresh hot home-style lunch is on its way with delivery partner *${customer.assignedRider || 'our rider'}*.\n\nEnjoy your meal! 🍛`;

    case 'evening_confirm':
      return `🌙 *Good Evening ${customer.name}!*\n\nThis is a quick reminder for your *Dinner Tiffin* tonight. Please let us know before 6:00 PM if you need to skip or request extra tiffins for guests.\n\nThank you! 🍽️`;

    case 'dinner_dispatch':
      return `🛵 *Dinner Tiffin Out For Delivery!*\n\nHello ${customer.name}, your hot dinner tiffin has been dispatched with delivery partner *${customer.assignedRider || 'our rider'}*.\n\nHave a great dinner and relaxing night! ✨`;

    case 'delivery_confirmed':
      return `✅ *Tiffin Delivered Successfully!*\n\nHello ${customer.name}, your ${extraData?.meal || 'meal'} tiffin has been delivered to *${customer.address}*. Please let us know if everything is to your satisfaction.\n\nThank you! 🍱`;

    case 'payment_due':
      return `💳 *Monthly Tiffin Bill Reminder*\n\nHello ${customer.name}, your current outstanding statement shows a pending balance of *₹${extraData?.dueAmount || 0}*.\n\nYou can pay easily via UPI to *9876511223@upi* (Google Pay / PhonePe / Paytm). Thank you for your continued support! 🙏`;

    default:
      return `Hello ${customer.name}, updates regarding your tiffin service at TiffinFlow.`;
  }
}

/**
 * Initializes or refreshes the automated reminder queue for a given date
 */
export function generateAutomatedDailyQueue(
  targetDate: string,
  customers: Customer[],
  attendance: AttendanceStore,
  settings: AutomationSettings
): AutomatedReminder[] {
  const existingQueue = getStoredReminderQueue();
  const existingSent = getStoredSentReminders();

  const generated: AutomatedReminder[] = [];

  customers.forEach((cust) => {
    if (cust.status !== 'active') return;

    const record = attendance[cust.id]?.[targetDate];
    const isLunchActive = cust.scheduleSlot === 'lunch_only' || cust.scheduleSlot === 'both';
    const isDinnerActive = cust.scheduleSlot === 'dinner_only' || cust.scheduleSlot === 'both';

    // 1. Morning Lunch Confirmation Reminder
    if (isLunchActive && record?.lunch !== 'skipped') {
      const id = `rem-${cust.id}-${targetDate}-morning_confirm`;
      const alreadySent = existingSent.some((r) => r.id === id);
      const inQueue = existingQueue.find((r) => r.id === id);

      if (!alreadySent) {
        generated.push(
          inQueue || {
            id,
            customerId: cust.id,
            customerName: cust.name,
            phone: cust.phone,
            type: 'morning_confirm',
            scheduledTime: settings.morningTime,
            targetDate,
            message: buildReminderMessage('morning_confirm', cust, targetDate),
            status: 'pending',
            targetMeal: 'lunch'
          }
        );
      }
    }

    // 2. Evening Dinner Confirmation Reminder
    if (isDinnerActive && record?.dinner !== 'skipped') {
      const id = `rem-${cust.id}-${targetDate}-evening_confirm`;
      const alreadySent = existingSent.some((r) => r.id === id);
      const inQueue = existingQueue.find((r) => r.id === id);

      if (!alreadySent) {
        generated.push(
          inQueue || {
            id,
            customerId: cust.id,
            customerName: cust.name,
            phone: cust.phone,
            type: 'evening_confirm',
            scheduledTime: settings.eveningTime,
            targetDate,
            message: buildReminderMessage('evening_confirm', cust, targetDate),
            status: 'pending',
            targetMeal: 'dinner'
          }
        );
      }
    }

    // 3. Lunch Out for Delivery Alert
    if (isLunchActive && record?.lunch !== 'skipped') {
      const id = `rem-${cust.id}-${targetDate}-lunch_dispatch`;
      const alreadySent = existingSent.some((r) => r.id === id);
      const inQueue = existingQueue.find((r) => r.id === id);

      if (!alreadySent) {
        generated.push(
          inQueue || {
            id,
            customerId: cust.id,
            customerName: cust.name,
            phone: cust.phone,
            type: 'lunch_dispatch',
            scheduledTime: settings.lunchDispatchTime,
            targetDate,
            message: buildReminderMessage('lunch_dispatch', cust, targetDate, { riderName: cust.assignedRider }),
            status: 'pending',
            targetMeal: 'lunch'
          }
        );
      }
    }

    // 4. Dinner Out for Delivery Alert
    if (isDinnerActive && record?.dinner !== 'skipped') {
      const id = `rem-${cust.id}-${targetDate}-dinner_dispatch`;
      const alreadySent = existingSent.some((r) => r.id === id);
      const inQueue = existingQueue.find((r) => r.id === id);

      if (!alreadySent) {
        generated.push(
          inQueue || {
            id,
            customerId: cust.id,
            customerName: cust.name,
            phone: cust.phone,
            type: 'dinner_dispatch',
            scheduledTime: settings.dinnerDispatchTime,
            targetDate,
            message: buildReminderMessage('dinner_dispatch', cust, targetDate, { riderName: cust.assignedRider }),
            status: 'pending',
            targetMeal: 'dinner'
          }
        );
      }
    }
  });

  saveStoredReminderQueue(generated);
  return generated;
}

/**
 * Dispatches a reminder directly via WhatsApp Web
 */
export function triggerSendReminderWhatsApp(reminder: AutomatedReminder): void {
  const cleanPhone = reminder.phone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(reminder.message);
  const url = `https://wa.me/${finalPhone}?text=${encodedText}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Marks a reminder as successfully sent and records in audit log
 */
export function markReminderSent(
  reminderId: string,
  queue: AutomatedReminder[],
  setQueue: (q: AutomatedReminder[]) => void,
  sentList: AutomatedReminder[],
  setSentList: (s: AutomatedReminder[]) => void
): void {
  const item = queue.find((r) => r.id === reminderId);
  if (!item) return;

  const updatedItem: AutomatedReminder = {
    ...item,
    status: 'sent',
    sentAt: new Date().toISOString()
  };

  const updatedQueue = queue.filter((r) => r.id !== reminderId);
  const updatedSent = [updatedItem, ...sentList];

  setQueue(updatedQueue);
  saveStoredReminderQueue(updatedQueue);

  setSentList(updatedSent);
  saveStoredSentReminders(updatedSent);

  logActivity(
    'reminder',
    `Automated reminder sent to ${item.customerName}`,
    `${item.type.replace('_', ' ').toUpperCase()} (${item.scheduledTime})`,
    item.customerId,
    item.customerName
  );

  sounds.playNotificationPing();
}

/**
 * Triggers native browser desktop notification if supported and permitted
 */
export function sendBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    } catch {
      // Fallback
    }
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch {}
      }
    });
  }
}
