import React, { useState, useEffect, useMemo } from 'react';
import { Customer, AttendanceStore, DayAttendance } from './types';
import {
  getStoredCustomers,
  saveStoredCustomers,
  getStoredAttendance,
  saveStoredAttendance,
  ensureDailyRefresh,
  getStoredLoggedInCustomerPhone,
  saveStoredLoggedInCustomerPhone,
  findCustomerByPhone,
  clearAllData
} from './lib/storage';
import { Navbar } from './components/Navbar';
import { DailyDispatchView } from './components/DailyDispatchView';
import { CustomersView } from './components/CustomersView';
import { MonthlySyncView } from './components/MonthlySyncView';
import { KitchenPrepView } from './components/KitchenPrepView';
import { CustomerCalendarModal } from './components/CustomerCalendarModal';
import { AddEditCustomerModal } from './components/AddEditCustomerModal';
import { InvoiceModal } from './components/InvoiceModal';
import { QuickMessageModal } from './components/QuickMessageModal';
import { CustomerPortal } from './components/CustomerPortal';
import { RealTimeCountBar } from './components/RealTimeCountBar';
import { AutomatedRemindersModal } from './components/AutomatedRemindersModal';
import {
  getStoredReminderQueue,
  saveStoredReminderQueue,
  getStoredSentReminders,
  saveStoredSentReminders,
  getStoredActivityStream,
  saveStoredActivityStream,
  getStoredAutomationSettings,
  saveStoredAutomationSettings,
  generateAutomatedDailyQueue,
  sendBrowserNotification
} from './lib/automationEngine';
import { sounds } from './lib/soundEffects';
import { downloadDailyDispatchManifestPDF } from './lib/pdfGenerator';
import { MessageTemplateType } from './lib/whatsapp';
import { AutomatedReminder, AutomationSettings, ActivityLogItem } from './types';
import { INITIAL_CUSTOMERS, generateInitialAttendance, TODAY_STR } from './data/initialData';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(() => TODAY_STR);
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(() => TODAY_STR.slice(0, 7));
  const [activeTab, setActiveTab] = useState<'dispatch' | 'customers' | 'monthly' | 'kitchen'>('dispatch');
  
  // App Mode: 'admin' (Tiffin Owner / Manager) or 'customer' (Self-Service Portal)
  const [appMode, setAppMode] = useState<'admin' | 'customer'>('admin');

  // Core Data State
  const [customers, setCustomers] = useState<Customer[]>(getStoredCustomers);
  const [attendance, setAttendance] = useState<AttendanceStore>(getStoredAttendance);

  // Automation & Reminders State
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(getStoredAutomationSettings);
  const [remindersQueue, setRemindersQueue] = useState<AutomatedReminder[]>(() => {
    const queue = getStoredReminderQueue();
    if (queue && queue.length > 0) return queue;
    const settings = getStoredAutomationSettings();
    const custs = getStoredCustomers();
    const att = getStoredAttendance();
    return generateAutomatedDailyQueue(TODAY_STR, custs, att, settings);
  });
  const [sentReminders, setSentReminders] = useState<AutomatedReminder[]>(getStoredSentReminders);
  const [activityStream, setActivityStream] = useState<ActivityLogItem[]>(getStoredActivityStream);
  const [isRemindersOpen, setIsRemindersOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Customer Authentication state (by registered phone number)
  const [loggedInCustomer, setLoggedInCustomer] = useState<Customer | null>(() => {
    const savedPhone = getStoredLoggedInCustomerPhone();
    if (savedPhone) {
      const initialCusts = getStoredCustomers();
      return findCustomerByPhone(savedPhone, initialCusts);
    }
    return null;
  });

  // Modals state
  const [calendarCustomer, setCalendarCustomer] = useState<Customer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [quickMsgCustomer, setQuickMsgCustomer] = useState<Customer | null>(null);
  const [quickMsgTemplate, setQuickMsgTemplate] = useState<MessageTemplateType>('delivery_confirmed');
  const [quickMsgSlot, setQuickMsgSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [quickMsgDate, setQuickMsgDate] = useState<string>(TODAY_STR);
  const [isQuickMsgOpen, setIsQuickMsgOpen] = useState<boolean>(false);

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleOpenQuickMessage = (
    customer: Customer,
    template: MessageTemplateType = 'delivery_confirmed',
    slot: 'lunch' | 'dinner' = 'lunch',
    dateStr: string = selectedDate
  ) => {
    setQuickMsgCustomer(customer);
    setQuickMsgTemplate(template);
    setQuickMsgSlot(slot);
    setQuickMsgDate(dateStr);
    setIsQuickMsgOpen(true);
  };

  // Ensure daily refresh: when the user switches date or on mount,
  // ensure today's date has attendance entries initialized for all active customers
  useEffect(() => {
    const { updatedAttendance, isRefreshed } = ensureDailyRefresh(customers, attendance, selectedDate);
    if (isRefreshed) {
      setAttendance(updatedAttendance);
    }
  }, [selectedDate, customers]);

  // Update attendance for a specific customer on a specific date
  const handleUpdateDayAttendance = (
    customerId: string,
    dateStr: string,
    updated: Partial<DayAttendance>
  ) => {
    const nextStore: AttendanceStore = {
      ...attendance,
      [customerId]: {
        ...(attendance[customerId] || {}),
        [dateStr]: {
          ...(attendance[customerId]?.[dateStr] || {
            date: dateStr,
            breakfast: 'none',
            lunch: 'none',
            dinner: 'none',
            extraTiffins: 0
          }),
          ...updated
        }
      }
    };

    setAttendance(nextStore);
    saveStoredAttendance(nextStore);
    showToast('Tiffin attendance updated & synced!');
  };

  // Save new or edited customer
  const handleSaveCustomer = (customer: Customer) => {
    let updated: Customer[];
    const exists = customers.some((c) => c.id === customer.id);

    if (exists) {
      updated = customers.map((c) => (c.id === customer.id ? customer : c));
      showToast(`${customer.name} details saved successfully!`);
    } else {
      updated = [customer, ...customers];
      showToast(`${customer.name} added successfully! Plan: ${customer.scheduleSlot}`);
    }

    setCustomers(updated);
    saveStoredCustomers(updated);

    // Also update loggedInCustomer if it was edited
    if (loggedInCustomer && loggedInCustomer.id === customer.id) {
      setLoggedInCustomer(customer);
    }

    // Also ensure attendance store has key for new customer
    const refreshed = ensureDailyRefresh(updated, attendance, selectedDate);
    setAttendance(refreshed.updatedAttendance);
  };

  // Toggle pause / active
  const handleToggleCustomerStatus = (cust: Customer) => {
    const newStatus = cust.status === 'active' ? 'paused' : 'active';
    const updated = customers.map((c) => (c.id === cust.id ? { ...c, status: newStatus } : c));
    setCustomers(updated);
    saveStoredCustomers(updated);
    showToast(`${cust.name} is now ${newStatus === 'active' ? 'Active' : 'Paused'}!`);
  };

  // Record payment from monthly summary
  const handleRecordPayment = (customerId: string, newAdvance: number) => {
    const updated = customers.map((c) => (c.id === customerId ? { ...c, advancePaid: newAdvance } : c));
    setCustomers(updated);
    saveStoredCustomers(updated);
    showToast('Payment record updated successfully!');
  };

  // Clear all data to fresh clean slate
  const handleResetData = () => {
    if (window.confirm('Are you sure you want to clear all data and start completely fresh? This will remove all customer profiles and attendance records.')) {
      clearAllData();
      setCustomers([]);
      setAttendance({});
      saveStoredCustomers([]);
      saveStoredAttendance({});
      setSelectedDate(TODAY_STR);
      setCurrentYearMonth(TODAY_STR.slice(0, 7));
      setLoggedInCustomer(null);
      saveStoredLoggedInCustomerPhone(null);
      setRemindersQueue([]);
      setSentReminders([]);
      setActivityStream([]);
      showToast('All demo data cleared! App is clean and ready for real orders.');
    }
  };

  // Export JSON Backup
  const handleExportData = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      customers,
      attendance
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TiffinFlow_Backup_${selectedDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON downloaded successfully!');
  };

  // Import JSON Backup
  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.customers && parsed.attendance) {
          setCustomers(parsed.customers);
          setAttendance(parsed.attendance);
          saveStoredCustomers(parsed.customers);
          saveStoredAttendance(parsed.attendance);
          showToast('Data restored successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // View invoice handler
  const handleViewInvoice = (cust: Customer, yearMonth: string) => {
    setInvoiceCustomer(cust);
    setCurrentYearMonth(yearMonth);
    setIsInvoiceOpen(true);
  };

  // Compute live counter for navbar
  const todayCounts = useMemo(() => {
    let totalExpected = 0;
    let deliveredCount = 0;
    let pendingCount = 0;

    customers.forEach((c) => {
      if (c.status === 'archived') return;

      const record = attendance[c.id]?.[selectedDate];
      const hasLunch = c.scheduleSlot === 'lunch_only' || c.scheduleSlot === 'both';
      const hasDinner = c.scheduleSlot === 'dinner_only' || c.scheduleSlot === 'both';

      if (hasLunch) {
        totalExpected++;
        if (record?.lunch === 'delivered') deliveredCount++;
        else if (record?.lunch === 'none') pendingCount++;
      }

      if (hasDinner) {
        totalExpected++;
        if (record?.dinner === 'delivered') deliveredCount++;
        else if (record?.dinner === 'none') pendingCount++;
      }
    });

    return { totalExpected, deliveredCount, pendingCount };
  }, [customers, attendance, selectedDate]);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-black text-xs">
            ✓
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        appMode={appMode}
        setAppMode={setAppMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onOpenAddCustomer={() => {
          setCustomerToEdit(null);
          setIsAddEditOpen(true);
        }}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onImportData={handleImportData}
        todayCounts={todayCounts}
        loggedInCustomerName={loggedInCustomer?.name}
        onOpenRemindersModal={() => setIsRemindersOpen(true)}
        pendingRemindersCount={remindersQueue.filter((r) => r.status === 'pending').length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Real-time Status & Live Count Bar (Admin mode) */}
        {appMode === 'admin' && (
          <RealTimeCountBar
            selectedDate={selectedDate}
            customers={customers}
            attendance={attendance}
            soundEnabled={soundEnabled}
            onToggleSound={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sounds.setEnabled(next);
              showToast(next ? 'Sound chimes enabled!' : 'Sound alerts muted');
            }}
            onOpenRemindersModal={() => setIsRemindersOpen(true)}
            onDownloadManifestPDF={() => {
              downloadDailyDispatchManifestPDF(selectedDate, customers, attendance);
              showToast('Kitchen & Rider manifest PDF downloaded!');
            }}
            pendingRemindersCount={remindersQueue.filter((r) => r.status === 'pending').length}
          />
        )}
        
        {/* Customer Self-Service Portal View */}
        {appMode === 'customer' ? (
          <CustomerPortal
            customers={customers}
            attendance={attendance}
            loggedInCustomer={loggedInCustomer}
            onLogin={(cust) => {
              setLoggedInCustomer(cust);
              saveStoredLoggedInCustomerPhone(cust.phone);
              showToast(`Welcome ${cust.name}! Logged into your portal.`);
            }}
            onLogout={() => {
              setLoggedInCustomer(null);
              saveStoredLoggedInCustomerPhone(null);
              showToast('Logged out successfully.');
            }}
            onUpdateDayAttendance={handleUpdateDayAttendance}
            onSwitchToAdmin={() => setAppMode('admin')}
          />
        ) : (
          /* Admin / Owner Views */
          <>
            {activeTab === 'dispatch' && (
              <DailyDispatchView
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                customers={customers}
                attendance={attendance}
                onUpdateDayAttendance={handleUpdateDayAttendance}
                onOpenCustomerCalendar={(customer) => setCalendarCustomer(customer)}
                onOpenQuickMessage={handleOpenQuickMessage}
                onOpenAddCustomer={() => {
                  setCustomerToEdit(null);
                  setIsAddEditOpen(true);
                }}
              />
            )}

            {activeTab === 'customers' && (
              <CustomersView
                customers={customers}
                attendance={attendance}
                currentYearMonth={currentYearMonth}
                onOpenCustomerCalendar={(customer) => setCalendarCustomer(customer)}
                onOpenAddCustomer={() => {
                  setCustomerToEdit(null);
                  setIsAddEditOpen(true);
                }}
                onOpenEditCustomer={(customer) => {
                  setCustomerToEdit(customer);
                  setIsAddEditOpen(true);
                }}
                onToggleCustomerStatus={handleToggleCustomerStatus}
                onViewInvoice={handleViewInvoice}
                onOpenQuickMessage={handleOpenQuickMessage}
                onLoginAsCustomer={(customer) => {
                  setLoggedInCustomer(customer);
                  saveStoredLoggedInCustomerPhone(customer.phone);
                  setAppMode('customer');
                  showToast(`Switched to ${customer.name}'s customer portal!`);
                }}
                selectedDate={selectedDate}
                onUpdateDayAttendance={handleUpdateDayAttendance}
              />
            )}

            {activeTab === 'monthly' && (
              <MonthlySyncView
                customers={customers}
                attendance={attendance}
                currentYearMonth={currentYearMonth}
                setCurrentYearMonth={setCurrentYearMonth}
                onOpenCustomerCalendar={(customer) => setCalendarCustomer(customer)}
                onViewInvoice={handleViewInvoice}
                onRecordPayment={handleRecordPayment}
                onOpenQuickMessage={handleOpenQuickMessage}
              />
            )}

            {activeTab === 'kitchen' && (
              <KitchenPrepView
                selectedDate={selectedDate}
                customers={customers}
                attendance={attendance}
              />
            )}
          </>
        )}

      </main>

      {/* Customer Interactive Personal Calendar Modal (Admin triggered) */}
      {calendarCustomer && (
        <CustomerCalendarModal
          customer={calendarCustomer}
          attendanceMap={attendance[calendarCustomer.id] || {}}
          onClose={() => setCalendarCustomer(null)}
          onUpdateDayAttendance={handleUpdateDayAttendance}
          onViewInvoice={(c, ym) => {
            setCalendarCustomer(null);
            handleViewInvoice(c, ym);
          }}
          onOpenQuickMessage={handleOpenQuickMessage}
        />
      )}

      {/* Add / Edit Customer Modal */}
      <AddEditCustomerModal
        customerToEdit={customerToEdit}
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setCustomerToEdit(null);
        }}
        onSaveCustomer={handleSaveCustomer}
      />

      {/* Monthly Invoice / Receipt Modal */}
      <InvoiceModal
        customer={invoiceCustomer}
        yearMonth={currentYearMonth}
        attendance={attendance}
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setInvoiceCustomer(null);
        }}
      />

      {/* Quick Message Modal */}
      <QuickMessageModal
        customer={quickMsgCustomer}
        isOpen={isQuickMsgOpen}
        onClose={() => {
          setIsQuickMsgOpen(false);
          setQuickMsgCustomer(null);
        }}
        defaultTemplate={quickMsgTemplate}
        slot={quickMsgSlot}
        dateStr={quickMsgDate}
        attendance={attendance}
        currentYearMonth={currentYearMonth}
      />

      {/* Automated Reminders & Background Messaging Modal */}
      <AutomatedRemindersModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        queue={remindersQueue}
        setQueue={setRemindersQueue}
        sentList={sentReminders}
        setSentList={setSentReminders}
        activityStream={activityStream}
        settings={automationSettings}
        onUpdateSettings={(newSettings) => {
          setAutomationSettings(newSettings);
          saveStoredAutomationSettings(newSettings);
        }}
        onRefreshQueue={() => {
          const q = generateAutomatedDailyQueue(selectedDate, customers, attendance, automationSettings);
          setRemindersQueue(q);
          showToast(`Reminders queue synchronized for ${selectedDate}!`);
        }}
        onShowToast={showToast}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-12 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🍱 TiffinFlow SaaS • Complete Tiffin Service Management & Order Dispatch</span>
          <span>Automatic Daily Refresh, Smart Calendar & Customer Self-Service Login</span>
        </div>
      </footer>

    </div>
  );
}
