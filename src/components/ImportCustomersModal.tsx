import React, { useState } from 'react';
import { Customer } from '../types';
import { X, Upload, Clipboard, Check, AlertCircle, FileSpreadsheet, Users } from 'lucide-react';

interface ImportCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomers: (newCustomers: Customer[]) => void;
}

export const ImportCustomersModal: React.FC<ImportCustomersModalProps> = ({
  isOpen,
  onClose,
  onAddCustomers
}) => {
  const [inputText, setInputText] = useState('');
  const [defaultArea, setDefaultArea] = useState('IAS PG / Main Campus');
  const [defaultRate, setDefaultRate] = useState(75);
  const [defaultSlot, setDefaultSlot] = useState<'both' | 'lunch_only' | 'dinner_only'>('both');
  const [previewList, setPreviewList] = useState<Partial<Customer>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-parse on text change or button click
  const handleParse = (text: string) => {
    setInputText(text);
    setParseError(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setPreviewList([]);
      return;
    }

    // Try parsing as JSON first
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const formatted = list.map((item, idx) => ({
          name: item.name || item.customerName || item.studentName || item.residentName || `Customer ${idx + 1}`,
          phone: item.phone || item.mobile || item.contact || '+91 9876543210',
          address: item.address || item.roomNo || item.flatNo || item.room || 'IAS PG',
          building: item.building || 'IAS PG',
          area: item.area || defaultArea,
          mealPreference: item.mealPreference || item.diet || 'veg',
          ratePerTiffin: Number(item.ratePerTiffin || item.rate || defaultRate),
          scheduleSlot: item.scheduleSlot || defaultSlot
        }));
        setPreviewList(formatted);
        return;
      } catch {
        // Fallback to text lines
      }
    }

    // Parse line by line (Supports CSV, TSV, or comma/dash separated text: Name, Phone, Room/Address)
    const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
    const results: Partial<Customer>[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip CSV headers like "Name,Phone,Address"
      if (i === 0 && (line.toLowerCase().includes('name') && (line.toLowerCase().includes('phone') || line.toLowerCase().includes('mobile')))) {
        continue;
      }

      // Split by tab, comma, semicolon or pipe
      let parts = line.split(/[,\t|;]/).map((p) => p.trim());
      if (parts.length === 1 && line.includes('-')) {
        parts = line.split('-').map((p) => p.trim());
      }

      const name = parts[0] || `Customer ${i + 1}`;
      let phone = parts[1] || '';
      // If phone is missing or contains letters, check next parts
      if (!phone.replace(/\D/g, '') && parts.length > 2) {
        phone = parts[2];
      }
      if (!phone.startsWith('+91') && phone.replace(/\D/g, '').length === 10) {
        phone = `+91 ${phone.replace(/\D/g, '')}`;
      } else if (!phone) {
        phone = '+91 9800000000';
      }

      const roomOrAddress = parts[2] || parts[3] || 'IAS PG Room';

      results.push({
        name,
        phone,
        address: roomOrAddress,
        building: 'IAS PG',
        area: defaultArea,
        mealPreference: 'veg',
        ratePerTiffin: defaultRate,
        scheduleSlot: defaultSlot
      });
    }

    if (results.length === 0) {
      setParseError('No customers could be parsed. Check the format below.');
    }
    setPreviewList(results);
  };

  const handleConfirmImport = () => {
    if (previewList.length === 0) return;

    const timestamp = Date.now();
    const formattedCustomers: Customer[] = previewList.map((p, idx) => ({
      id: `cust-ias-${timestamp}-${idx}`,
      name: p.name || `Customer ${idx + 1}`,
      phone: p.phone || '+91 9800000000',
      address: p.address || 'IAS PG',
      building: p.building || 'IAS PG',
      flatNo: p.flatNo || p.address || '',
      area: p.area || defaultArea,
      landmark: p.landmark || 'Near Main Gate',
      mealPreference: (p.mealPreference as any) || 'veg',
      planType: 'per_tiffin',
      scheduleSlot: (p.scheduleSlot as any) || defaultSlot,
      ratePerTiffin: Number(p.ratePerTiffin || defaultRate),
      breakfastRate: 50,
      lunchRate: Number(p.ratePerTiffin || defaultRate),
      dinnerRate: Number(p.ratePerTiffin || defaultRate),
      monthlyFixedRate: 3500,
      includesBreakfast: false,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      assignedRider: 'Rider 1 (Vikas)',
      notes: 'Imported from IAS PG list',
      advancePaid: 0
    }));

    onAddCustomers(formattedCustomers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl my-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import IAS PG / Bulk Customers</h2>
              <p className="text-xs text-stone-400">Add multiple customers at once via CSV, text or JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">IAS PG Customers Import:</strong> Aap apne purane IAS PG ERP ya Excel se data yahan paste kar sakte hain. Format: <code>Name, Mobile, Room No</code> (Har line par 1 student/customer).
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Building / Area Name</label>
              <input
                type="text"
                value={defaultArea}
                onChange={(e) => setDefaultArea(e.target.value)}
                placeholder="IAS PG / Campus"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Rate Per Tiffin (₹)</label>
              <input
                type="number"
                value={defaultRate}
                onChange={(e) => setDefaultRate(Number(e.target.value))}
                placeholder="75"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Default Meal Slot</label>
              <select
                value={defaultSlot}
                onChange={(e) => setDefaultSlot(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:border-amber-500 outline-none font-semibold text-stone-800"
              >
                <option value="both">☀️ Lunch + 🌙 Dinner</option>
                <option value="lunch_only">☀️ Lunch Only</option>
                <option value="dinner_only">🌙 Dinner Only</option>
              </select>
            </div>
          </div>

          {/* Paste Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-stone-700">Paste Customer Data (One per line)</label>
              <span className="text-[11px] text-stone-400">e.g. Rahul Sharma, 9876543210, Room 204</span>
            </div>
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder={`Rahul Sharma, 9876543210, Room 101
Ankit Kumar, 9811223344, Room 102
Pooja Verma, 9822334455, Room 204
Deepak Patel, 9833445566, Room 305`}
              className="w-full font-mono text-xs p-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 text-stone-900"
            />
          </div>

          {/* Sample IAS PG Template Quick Loader */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Fast sample:</span>
            <button
              type="button"
              onClick={() => {
                const sample = `Aman Tripathi, 9876501234, IAS PG Room 101
Shubham Yadav, 9876505678, IAS PG Room 104
Naveen Joshi, 9876509988, IAS PG Room 202
Priya Mishra, 9876504433, IAS PG Room 205
Rohan Pandey, 9876507711, IAS PG Room 301`;
                handleParse(sample);
              }}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium"
            >
              Load Sample IAS PG List
            </button>
          </div>

          {/* Preview Table */}
          {previewList.length > 0 && (
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700 flex justify-between">
                <span>Recognized Customers ({previewList.length})</span>
                <span className="text-emerald-700">Ready to Import</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-stone-100 text-xs">
                {previewList.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between bg-white hover:bg-stone-50">
                    <div>
                      <span className="font-bold text-stone-900">{item.name}</span>
                      <span className="text-stone-400 mx-1.5">•</span>
                      <span className="font-mono text-stone-600">{item.phone}</span>
                    </div>
                    <div className="text-stone-500 text-[11px]">
                      {item.address || 'IAS PG'} (₹{item.ratePerTiffin || defaultRate})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parseError && (
            <p className="text-xs text-rose-600 font-medium">{parseError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={previewList.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            Import {previewList.length} Customers Now
          </button>
        </div>
      </div>
    </div>
  );
};
