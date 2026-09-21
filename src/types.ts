export type MealPreference = 'veg' | 'non_veg' | 'jain';
export type PlanType = 'per_tiffin' | 'monthly_fixed';
export type ScheduleSlot = 'lunch_only' | 'dinner_only' | 'both';
export type CustomerStatus = 'active' | 'paused' | 'archived';
export type DeliveryStatus = 'pending' | 'dispatched' | 'delivered' | 'skipped';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  building?: string; // e.g. "Rizvi Apartment"
  flatNo?: string;   // e.g. "Flat 101"
  area: string;
  landmark?: string;
  mealPreference: MealPreference;
  planType: PlanType;
  scheduleSlot: ScheduleSlot;
  ratePerTiffin: number; // e.g. 75 (user customized)
  breakfastRate: number; // default fixed 50
  lunchRate?: number; // custom lunch rate if different
  dinnerRate?: number; // custom dinner rate if different
  monthlyFixedRate: number; // e.g. 3500 (user customized)
  includesBreakfast?: boolean; // toggle breakfast inclusion
  status: CustomerStatus;
  startDate: string; // YYYY-MM-DD
  assignedRider: string;
  notes?: string;
  advancePaid: number;
}

export interface BuildingDropCluster {
  buildingName: string;
  area: string;
  address: string;
  customers: Customer[];
  assignedRider?: string;
}

export type DayMealStatus = 'delivered' | 'skipped' | 'none';

export interface DayAttendance {
  date: string; // YYYY-MM-DD
  breakfast?: DayMealStatus; // 'delivered' | 'skipped' | 'none' (Fix price 50)
  lunch: DayMealStatus;
  dinner: DayMealStatus;
  extraTiffins: number; // e.g. 1 or 2 extra
  notes?: string;
  deliveryTimeLunch?: string;
  deliveryTimeDinner?: string;
  deliveryTimeBreakfast?: string;
}

export interface CustomerAttendanceMap {
  [dateStr: string]: DayAttendance;
}

export interface AttendanceStore {
  [customerId: string]: CustomerAttendanceMap;
}

export interface MonthlyCustomerSummary {
  customerId: string;
  customerName: string;
  phone: string;
  area: string;
  planType: PlanType;
  ratePerTiffin: number;
  breakfastRate: number;
  monthlyFixedRate: number;
  breakfastDelivered: number;
  breakfastAmount: number;
  lunchDelivered: number;
  dinnerDelivered: number;
  extraTiffins: number;
  totalTiffins: number; // lunch + dinner + extra
  totalMealsDelivered: number; // lunch + dinner + extra + breakfast
  totalDaysServed: number;
  skippedDays: number;
  calculatedAmount: number;
  advancePaid: number;
  dueAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
}

export interface DailyMenuItem {
  dayName: string;
  breakfast?: {
    item: string;
    special?: string;
  };
  lunch: {
    sabzi1: string;
    sabzi2: string;
    dal: string;
    bread: string;
    rice: string;
    special?: string;
  };
  dinner: {
    sabzi1: string;
    sabzi2: string;
    dal: string;
    bread: string;
    rice: string;
    special?: string;
  };
}

export type ReminderType =
  | 'morning_confirm'
  | 'lunch_dispatch'
  | 'evening_confirm'
  | 'dinner_dispatch'
  | 'delivery_confirmed'
  | 'payment_due';

export type ReminderStatus = 'pending' | 'sent' | 'skipped' | 'failed';

export interface AutomatedReminder {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  type: ReminderType;
  scheduledTime: string; // e.g. "08:30" or ISO
  targetDate: string; // YYYY-MM-DD
  message: string;
  status: ReminderStatus;
  sentAt?: string;
  targetMeal?: 'breakfast' | 'lunch' | 'dinner' | 'general';
}

export interface ActivityLogItem {
  id: string;
  timestamp: string; // ISO string
  type: 'delivery' | 'skip' | 'extra' | 'reminder' | 'payment';
  message: string;
  details?: string;
  customerId?: string;
  customerName?: string;
}

export interface AutomationSettings {
  enabled: boolean;
  morningTime: string; // "08:30"
  lunchDispatchTime: string; // "12:15"
  eveningTime: string; // "16:30"
  dinnerDispatchTime: string; // "19:30"
  paymentDueThreshold: number; // e.g. 500
  enableBrowserNotifications: boolean;
  enableSoundAlerts: boolean;
  autoQueueDeliveryConfirmations: boolean;
}
