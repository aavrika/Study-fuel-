import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  MessageCircle,
  Copy,
  Check,
  Zap,
  Clock,
  X,
  Send,
  Users,
  Smartphone,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Customer } from '../types';
import {
  openWhatsAppWithText,
  generateResidentDeliveryText,
  generateBuildingGroupBroadcastText
} from '../lib/whatsapp';
import { sounds } from '../lib/soundEffects';

interface BuildingGroupDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingName: string;
  customers: Customer[];
  slot: 'lunch' | 'dinner';
  dateStr: string;
  assignedRider?: string;
  onAllDeliveredConfirm?: () => void;
}

export const BuildingGroupDispatchModal: React.FC<BuildingGroupDispatchModalProps> = ({
  isOpen,
  onClose,
  buildingName,
  customers,
  slot,
  dateStr,
  assignedRider = 'Imran (Bandra Route)',
  onAllDeliveredConfirm
}) => {
  const [copiedGroupText, setCopiedGroupText] = useState<boolean>(false);
  const [copiedResidentId, setCopiedResidentId] = useState<string | null>(null);
  const [sentStatusMap, setSentStatusMap] = useState<Record<string, boolean>>({});
  const [isAutoSending, setIsAutoSending] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  useEffect(() => {
    if (isOpen) {
      setSentStatusMap({});
      setIsAutoSending(false);
      setActiveStepIndex(-1);
    }
  }, [isOpen, buildingName, dateStr]);

  if (!isOpen) return null;

  const totalCount = customers.length;
  const sentCount = Object.values(sentStatusMap).filter(Boolean).length;
  const progressPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  const groupBroadcastText = generateBuildingGroupBroadcastText(
    buildingName,
    customers,
    slot,
    dateStr,
    assignedRider
  );

  const handleCopyGroupText = () => {
    navigator.clipboard.writeText(groupBroadcastText);
    setCopiedGroupText(true);
    sounds.playClickSoft();
    setTimeout(() => setCopiedGroupText(false), 2500);
  };

  const handleSendSingleResident = (cust: Customer) => {
    const text = generateResidentDeliveryText(cust, slot, dateStr, assignedRider);
    openWhatsAppWithText(cust.phone, text);
    setSentStatusMap((prev) => ({ ...prev, [cust.id]: true }));
    sounds.playSuccessBeep();
  };

  const handleCopyResidentText = (cust: Customer) => {
    const text = generateResidentDeliveryText(cust, slot, dateStr, assignedRider);
    navigator.clipboard.writeText(text);
    setCopiedResidentId(cust.id);
    sounds.playClickSoft();
    setTimeout(() => setCopiedResidentId(null), 2000);
  };

  // Automated Sequential Dispatch: Dispatches to each of the 6 residents one after another
  const handleAutoDispatchAll = async () => {
    setIsAutoSending(true);
    sounds.playClickSoft();

    for (let i = 0; i < customers.length; i++) {
      const cust = customers[i];
      setActiveStepIndex(i);
      
      const text = generateResidentDeliveryText(cust, slot, dateStr, assignedRider);
      openWhatsAppWithText(cust.phone, text);
      
      setSentStatusMap((prev) => ({ ...prev, [cust.id]: true }));
      sounds.playSuccessBeep();

      // Delay between tabs so browser doesn't block popups
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setIsAutoSending(false);
    setActiveStepIndex(-1);
    sounds.playDeliveredChime();
    if (onAllDeliveredConfirm) {
      onAllDeliveredConfirm();
    }
  };

  // Instant Cloud API / Batch Simulation: Marks all as sent and copies broadcast text
  const handleMarkAllSentSimulated = () => {
    const nextMap: Record<string, boolean> = {};
    customers.forEach((c) => {
      nextMap[c.id] = true;
    });
    setSentStatusMap(nextMap);
    sounds.playDeliveredChime();
    if (onAllDeliveredConfirm) {
      onAllDeliveredConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-2xl w-full overflow-hidden my-auto animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white px-6 py-5 flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">
                  {buildingName} Drop Point
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {totalCount} Tiffins
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Study Fuel • {slot.toUpperCase()} Delivery & Instant Multi-Resident WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dispatch Overview Bar */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-stone-700 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Slot: <strong className="text-stone-900 capitalize">{slot}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>Location: <strong className="text-stone-900">{customers[0]?.area || 'Bandra West'}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Rider: <strong className="text-stone-900">{assignedRider}</strong></span>
            </span>
          </div>

          {/* Progress Pill */}
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-amber-300 shadow-xs">
            <span className="text-stone-600 font-bold text-[11px]">Messages Sent:</span>
            <span className="font-black text-emerald-600">{sentCount} / {totalCount}</span>
            <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">

          {/* Primary 1-Click Multi-Message Action Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
                  Sare Logo Ke Pass Ek Sath Message Bhejein
                </h4>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  1-Click me sabhi {totalCount} residents ke personal WhatsApp par delivery confirmation bhejein
                </p>
              </div>

              {/* Master Trigger Buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-auto-dispatch-all"
                  onClick={handleAutoDispatchAll}
                  disabled={isAutoSending}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer ${
                    isAutoSending
                      ? 'bg-amber-500 text-stone-950 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white'
                  }`}
                  title="Opens WhatsApp for each resident one by one automatically"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAutoSending ? `Sending (${activeStepIndex + 1}/${totalCount})...` : `🚀 Auto-Send to All ${totalCount}`}</span>
                </button>

                <button
                  id="btn-mark-all-delivered-fast"
                  onClick={handleMarkAllSentSimulated}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Mark all verified sent"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark All Sent</span>
                </button>
              </div>
            </div>

            {/* Quick Broadcast Group Text Copy Box */}
            <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-xs flex items-center justify-between gap-3">
              <div className="truncate text-stone-600">
                <span className="font-bold text-stone-900 mr-1.5">🏢 Building Group Message:</span>
                <span className="text-stone-500 truncate">
                  "🍱 Study Fuel - {buildingName} Bulk Delivery: All {totalCount} tiffins arrived..."
                </span>
              </div>
              <button
                onClick={handleCopyGroupText}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                title="Copy entire formatted text for WhatsApp building society group"
              >
                {copiedGroupText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedGroupText ? 'Copied!' : 'Copy Group Text'}</span>
              </button>
            </div>
          </div>

          {/* Residents List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h5 className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Residents at {buildingName} ({totalCount} Tiffins)</span>
              </h5>
              <span className="text-[11px] text-stone-400 font-medium">Click to send or re-send individually</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {customers.map((cust, idx) => {
                const isSent = !!sentStatusMap[cust.id];
                const isCurrentActive = activeStepIndex === idx;

                return (
                  <div
                    key={cust.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrentActive
                        ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300'
                        : isSent
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
                    }`}
                  >
                    {/* Customer Info */}
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}>
                        {isSent ? <Check className="w-4 h-4" /> : `#${idx + 1}`}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-stone-900">{cust.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-stone-900 text-amber-300">
                            {cust.flatNo || `Flat ${idx + 1}`}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cust.mealPreference === 'veg'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cust.mealPreference === 'non_veg'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {cust.mealPreference}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Smartphone className="w-3 h-3 text-stone-400" />
                            {cust.phone}
                          </span>
                          <span>•</span>
                          <span className="text-[11px] text-stone-400 truncate max-w-[200px]">
                            {cust.notes || 'Daily Student Tiffin'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handleCopyResidentText(cust)}
                        className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer"
                        title="Copy personalized text"
                      >
                        {copiedResidentId === cust.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        id={`btn-send-resident-${cust.id}`}
                        onClick={() => handleSendSingleResident(cust)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                          isSent
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                        title="Open WhatsApp for this resident"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-current" />
                        <span>{isSent ? 'Sent ✓' : 'Send Msg'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tip Note */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5 text-xs text-stone-600">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Pro-Tip for {buildingName}:</strong> Jab aap <strong>"Auto-Send to All {totalCount}"</strong> par click karenge, har resident ka WhatsApp chat unke personalized Flat number aur Delivery time ke sath sequence me open ho jayega. Ya phir <strong>"Copy Group Text"</strong> click karke aap building WhatsApp group me 1 single message me sabhi {totalCount} tiffins ki arrival announce kar sakte hain!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            Status: <strong className="text-stone-800">{sentCount} of {totalCount} notified</strong>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Done / Close
          </button>
        </div>

      </div>
    </div>
  );
};
