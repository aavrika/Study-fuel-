import React, { useState, useEffect } from 'react';
import { Customer, MealPreference, PlanType, ScheduleSlot } from '../types';
import { RIDERS_LIST } from '../data/initialData';
import { X, User, Phone, MapPin, DollarSign, Bike, FileText, Check, Coffee, Sun, Moon, Utensils } from 'lucide-react';

interface AddEditCustomerModalProps {
  customerToEdit: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (customer: Customer) => void;
}

export const AddEditCustomerModal: React.FC<AddEditCustomerModalProps> = ({
  customerToEdit,
  isOpen,
  onClose,
  onSaveCustomer
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('IT Park Phase 1');
  const [landmark, setLandmark] = useState('');
  const [mealPreference, setMealPreference] = useState<MealPreference>('veg');
  const [planType, setPlanType] = useState<PlanType>('per_tiffin');
  const [scheduleSlot, setScheduleSlot] = useState<ScheduleSlot>('both');
  const [ratePerTiffin, setRatePerTiffin] = useState<number>(75);
  const [lunchRate, setLunchRate] = useState<number>(75);
  const [dinnerRate, setDinnerRate] = useState<number>(75);
  const [breakfastRate, setBreakfastRate] = useState<number>(50);
  const [includesBreakfast, setIncludesBreakfast] = useState<boolean>(false);
  const [monthlyFixedRate, setMonthlyFixedRate] = useState<number>(3500);
  const [assignedRider, setAssignedRider] = useState<string>(RIDERS_LIST[0]);
  const [notes, setNotes] = useState('');
  const [advancePaid, setAdvancePaid] = useState<number>(0);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setAddress(customerToEdit.address);
      setArea(customerToEdit.area);
      setLandmark(customerToEdit.landmark || '');
      setMealPreference(customerToEdit.mealPreference);
      setPlanType(customerToEdit.planType);
      setScheduleSlot(customerToEdit.scheduleSlot);
      setRatePerTiffin(customerToEdit.ratePerTiffin ?? 75);
      setLunchRate(customerToEdit.lunchRate ?? customerToEdit.ratePerTiffin ?? 75);
      setDinnerRate(customerToEdit.dinnerRate ?? customerToEdit.ratePerTiffin ?? 75);
      setBreakfastRate(customerToEdit.breakfastRate ?? 50);
      setIncludesBreakfast(!!customerToEdit.includesBreakfast);
      setMonthlyFixedRate(customerToEdit.monthlyFixedRate ?? 3500);
      setAssignedRider(customerToEdit.assignedRider);
      setNotes(customerToEdit.notes || '');
      setAdvancePaid(customerToEdit.advancePaid || 0);
    } else {
      setName('');
      setPhone('+91 ');
      setAddress('');
      setArea('IT Park Phase 1');
      setLandmark('');
      setMealPreference('veg');
      setPlanType('per_tiffin');
      setScheduleSlot('both');
      setRatePerTiffin(75);
      setLunchRate(75);
      setDinnerRate(75);
      setBreakfastRate(50);
      setIncludesBreakfast(false);
      setMonthlyFixedRate(3500);
      setAssignedRider(RIDERS_LIST[0]);
      setNotes('');
      setAdvancePaid(0);
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedCustomer: Customer = {
      id: customerToEdit ? customerToEdit.id : `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      area: area.trim(),
      landmark: landmark.trim(),
      mealPreference,
      planType,
      scheduleSlot,
      ratePerTiffin: Number(ratePerTiffin) || 75,
      lunchRate: Number(lunchRate) || Number(ratePerTiffin) || 75,
      dinnerRate: Number(dinnerRate) || Number(ratePerTiffin) || 75,
      breakfastRate: Number(breakfastRate) || 50,
      includesBreakfast,
      monthlyFixedRate: Number(monthlyFixedRate) || 3500,
      status: customerToEdit ? customerToEdit.status : 'active',
      startDate: customerToEdit ? customerToEdit.startDate : new Date().toISOString().split('T')[0],
      assignedRider,
      notes: notes.trim(),
      advancePaid: Number(advancePaid) || 0
    };

    onSaveCustomer(savedCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl my-4 overflow-hidden">
        
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              👤
            </span>
            <div>
              <h2 className="text-base font-bold">
                {customerToEdit ? 'Edit Customer Details & Pricing' : 'Add New Tiffin Customer & Set Price'}
              </h2>
              <p className="text-xs text-stone-400">Set custom rate, meal plan (Lunch/Dinner/Both), and breakfast</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Customer Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Phone Number * <span className="text-[11px] text-amber-700 font-normal">(Used for Customer Login)</span>
              </label>
              <input
                type="text"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-medium"
              />
            </div>
          </div>

          {/* Delivery Address & Area */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Delivery Address (Flat / House / Office) *</label>
            <input
              type="text"
              required
              placeholder="e.g. Flat 402, Sunshine Heights, Tech Park Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Delivery Area / Route *</label>
              <input
                type="text"
                required
                placeholder="e.g. IT Park Phase 1, Sector 14"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Landmark (Optional)</label>
              <input
                type="text"
                placeholder="Near Infosys Gate 2"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
          </div>

          {/* Meal Plan Options (Lunch Only / Dinner Only / Both) */}
          <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
            <label className="block text-xs font-bold text-stone-800 mb-2">
              🍱 Select Meal Plan (Choose preferred delivery schedule) *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScheduleSlot('lunch_only')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  scheduleSlot === 'lunch_only'
                    ? 'bg-amber-500 text-stone-950 border-amber-600 font-black shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 font-bold'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-xs">Lunch Only</span>
                <span className="text-[10px] opacity-80">☀️ Afternoon</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleSlot('dinner_only')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  scheduleSlot === 'dinner_only'
                    ? 'bg-indigo-600 text-white border-indigo-700 font-black shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 font-bold'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-xs">Dinner Only</span>
                <span className="text-[10px] opacity-80">🌙 Evening</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleSlot('both')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  scheduleSlot === 'both'
                    ? 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 font-bold'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span className="text-xs">Both Plans</span>
                <span className="text-[10px] opacity-80">☀️ Lunch + 🌙 Dinner</span>
              </button>
            </div>

            {/* Breakfast Add-on Checkbox */}
            <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesBreakfast}
                  onChange={(e) => setIncludesBreakfast(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-700" />
                  <span>Include Breakfast (Fix ₹50/day standard)</span>
                </span>
              </label>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">
                ₹{breakfastRate} / breakfast
              </span>
            </div>
          </div>

          {/* Pricing Control Section ("Price mai khud set krunga") */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Pricing Configuration (Custom Rates)</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Custom Pricing
              </span>
            </div>

            {/* Pricing Model & Per Tiffin Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Billing Type</label>
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as PlanType)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-semibold"
                >
                  <option value="per_tiffin">Per Tiffin Counting</option>
                  <option value="monthly_fixed">Monthly Fixed Rate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Tiffin Rate (₹/tiffin) *
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={ratePerTiffin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRatePerTiffin(val);
                    setLunchRate(val);
                    setDinnerRate(val);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-black text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Breakfast Rate (₹ fix)
                </label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={breakfastRate}
                  onChange={(e) => setBreakfastRate(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-black"
                />
              </div>
            </div>

            {planType === 'monthly_fixed' && (
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Monthly Fixed Amount (₹/month)
                </label>
                <input
                  type="number"
                  value={monthlyFixedRate}
                  onChange={(e) => setMonthlyFixedRate(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 bg-white rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-black"
                />
              </div>
            )}
          </div>

          {/* Diet Preference & Rider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Dietary Preference *</label>
              <select
                value={mealPreference}
                onChange={(e) => setMealPreference(e.target.value as MealPreference)}
                className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-semibold"
              >
                <option value="veg">Pure Vegetarian (🥬 Veg)</option>
                <option value="jain">Jain (No Onion / Garlic)</option>
                <option value="non_veg">Non-Vegetarian (🍗 Non-Veg)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Assign Delivery Rider</label>
              <select
                value={assignedRider}
                onChange={(e) => setAssignedRider(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-medium"
              >
                {RIDERS_LIST.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advance Amount Paid */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Advance Amount Received (₹)</label>
            <input
              type="number"
              value={advancePaid}
              onChange={(e) => setAdvancePaid(Number(e.target.value))}
              placeholder="0"
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900 font-bold"
            />
          </div>

          {/* Notes / Special Instructions */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Special Instructions / Food Notes</label>
            <input
              type="text"
              placeholder="e.g. Less spicy, 4 soft chapatis, door bell broken..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 text-stone-900"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              {customerToEdit ? 'Save Changes' : 'Add Customer & Start Service'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
