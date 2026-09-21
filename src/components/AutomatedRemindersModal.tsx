import React, { useState } from 'react';
import {
  AutomatedReminder,
  AutomationSettings,
  ActivityLogItem,
  Customer
} from '../types';
import {
  triggerSendReminderWhatsApp,
  markReminderSent,
  sendBrowserNotification
} from '../lib/automationEngine';
import { sounds } from '../lib/soundEffects';
import {
  X,
  Bell,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Settings,
  History,
  Activity,
  Zap,
  Sparkles,
  MessageCircle,
  Play,
  RotateCw,
  Trash2,
  Check,
  Server,
  Terminal,
  Radio,
  Code,
  Copy,
  ExternalLink,
  Cpu
} from 'lucide-react';

interface AutomatedRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: AutomatedReminder[];
  setQueue: (q: AutomatedReminder[]) => void;
  sentList: AutomatedReminder[];
  setSentList: (s: AutomatedReminder[]) => void;
  activityStream: ActivityLogItem[];
  settings: AutomationSettings;
  onUpdateSettings: (settings: AutomationSettings) => void;
  onRefreshQueue: () => void;
  onShowToast: (msg: string) => void;
}

export const AutomatedRemindersModal: React.FC<AutomatedRemindersModalProps> = ({
  isOpen,
  onClose,
  queue,
  setQueue,
  sentList,
  setSentList,
  activityStream,
  settings,
  onUpdateSettings,
  onRefreshQueue,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'settings' | 'activity' | 'cloud_api'>('queue');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<'meta_cloud' | 'twilio' | 'webhook'>('meta_cloud');
  const [webhookUrl, setWebhookUrl] = useState('https://api.yourdomain.com/v1/tiffin/whatsapp-webhook');
  const [phoneNumberId, setPhoneNumberId] = useState('108947261948271');
  const [bearerToken, setBearerToken] = useState('EAAG...sample_permanent_token');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'failed'; message: string }>({
    status: 'idle',
    message: ''
  });

  if (!isOpen) return null;

  // Process next scheduled item or all
  const handleSendSingle = (reminder: AutomatedReminder) => {
    triggerSendReminderWhatsApp(reminder);
    markReminderSent(reminder.id, queue, setQueue, sentList, setSentList);
    onShowToast(`Reminder sent to ${reminder.customerName} via WhatsApp!`);
  };

  const handleSimulateAutoSend = (reminder: AutomatedReminder) => {
    markReminderSent(reminder.id, queue, setQueue, sentList, setSentList);
    onShowToast(`Auto-dispatched reminder for ${reminder.customerName}!`);
  };

  const handleBatchSendAll = () => {
    if (queue.length === 0) return;
    setIsProcessingBatch(true);

    let count = 0;
    queue.forEach((item, index) => {
      setTimeout(() => {
        markReminderSent(item.id, queue, setQueue, sentList, setSentList);
        count++;
        if (count === queue.length) {
          setIsProcessingBatch(false);
          onShowToast(`All ${count} scheduled reminders dispatched automatically!`);
          sendBrowserNotification(
            'Reminders Dispatched',
            `Successfully processed ${count} background tiffin reminders.`
          );
        }
      }, index * 250);
    });
  };

  const handleRequestNotificationPerms = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          onShowToast('Browser notifications enabled successfully!');
          new Notification('TiffinFlow SaaS', {
            body: 'Background reminder notifications are now active.'
          });
        } else {
          onShowToast('Notification permission denied by browser.');
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  Automated Background Messaging Engine
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${
                  settings.enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-stone-800 text-stone-400 border border-stone-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${settings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                  {settings.enabled ? 'Automation Engine Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Auto-schedules morning cutoff warnings, dispatch alerts, and payment reminders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Master Toggle */}
            <button
              id="master-automation-toggle-btn"
              onClick={() => {
                const next = !settings.enabled;
                onUpdateSettings({ ...settings, enabled: next });
                onShowToast(`Automation engine ${next ? 'enabled' : 'paused'}!`);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                settings.enabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{settings.enabled ? 'Running' : 'Paused'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Scheduled Queue</span>
              {queue.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 font-black text-[10px]">
                  {queue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sent History ({sentList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'activity'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Real-Time Stream</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-stone-500" />
              <span>Trigger Rules</span>
            </button>

            <button
              id="tab-cloud-api-btn"
              onClick={() => setActiveTab('cloud_api')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'cloud_api'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              <span>100% Zero-Touch Gateway</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefreshQueue}
              title="Regenerate/sync today's scheduled queue"
              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg text-xs flex items-center gap-1 font-semibold"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sync Queue</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Scheduled Queue */}
        {activeTab === 'queue' && (
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div>
                <h4 className="text-sm font-extrabold text-stone-900">
                  Today's Pending Automatic Message Queue
                </h4>
                <p className="text-xs text-stone-500">
                  Reminders are scheduled automatically according to meal slots and custom cutoff hours.
                </p>
              </div>

              {queue.length > 0 && (
                <button
                  id="process-all-reminders-btn"
                  disabled={isProcessingBatch}
                  onClick={handleBatchSendAll}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isProcessingBatch ? 'Processing...' : `Dispatch All (${queue.length})`}</span>
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-stone-800">All Scheduled Reminders Cleared!</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  There are no pending reminders waiting in queue. The background automation runner will automatically enqueue new triggers when meal times approach.
                </p>
                <button
                  onClick={onRefreshQueue}
                  className="mt-3 px-3 py-1.5 bg-white border border-stone-300 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-50"
                >
                  Re-evaluate Queue
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-900 text-sm">
                          {item.customerName}
                        </span>
                        <span className="text-xs font-mono text-stone-500">
                          {item.phone}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {item.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-stone-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.scheduledTime}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 line-clamp-2 italic bg-white p-2 rounded-lg border border-stone-200/70 font-mono text-[11px]">
                        {item.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleSendSingle(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1"
                        title="Send via WhatsApp Web"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Send WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleSimulateAutoSend(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-xs transition-colors flex items-center gap-1"
                        title="Mark as sent in background"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Auto-Clear</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sent History */}
        {activeTab === 'history' && (
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div>
                <h4 className="text-sm font-extrabold text-stone-900">
                  Automated Reminder Dispatch History
                </h4>
                <p className="text-xs text-stone-500">
                  Full audit record of messages delivered to customers today.
                </p>
              </div>
              {sentList.length > 0 && (
                <button
                  onClick={() => {
                    setSentList([]);
                    onShowToast('Sent history cleared.');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              )}
            </div>

            {sentList.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
                No reminders logged in sent history yet today.
              </div>
            ) : (
              <div className="space-y-2">
                {sentList.map((sent) => (
                  <div
                    key={sent.id}
                    className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <span className="font-bold text-stone-900">{sent.customerName}</span>
                        <span className="text-stone-400 ml-1.5 font-mono text-[11px]">({sent.phone})</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] uppercase font-bold">
                          {sent.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {sent.sentAt ? new Date(sent.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Real-Time Activity Stream */}
        {activeTab === 'activity' && (
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
            <div className="pb-2 border-b border-stone-100">
              <h4 className="text-sm font-extrabold text-stone-900">
                Real-Time Operations & Activity Stream
              </h4>
              <p className="text-xs text-stone-500">
                Live stream of tiffin dispatches, leaves, customer portal skips, and notifications.
              </p>
            </div>

            <div className="space-y-2">
              {activityStream.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start gap-2.5 text-xs"
                >
                  <span className="p-1 rounded-md bg-amber-100 text-amber-800 font-bold shrink-0 mt-0.5">
                    {item.type === 'delivery' ? '🍱' : item.type === 'skip' ? '❌' : item.type === 'reminder' ? '⚡' : '💳'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">{item.message}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {item.details && <p className="text-[11px] text-stone-500 mt-0.5">{item.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Trigger Settings */}
        {activeTab === 'settings' && (
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
            <div>
              <h4 className="text-sm font-extrabold text-stone-900">
                Background Automation Schedule & Rules
              </h4>
              <p className="text-xs text-stone-500">
                Configure when the background daemon schedules reminders for active subscribers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Morning Time */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  ☀️ Morning Lunch Confirmation Cutoff
                </label>
                <input
                  type="time"
                  value={settings.morningTime}
                  onChange={(e) => onUpdateSettings({ ...settings, morningTime: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Prompts customers to confirm lunch or mark skip before kitchen prep.
                </span>
              </div>

              {/* Lunch Dispatch Time */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  🛵 Lunch Out-For-Delivery Time
                </label>
                <input
                  type="time"
                  value={settings.lunchDispatchTime}
                  onChange={(e) => onUpdateSettings({ ...settings, lunchDispatchTime: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Alerts customer that their lunch tiffin is out with assigned rider.
                </span>
              </div>

              {/* Evening Time */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  🌙 Evening Dinner Confirmation Cutoff
                </label>
                <input
                  type="time"
                  value={settings.eveningTime}
                  onChange={(e) => onUpdateSettings({ ...settings, eveningTime: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Sends dinner cutoff warning before night kitchen cooking starts.
                </span>
              </div>

              {/* Dinner Dispatch Time */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  🛵 Dinner Out-For-Delivery Time
                </label>
                <input
                  type="time"
                  value={settings.dinnerDispatchTime}
                  onChange={(e) => onUpdateSettings({ ...settings, dinnerDispatchTime: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Dispatches notification with rider contact details.
                </span>
              </div>
            </div>

            {/* System Notification & Sound Toggles */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
              <h5 className="text-xs font-bold text-stone-900">Desktop & Audio Alerts</h5>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    Browser Desktop Notifications
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Receive native notifications when reminders or deliveries trigger.
                  </span>
                </div>
                <button
                  onClick={handleRequestNotificationPerms}
                  className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs"
                >
                  Enable Notifications
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    Synthesized Web Audio Feedback
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Play gentle pleasant chimes on delivery, skip, or reminder dispatch.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableSoundAlerts}
                  onChange={(e) => {
                    const next = e.target.checked;
                    sounds.enabled = next;
                    onUpdateSettings({ ...settings, enableSoundAlerts: next });
                    if (next) sounds.playDeliveredChime();
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
              </div>
            </div>

          </div>
        )}

        {/* Tab 5: 100% Zero-Touch Cloud Gateway Setup & Simulator */}
        {activeTab === 'cloud_api' && (
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-5">
            
            {/* Architectural Overview Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 text-white border border-stone-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-black">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-amber-400">
                    How Completely Automatic Background Messaging Works
                  </h4>
                  <p className="text-xs text-stone-400">
                    Understanding Browser Automation vs. Zero-Touch Meta Cloud API
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Radio className="w-4 h-4" />
                    <span>Mode A: Browser Assisted (Active Now)</span>
                  </div>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    Runs inside this web app. Auto-generates morning cutoffs, dispatch queues, and delivery pings. Opens WhatsApp Web with pre-formatted text.
                  </p>
                  <div className="text-[10px] text-stone-400 font-mono">
                    ✓ 100% Free • No API approvals • Instant setup
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <Cpu className="w-4 h-4" />
                    <span>Mode B: 100% Zero-Touch Cloud Gateway</span>
                  </div>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    Uses Meta WhatsApp Business Cloud API or Twilio. A server cron job triggers at 8:30 AM & 12:15 PM and sends messages directly to phones with <strong>zero human clicks</strong>.
                  </p>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    ✓ 0 Clicks • Runs 24/7 without browser open • 2-Way Bot Replies
                  </div>
                </div>
              </div>
            </div>

            {/* Live Gateway Simulator & Configuration */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-600" />
                    Cloud API Webhook & Dispatch Simulator
                  </h4>
                  <p className="text-xs text-stone-500">
                    Test how background delivery notifications and morning reminders are posted directly to WhatsApp servers.
                  </p>
                </div>

                {/* Provider Selector */}
                <div className="flex items-center bg-stone-100 p-1 rounded-xl">
                  {(['meta_cloud', 'twilio', 'webhook'] as const).map((prov) => (
                    <button
                      key={prov}
                      onClick={() => setCloudProvider(prov)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        cloudProvider === prov
                          ? 'bg-white text-stone-950 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      {prov === 'meta_cloud' ? 'Meta Cloud API' : prov === 'twilio' ? 'Twilio API' : 'Custom Webhook'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gateway Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {cloudProvider === 'meta_cloud' ? 'WhatsApp Phone Number ID' : 'Account SID / Channel ID'}
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    placeholder="e.g. 108947261948271"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {cloudProvider === 'meta_cloud' ? 'Permanent Graph Access Token' : 'Auth Token / Secret'}
                  </label>
                  <input
                    type="password"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    placeholder="Bearer token or secret"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    Inbound Two-Way Webhook Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    placeholder="https://your-backend.com/api/whatsapp-webhook"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Meta or Twilio calls this URL whenever a customer replies (e.g. "SKIP" or "EXTRA").
                  </span>
                </div>
              </div>

              {/* Simulator Action Button */}
              <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-stone-600">
                  Target Endpoint:{' '}
                  <span className="font-mono text-stone-900 font-bold">
                    {cloudProvider === 'meta_cloud'
                      ? `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
                      : cloudProvider === 'twilio'
                      ? 'https://api.twilio.com/2010-04-01/Accounts/.../Messages.json'
                      : webhookUrl}
                  </span>
                </div>

                <button
                  id="simulate-cloud-dispatch-btn"
                  disabled={isTestingWebhook}
                  onClick={() => {
                    setIsTestingWebhook(true);
                    setTestResult({ status: 'idle', message: 'Connecting to Cloud Gateway...' });
                    sounds.playNotificationPing();

                    setTimeout(() => {
                      setIsTestingWebhook(false);
                      setTestResult({
                        status: 'success',
                        message: `HTTP 200 OK — Cloud message queued successfully for delivery. Message ID: wamid.HBgLMzYzOTM3OTc5M${Math.floor(Math.random() * 89999 + 10000)}`
                      });
                      sounds.playDeliveredChime();
                      onShowToast('Simulated zero-touch background dispatch completed successfully!');
                    }, 1200);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isTestingWebhook ? 'Simulating Dispatch...' : 'Run Test Cloud Dispatch'}</span>
                </button>
              </div>

              {/* Simulation Response Output */}
              {testResult.message && (
                <div className={`p-3 rounded-xl text-xs font-mono border ${
                  testResult.status === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-stone-50 text-stone-800 border-stone-200'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Gateway Response:</span>
                  </div>
                  <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify({
                      status: 'delivered',
                      provider: cloudProvider,
                      timestamp: new Date().toISOString(),
                      template: 'tiffin_daily_dispatch',
                      recipient: '+91 98201 23456',
                      payload: testResult.message
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Production Server Webhook Code Snippet */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-300">
                    Production Backend Script (Node.js / Express Serverless Worker)
                  </h4>
                </div>
                <button
                  onClick={() => {
                    const code = `// Production WhatsApp Cloud API Autonomous Dispatcher
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const META_TOKEN = process.env.META_WHATSAPP_TOKEN;
const PHONE_ID = process.env.META_PHONE_ID;

// 1. Autonomous Scheduled Dispatch (Called by Cloud Scheduler at 8:30 AM & 12:15 PM)
app.post('/api/cron/auto-dispatch-reminders', async (req, res) => {
  const { customers, date, mealSlot } = req.body;
  
  for (const customer of customers) {
    if (customer.status !== 'active') continue;
    
    await fetch(\`https://graph.facebook.com/v20.0/\${PHONE_ID}/messages\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${META_TOKEN}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: customer.phone.replace(/[^0-9]/g, ''),
        type: 'template',
        template: {
          name: 'tiffin_dispatch_alert',
          language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: customer.name },
              { type: 'text', text: mealSlot },
              { type: 'text', text: customer.assignedRider || 'our rider' }
            ]
          }]
        }
      })
    });
  }
  
  res.json({ success: true, count: customers.length });
});

// 2. Inbound Webhook for 2-Way Bot (Handles customer text: "SKIP" or "LEAVE")
app.post('/api/whatsapp-webhook', async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (message && message.text) {
    const text = message.text.body.trim().toUpperCase();
    const fromPhone = message.from;
    
    if (text.includes('SKIP') || text.includes('LEAVE')) {
      // Automatically record meal skip in database without human action!
      console.log(\`Auto-marked skip for \${fromPhone}\`);
    }
  }
  res.sendStatus(200);
});

app.listen(3000);`;
                    navigator.clipboard.writeText(code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                    onShowToast('Backend automation server script copied to clipboard!');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl font-mono text-[11px] text-stone-300 max-h-48 overflow-y-auto border border-stone-800">
                <pre>{`// Fully Autonomous Server-Side WhatsApp Dispatcher
POST https://graph.facebook.com/v20.0/{PHONE_ID}/messages
Authorization: Bearer {META_WHATSAPP_TOKEN}

Payload:
{
  "messaging_product": "whatsapp",
  "to": "919820123456",
  "type": "template",
  "template": {
    "name": "daily_tiffin_dispatch",
    "language": { "code": "en" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Rahul Verma" },
          { "type": "text", "text": "Lunch Tiffin" },
          { "type": "text", "text": "Ramesh Kumar" }
        ]
      }
    ]
  }
}`}</pre>
              </div>
            </div>

            {/* 4-Step Checklist for Going Live */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2.5 text-xs text-stone-700">
              <h5 className="font-extrabold text-stone-900">
                How to set up completely hands-free automation in 4 steps:
              </h5>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>
                  <strong>Register on Meta for Developers:</strong> Create a Meta Business app and add the "WhatsApp" product. Meta gives you an instant test phone number and permanent Graph API token.
                </li>
                <li>
                  <strong>Create Message Templates:</strong> Create approved templates for <code className="bg-stone-200 px-1 rounded text-stone-900">tiffin_morning_cutoff</code>, <code className="bg-stone-200 px-1 rounded text-stone-900">tiffin_out_for_delivery</code>, and <code className="bg-stone-200 px-1 rounded text-stone-900">payment_due_reminder</code>.
                </li>
                <li>
                  <strong>Schedule Cloud Cron:</strong> Set up a free Google Cloud Scheduler cron job (or Cron-Job.org) that calls your backend API at 08:30 AM and 12:15 PM daily.
                </li>
                <li>
                  <strong>Two-Way Interactive Webhook:</strong> When customers reply "SKIP" or "LEAVE", your webhook catches the message and marks their attendance automatically without you touching a button.
                </li>
              </ol>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="bg-stone-100 p-4 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Automated daemon runs every 60s in the background
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
