import React, { useState, useEffect } from 'react';
import { Customer, AttendanceStore } from '../types';
import { TODAY_STR } from '../data/initialData';
import {
  MESSAGE_TEMPLATES,
  MessageTemplateType,
  openWhatsAppWithText,
  getWhatsAppUrl,
  sanitizePhoneNumber
} from '../lib/whatsapp';
import { calculateMonthlySummaries } from '../lib/storage';
import {
  X,
  Send,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Smartphone,
  Edit3
} from 'lucide-react';

interface QuickMessageModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  defaultTemplate?: MessageTemplateType;
  slot?: 'lunch' | 'dinner';
  dateStr?: string;
  attendance: AttendanceStore;
  currentYearMonth: string;
}

export const QuickMessageModal: React.FC<QuickMessageModalProps> = ({
  customer,
  isOpen,
  onClose,
  defaultTemplate = 'delivery_confirmed',
  slot = 'lunch',
  dateStr = TODAY_STR,
  attendance,
  currentYearMonth
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplateType>(defaultTemplate);
  const [messageText, setMessageText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Month name
  const [yearStr, monthStr] = currentYearMonth.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = `${monthNames[parseInt(monthStr, 10) - 1]} ${yearStr}`;

  // Summary for this customer if invoice template is chosen
  useEffect(() => {
    if (!customer) return;

    setSelectedTemplate(defaultTemplate);

    const summaries = calculateMonthlySummaries(currentYearMonth, [customer], attendance);
    const summary = summaries[0];

    const templateObj = MESSAGE_TEMPLATES.find((t) => t.id === defaultTemplate) || MESSAGE_TEMPLATES[0];
    const generated = templateObj.generateText({
      customer,
      slot,
      dateStr,
      summary,
      monthName,
      riderName: customer.assignedRider
    });

    setMessageText(generated);
  }, [customer, defaultTemplate, slot, dateStr, currentYearMonth, isOpen]);

  const handleSelectTemplate = (templateId: MessageTemplateType) => {
    setSelectedTemplate(templateId);
    if (!customer) return;

    const summaries = calculateMonthlySummaries(currentYearMonth, [customer], attendance);
    const summary = summaries[0];

    const templateObj = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (templateObj) {
      const generated = templateObj.generateText({
        customer,
        slot,
        dateStr,
        summary,
        monthName,
        riderName: customer.assignedRider
      });
      setMessageText(generated);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!customer) return;
    openWhatsAppWithText(customer.phone, messageText);
  };

  if (!isOpen || !customer) return null;

  const cleanPhone = sanitizePhoneNumber(customer.phone);

  const whatsappUrl = getWhatsAppUrl(customer.phone, messageText);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto">
      <div 
        id="quick-message-modal"
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl my-4 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Quick WhatsApp Message</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-emerald-100 text-[10px] font-bold">
                  Pre-filled Template
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                To: <strong className="text-white">{customer.name}</strong> ({customer.phone})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Template Picker Pills */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-2">
              Select Message Template:
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {MESSAGE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    id={`template-btn-${tmpl.id}`}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <span>{tmpl.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable Text Area with WhatsApp Styled Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                <span>Message Text (Editable before sending):</span>
              </label>
              <span className="text-[11px] text-stone-400">
                Supports WhatsApp *bold*, line breaks
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={9}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full text-xs font-mono p-3 bg-stone-50 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 text-stone-800 leading-relaxed shadow-inner"
              />
            </div>
          </div>

          {/* WhatsApp Preview Card */}
          <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-stone-300 shadow-inner">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 mb-2">
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>WhatsApp Message Preview</span>
            </div>

            <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 max-w-lg shadow-sm border border-stone-200/60 text-xs text-stone-800 whitespace-pre-wrap font-sans leading-relaxed">
              {messageText}
              <div className="text-[10px] text-stone-400 text-right mt-2 flex items-center justify-end gap-1">
                <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-emerald-600 font-bold">✓✓</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            Clicking opens <strong className="text-stone-700">wa.me/{cleanPhone}</strong> in WhatsApp
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors shadow-xs"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
            </button>

            <a
              id="open-whatsapp-main-btn"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                // Also trigger custom open helper if needed
                handleOpenWhatsApp();
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer no-underline"
            >
              <Send className="w-4 h-4" />
              <span>Open in WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
