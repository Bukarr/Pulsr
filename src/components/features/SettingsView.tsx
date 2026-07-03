import React, { useState } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { useContentStore } from '../../store/contentStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { UserProfile } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Chip } from '../ui/Chip';
import { Badge } from '../ui/Badge';
import { 
  Settings, 
  BarChart3, 
  Database, 
  Edit3, 
  Save, 
  RefreshCw, 
  LogOut, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  Download, 
  Trash2, 
  History,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsViewProps {
  onReset: () => void;
}

export function SettingsView({ onReset }: SettingsViewProps) {
  const { profile, setProfile, resetProfile } = useProfileStore();
  const { suggestions, clearSuggestions, autoClearDays, setAutoClearDays, clearCacheOnExit, setClearCacheOnExit } = useContentStore();
  const { items, clearCalendar } = useCalendarStore();
  const { events, clearAnalytics } = useAnalyticsStore();

  const [editMode, setEditMode] = useState(false);
  const [isConfirmingWipeDrafts, setIsConfirmingWipeDrafts] = useState(false);

  const [isConfirmingWipeCalendar, setIsConfirmingWipeCalendar] = useState(false);
  const [isConfirmingFullReset, setIsConfirmingFullReset] = useState(false);
  const [isConfirmingResetLogs, setIsConfirmingResetLogs] = useState(false);

  // Edit states
  const [name, setName] = useState(profile?.name || '');
  const [profession, setProfession] = useState(profile?.profession || '');
  const [niche, setNiche] = useState(profile?.niche || '');
  const [primaryPlatform, setPrimaryPlatform] = useState(profile?.primaryPlatform || 'Twitter/X');
  const [contentVision, setContentVision] = useState(profile?.contentVision || '');
  const [tone, setTone] = useState(profile?.tone || '');

  // Analytics counts
  const totalDrafts = suggestions.length;
  const totalScheduled = items.length;
  const completedPosted = items.filter((item) => item.status === 'posted').length;
  const plannedPending = items.filter((item) => item.status === 'planned' || item.status === 'draft').length;

  const eventCounts = {
    content_generation: events.filter(e => e.eventType === 'content_generation').length,
    trend_view: events.filter(e => e.eventType === 'trend_view').length,
    calendar_interaction: events.filter(e => e.eventType === 'calendar_interaction').length,
    chat_usage: events.filter(e => e.eventType === 'chat_usage').length,
  };

  const handleExportAnalyticsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pulsr-user-analytics.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Analytics tracking history downloaded.');
  };

  // Platform selection options
  const platformOptions = ['Twitter/X', 'LinkedIn', 'Instagram', 'Facebook', 'Threads', 'TikTok', 'All platforms'];

  // Save profile modifications
  const handleSaveProfile = () => {
    if (!name.trim() || !profession.trim() || !niche.trim()) {
      return toast.error('Full Name, Profession, and Niche are required parameters.');
    }

    if (profile) {
      const updated: UserProfile = {
        ...profile,
        name,
        profession,
        niche,
        primaryPlatform,
        contentVision,
        tone,
      };
      setProfile(updated);
      toast.success('Your content strategist profile updated.');
      setEditMode(false);
    }
  };

  // Reset database arrays safely with prompts
  const handleWipeDrafts = () => {
    clearSuggestions();
    setIsConfirmingWipeDrafts(false);
    toast.success('Draft history cleared.');
  };

  const handleWipeCalendar = () => {
    clearCalendar();
    setIsConfirmingWipeCalendar(false);
    toast.success('Calendar items empty.');
  };

  const handleFullReset = () => {
    resetProfile();
    clearSuggestions();
    clearCalendar();
    localStorage.removeItem('pulsr-chat-history');
    setIsConfirmingFullReset(false);
    toast.success('Profile wiped. Restarting Pulsr setup...');
    onReset(); // Informs parent to swap to onboarding panel!
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 select-none">
      {/* 1. Statistics / Analytics Grid */}
      <h2 className="hidden" id="settingsHeading">Profile Settings Dashboard</h2>
      <Card className="bg-gradient-to-br from-card to-surface/40 border-border-accent/40 col-span-2 select-none">
        <div className="flex items-center gap-2 mb-4 select-none">
          <BarChart3 className="h-4.5 w-4.5 text-accent" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
            Profile Performance Analytics
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg/40 border border-border-accent/25 p-3 rounded-xl select-none text-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-muted block">Produced Drafts</span>
            <span className="font-syne font-extrabold text-2xl text-bright block mt-1">{totalDrafts}</span>
          </div>

          <div className="bg-bg/40 border border-border-accent/25 p-3 rounded-xl select-none text-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-muted block">Agenda Slots</span>
            <span className="font-syne font-extrabold text-2xl text-bright block mt-1">{totalScheduled}</span>
          </div>

          <div className="bg-bg/40 border border-border-accent/25 p-3 rounded-xl select-none text-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-muted block">Campaign Posted</span>
            <span className="font-syne font-extrabold text-2xl text-accent block mt-1">{completedPosted}</span>
          </div>

          <div className="bg-bg/40 border border-border-accent/25 p-3 rounded-xl select-none text-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-muted block">Planned Actions</span>
            <span className="font-syne font-extrabold text-2xl text-warning block mt-1">{plannedPending}</span>
          </div>
        </div>
      </Card>

      {/* 2. Developer / Profile Settings block */}
      <Card className="border-border-accent/40 select-none">
        <div className="flex justify-between items-center border-b border-border-accent/35 pb-3 mb-4 select-none">
          <div className="flex items-center gap-2">
            <Settings className="h-4.5 w-4.5 text-accent" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
              Personalized AI Config
            </h3>
          </div>

          {!editMode ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditMode(true)}
              className="h-8 text-xs font-mono bg-surface hover:bg-card border border-border-accent/40"
            >
              <Edit3 className="h-3 w-3 mr-1.5" /> Modify Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(false)}
                className="h-8 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveProfile}
                className="h-8 text-xs font-mono font-bold flex gap-1"
              >
                <Save className="h-3 w-3" /> Save Config
              </Button>
            </div>
          )}
        </div>

        {/* Core fields info toggles layout */}
        {!editMode ? (
          <div className="space-y-4 select-text">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono text-muted block">Creator Name</span>
                <span className="text-sm font-semibold text-text-main mt-0.5 block">{profile?.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-muted block">Profession Role</span>
                <span className="text-sm font-semibold text-text-main mt-0.5 block">{profile?.profession}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-border-accent/25">
              <div>
                <span className="text-[10px] uppercase font-mono text-muted block">Niche Category</span>
                <span className="text-sm font-semibold text-text-main mt-0.5 block">{profile?.niche}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-muted block">Anchor Platform</span>
                <Badge variant="accent" className="mt-1">{profile?.primaryPlatform}</Badge>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-border-accent/25">
              <span className="text-[10px] uppercase font-mono text-muted block">Core Content Vision Statement</span>
              <p className="text-xs text-text-main/80 pt-1 leading-relaxed whitespace-pre-wrap leading-loose">
                {profile?.contentVision}
              </p>
            </div>

            <div className="pt-2 border-t border-dashed border-border-accent/25">
              <span className="text-[10px] uppercase font-mono text-muted block">Voice Custom Tone</span>
              <Badge variant="default" className="mt-1 font-mono">{profile?.tone}</Badge>
            </div>
          </div>
        ) : (
          /* Editable Form block elements */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted col-span-2">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted col-span-2 col-span-2">Profession</label>
                <Input value={profession} onChange={(e) => setProfession(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">Profession Niche</label>
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted col-span-2 select-none">Primary Platform</label>
                <select
                  value={primaryPlatform}
                  onChange={(e) => setPrimaryPlatform(e.target.value)}
                  className="w-full rounded-xl border border-border-accent bg-surface px-3 py-2 text-sm text-text-main focus:outline-none min-h-[44px] uppercase font-mono"
                >
                  {platformOptions.map((plat) => (
                    <option key={plat} value={plat}>{plat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">Voice Style Tone</label>
              <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Educating, Casual" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">Expanded Vision statement</label>
              <Textarea
                value={contentVision}
                onChange={(e) => setContentVision(e.target.value)}
                rows={5}
                className="min-h-[120px]"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Interactive Activity & Event Analytics Section */}
      <Card className="border-border-accent/40 select-none bg-gradient-to-br from-card to-bg/30">
        <div className="flex justify-between items-center border-b border-border-accent/35 pb-3 mb-4 select-none">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-accent" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              User Interactive Activity Tracking
            </h3>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportAnalyticsJSON}
              disabled={events.length === 0}
              className="h-8 text-[11px] font-mono bg-surface hover:bg-card border border-border-accent/40 flex gap-1"
            >
              <Download className="h-3 w-3" /> Dump Log (JSON)
            </Button>
            {isConfirmingResetLogs ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingResetLogs(false)}
                  className="h-8 text-[11px] font-mono text-muted hover:text-text-main bg-surface/50 border border-border-accent/30"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearAnalytics();
                    setIsConfirmingResetLogs(false);
                    toast.success('Analytics logs wiped.');
                  }}
                  className="h-8 text-[11px] font-mono text-error border border-error/30 bg-error/15 hover:bg-error/25 flex gap-1"
                >
                  Confirm Reset
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingResetLogs(true)}
                disabled={events.length === 0}
                className="h-8 text-[11px] font-mono text-error hover:bg-error/10 hover:text-bright flex gap-1 animate-none bg-transparent"
              >
                <Trash2 className="h-3 w-3" /> Reset Logs
              </Button>
            )}
          </div>
        </div>

        {/* Analytics Breakdown Grid inside Settings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
          <div className="p-3 bg-bg/30 rounded-xl border border-border-accent/20 flex flex-col items-center">
            <Sparkles className="h-4 w-4 text-accent mb-1" />
            <span className="text-[9px] uppercase font-mono text-muted text-center leading-none">Generations</span>
            <span className="font-syne font-extrabold text-lg text-bright mt-1.5 leading-none">{eventCounts.content_generation}</span>
          </div>

          <div className="p-3 bg-bg/30 rounded-xl border border-border-accent/20 flex flex-col items-center">
            <TrendingUp className="h-4 w-4 text-indigo-400 mb-1" />
            <span className="text-[9px] uppercase font-mono text-muted text-center leading-none">Trend Views</span>
            <span className="font-syne font-extrabold text-lg text-bright mt-1.5 leading-none">{eventCounts.trend_view}</span>
          </div>

          <div className="p-3 bg-bg/30 rounded-xl border border-border-accent/20 flex flex-col items-center">
            <Calendar className="h-4 w-4 text-emerald-400 mb-1" />
            <span className="text-[9px] uppercase font-mono text-muted text-center leading-none">Schedules</span>
            <span className="font-syne font-extrabold text-lg text-bright mt-1.5 leading-none">{eventCounts.calendar_interaction}</span>
          </div>

          <div className="p-3 bg-bg/30 rounded-xl border border-border-accent/25 flex flex-col items-center">
            <MessageSquare className="h-4 w-4 text-purple-400 mb-1" />
            <span className="text-[9px] uppercase font-mono text-muted text-center leading-none">AI Chats</span>
            <span className="font-syne font-extrabold text-lg text-bright mt-1.5 leading-none">{eventCounts.chat_usage}</span>
          </div>
        </div>

        {/* Events Lists section */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono text-muted tracking-wide block mb-2">Live Activity Log Timeline (Recent 8 Actions)</span>
          {events.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border-accent/30 rounded-xl bg-bg/25">
              <History className="h-8 w-8 text-muted mx-auto mb-2 opacity-50 block" />
              <p className="text-xs text-muted font-mono leading-relaxed px-4">No actions logged yet. Go explore suggestions, chat with Pulsr AI, or trigger scheduler planner grids to view event logs!</p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-1 space-y-2 scrollbar-none select-text">
              {events.slice(0, 8).map((evt) => {
                let colorClass = 'text-accent';
                let IconObj = Sparkles;
                if (evt.eventType === 'trend_view') { colorClass = 'text-indigo-400'; IconObj = TrendingUp; }
                if (evt.eventType === 'calendar_interaction') { colorClass = 'text-emerald-400'; IconObj = Calendar; }
                if (evt.eventType === 'chat_usage') { colorClass = 'text-purple-400'; IconObj = MessageSquare; }

                return (
                  <div key={evt.id} className="flex gap-2.5 items-start p-2.5 bg-bg/40 border border-border-accent/20 rounded-xl text-xs sm:items-center">
                    <div className={`p-1.5 rounded-lg bg-bg/60 border border-current/10 ${colorClass}`}>
                      <IconObj className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-main line-clamp-1">{evt.description}</p>
                      <span className="text-[9px] font-mono text-muted uppercase">
                        {evt.eventType.replace('_', ' ')} • {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Automated Content Retention Feature */}
      <Card className="border-border-accent/40 select-none bg-gradient-to-br from-card to-surface/30">
        <div className="flex items-center gap-2 border-b border-border-accent/35 pb-3 mb-4 select-none">
          <Clock className="h-4.5 w-4.5 text-accent" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
            Automated Content Retention
          </h3>
          <Badge variant="accent" className="ml-auto">Auto-Purge Engine</Badge>
        </div>

        <div className="space-y-4 font-sans text-sm">
          <p className="text-xs text-muted leading-relaxed">
            Configure how long generated content suggestions and drafts remain stored in your local inventory. Old drafts are automatically cleared to keep your Pulsr optimizer workspace clutter-free.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-bg/25 border border-border-accent/15 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-main font-mono">Retention Threshold</span>
              <p className="text-[10px] text-muted leading-tight">Drafts older than this will be automatically recycled.</p>
            </div>
            
            <div className="flex gap-1.5 bg-bg p-1 rounded-lg border border-border-accent/20">
              {[
                { value: 1, label: '24 Hours' },
                { value: 3, label: '3 Days' },
                { value: 7, label: '7 Days' },
                { value: 0, label: 'Never' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAutoClearDays(opt.value);
                    if (opt.value > 0) {
                      toast.success(`Retention threshold updated! Drafts older than ${opt.label} cleared.`);
                    } else {
                      toast.success('Auto-clear disabled. Drafts will persist indefinitely.');
                    }
                  }}
                  className={`text-[10px] uppercase font-mono font-bold px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    autoClearDays === opt.value
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'text-muted hover:text-text-main border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-bg/25 border border-border-accent/15 rounded-xl mt-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-main font-mono">Clear Content on Exit</span>
              <p className="text-[10px] text-muted leading-tight">Automatically purge all generated post content when switching tabs or closing the app.</p>
            </div>
            
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  const newVal = !clearCacheOnExit;
                  setClearCacheOnExit(newVal);
                  if (newVal) {
                    toast.success('Clear Content on Exit enabled. Suggestions will be auto-purged on tab switch or app exit.');
                  } else {
                    toast.success('Clear Content on Exit disabled. Suggestions will persist.');
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  clearCacheOnExit ? 'bg-accent' : 'bg-muted/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    clearCacheOnExit ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Database Clears & Purge Configuration layout */}
      <Card className="border-error/20 bg-error/[0.02] select-none">
        <div className="flex items-center gap-2 border-b border-error/15 pb-3 mb-4 select-none">
          <Database className="h-4.5 w-4.5 text-error" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-error">
            Critical Purge Operations
          </h3>
        </div>

        <div className="space-y-3.5 select-none font-sans">
          {/* Flush Generated Posts */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-bg/25 border border-border-accent/15 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-main font-mono">Suggestions Database</span>
              <p className="text-[10px] text-muted leading-tight font-medium">Remove all saved local draft templates and posts.</p>
            </div>
            <div className="flex items-center gap-1.5 self-end md:self-auto">
              {isConfirmingWipeDrafts ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfirmingWipeDrafts(false)}
                    className="h-8 px-2.5 text-[11px] font-mono text-muted hover:text-text-main bg-surface"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleWipeDrafts}
                    className="h-8 px-2.5 text-[11px] font-mono bg-error/15 border border-error/30 text-error hover:bg-error/25"
                  >
                    Confirm Clear
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingWipeDrafts(true)}
                  className="h-8 px-2.5 text-[11px] font-mono border border-error/15 text-error bg-surface hover:bg-error/10"
                >
                  Flush Suggestions
                </Button>
              )}
            </div>
          </div>

          {/* Flush Schedule */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-bg/25 border border-border-accent/15 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-main font-mono">Calendar Plans</span>
              <p className="text-[10px] text-muted leading-tight font-medium">Clear all schedule plans and simulated dashboard streams.</p>
            </div>
            <div className="flex items-center gap-1.5 self-end md:self-auto">
              {isConfirmingWipeCalendar ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfirmingWipeCalendar(false)}
                    className="h-8 px-2.5 text-[11px] font-mono text-muted hover:text-text-main bg-surface"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleWipeCalendar}
                    className="h-8 px-2.5 text-[11px] font-mono bg-error/15 border border-error/30 text-error hover:bg-error/25"
                  >
                    Confirm Clear
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingWipeCalendar(true)}
                  className="h-8 px-2.5 text-[11px] font-mono border border-error/15 text-error bg-surface hover:bg-error/10"
                >
                  Clear Schedule
                </Button>
              )}
            </div>
          </div>

          {/* Full System Reset */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-error/[0.04] border border-error/20 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-error font-mono">Factory Reset Workspace</span>
              <p className="text-[10px] text-muted leading-tight font-medium">Wipe profile setup, chat conversations, custom logs, and cached records.</p>
            </div>
            <div className="flex items-center gap-1.5 self-end md:self-auto">
              {isConfirmingFullReset ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfirmingFullReset(false)}
                    className="h-8 px-2.5 text-[11px] font-mono text-muted hover:text-text-main bg-surface"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleFullReset}
                    className="h-8 px-3 text-[11px] font-mono font-extrabold bg-error hover:bg-red-700 text-bg"
                  >
                    WIPE WORKSPACE
                  </Button>
                </>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsConfirmingFullReset(true)}
                  className="h-8 px-2.5 text-[11px] font-mono font-bold bg-error/10 hover:bg-error text-error hover:text-bg border border-error/20"
                >
                  <LogOut className="h-3 w-3 mr-1 mt-0.5 animate-pulse inline-block" /> Reset All
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
export default SettingsView;
