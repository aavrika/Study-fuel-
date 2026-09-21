import { Customer, AttendanceStore, DailyMenuItem } from '../types';

// Dynamic today string: YYYY-MM-DD
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
export const TODAY_STR = `${year}-${month}-${day}`;

// Clean Initial State: Zero demo customers by default
export const INITIAL_CUSTOMERS: Customer[] = [];

// Clean Initial State: Empty attendance store by default
export function generateInitialAttendance(): AttendanceStore {
  return {};
}

// Kitchen Weekly Menu Template (Customizable by chef/owner)
export const WEEKLY_MENU: DailyMenuItem[] = [
  {
    dayName: 'Monday',
    lunch: {
      sabzi1: 'Paneer Makhani',
      sabzi2: 'Aloo Methi',
      dal: 'Yellow Dal Tadka',
      bread: '4 Tawa Butter Roti',
      rice: 'Jeera Rice',
      special: 'Boondi Raita & Salad'
    },
    dinner: {
      sabzi1: 'Mix Vegetable Curry',
      sabzi2: 'Bhindi Masala',
      dal: 'Dal Fry',
      bread: '4 Roti',
      rice: 'Steamed Basmati Rice',
      special: 'Gulab Jamun (1 pc)'
    }
  },
  {
    dayName: 'Tuesday',
    lunch: {
      sabzi1: 'Chole Masala',
      sabzi2: 'Lauki Chana Dal',
      dal: 'Gujarati Kadi',
      bread: '4 Phulka',
      rice: 'Pulao',
      special: 'Fried Papad & Mint Chutney'
    },
    dinner: {
      sabzi1: 'Palak Paneer',
      sabzi2: 'Jeera Aloo',
      dal: 'Moong Dal',
      bread: '4 Roti',
      rice: 'Plain Rice',
      special: 'Green Salad'
    }
  },
  {
    dayName: 'Wednesday',
    lunch: {
      sabzi1: 'Rajma Masala (Punjabi Style)',
      sabzi2: 'Baingan Bharta',
      dal: 'Panchmel Dal',
      bread: '4 Butter Roti',
      rice: 'Jeera Rice',
      special: 'Cucumber Raita'
    },
    dinner: {
      sabzi1: 'Egg Curry / Mushroom Masala',
      sabzi2: 'Cabbage Mutter',
      dal: 'Dal Makhani',
      bread: '4 Roti',
      rice: 'Steamed Rice',
      special: 'Rice Kheer'
    }
  },
  {
    dayName: 'Thursday',
    lunch: {
      sabzi1: 'Kadhai Paneer',
      sabzi2: 'Gobi Aloo Dry',
      dal: 'Toor Dal Fry',
      bread: '4 Roti',
      rice: 'Peas Pulao',
      special: 'Curd & Pickle'
    },
    dinner: {
      sabzi1: 'Sev Tamatar Ki Sabzi',
      sabzi2: 'Tinda Masala',
      dal: 'Masoor Dal',
      bread: '4 Phulka',
      rice: 'Plain Rice',
      special: 'Onion Lachha'
    }
  },
  {
    dayName: 'Friday',
    lunch: {
      sabzi1: 'Kofta Curry (Malai Kofta)',
      sabzi2: 'French Beans Aloo',
      dal: 'Dal Tadka',
      bread: '4 Butter Roti',
      rice: 'Jeera Rice',
      special: 'Pineapple Raita'
    },
    dinner: {
      sabzi1: 'Soya Chaap Gravy',
      sabzi2: 'Karela Fry / Tindora',
      dal: 'Chana Dal',
      bread: '4 Roti',
      rice: 'Steamed Rice',
      special: 'Suji Halwa'
    }
  },
  {
    dayName: 'Saturday',
    lunch: {
      sabzi1: 'Dum Aloo Kashmiri',
      sabzi2: 'Shimla Mirch Besan',
      dal: 'Kadhi Pakoda',
      bread: '4 Roti',
      rice: 'Khichdi / Plain Rice',
      special: 'Roasted Papad'
    },
    dinner: {
      sabzi1: 'Paneer Butter Masala',
      sabzi2: 'Aloo Palak',
      dal: 'Yellow Dal',
      bread: '4 Roti',
      rice: 'Rice',
      special: 'Pickle & Salad'
    }
  },
  {
    dayName: 'Sunday',
    lunch: {
      sabzi1: 'Special Shahi Paneer / Chicken Curry',
      sabzi2: 'Aloo Gobi Mutter',
      dal: 'Dal Makhani',
      bread: '3 Missi / Butter Naan',
      rice: 'Veg Biryani',
      special: 'Gulab Jamun & Raita'
    },
    dinner: {
      sabzi1: 'Dal Khichdi & Aloo Chokha (Comfort Meal)',
      sabzi2: 'Dahi Aloo',
      dal: 'Comfort Dal',
      bread: '3 Phulka',
      rice: 'Comfort Khichdi',
      special: 'Ghee, Pickle, Papad'
    }
  }
];

export const RIDERS_LIST = [
  'Rider 1',
  'Rider 2',
  'Rider 3'
];
