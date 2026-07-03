import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Calendar, MessageSquare, Copy, Check, ArrowRight, Facebook, Linkedin, Instagram, Twitter, Smartphone, Download } from 'lucide-react';
import { useProfileStore } from '../../store/profileStore';
import { useContentStore } from '../../store/contentStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { TabType } from '../layout/MobileNav';
import { formatRelativeTime, pulsrFetch } from '../../lib/utils';
import toast from 'react-hot-toast';

interface DashboardViewProps {
  onNavigate: (tab: TabType, prefilledTopic?: string, prefilledPlatform?: string) => void;
  onInstallApp?: () => void;
}

export function DashboardView({ onNavigate, onInstallApp }: DashboardViewProps) {
  const { profile } = useProfileStore();
  const { suggestions } = useContentStore();

  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [welcomeLoading, setWelcomeLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Dynamic trending chips loaded in background
  const [trendChips, setTrendChips] = useState<string[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);

  useEffect(() => {
    // Check if currently running inside installed standalone PWA
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);
  }, []);

  // 1. Fetch AI Welcome Message
  useEffect(() => {
    let active = true;
    async function getAIWelcome() {
      if (!profile) return;
      try {
        setWelcomeLoading(true);
        const response = await pulsrFetch('/api/gemini/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile }),
        });
        if (!response.ok) throw new Error('Failed to load welcome');
        const data = await response.json();
        if (active && data?.message) {
          setWelcomeMsg(data.message);
        }
      } catch (err) {
        console.error('AI Welcome Card failed:', err);
        if (active) {
          setWelcomeMsg(`Welcome back, ${profile.name}! Amplify your expertise in ${profile.niche} today using Pulsr AI.`);
        }
      } finally {
        if (active) setWelcomeLoading(false);
      }
    }

    getAIWelcome();
    return () => {
      active = false;
    };
  }, [profile]);

  // 2. Fetch or mock recent trending topics in niche background
  useEffect(() => {
    let active = true;
    async function loadBackgroundTrends() {
      if (!profile) return;
      try {
        setTrendsLoading(true);
        const response = await pulsrFetch('/api/gemini/trends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile }),
        });
        if (!response.ok) throw new Error('Failed to fetch chips');
        const data = await response.json();
        if (active && Array.isArray(data)) {
          const topics = data.map((t: any) => t.topic).slice(0, 5);
          setTrendChips(topics);
        }
      } catch (err) {
        console.error('Trends horizontal loader failed:', err);
        // Fallback default niche chips
        if (active) {
          setTrendChips([
            `${profile.niche} Tools`,
            `Future of ${profile.profession}`,
            `${profile.niche} Guide`,
            `Authority Building`,
            `Growth Hacks`,
          ]);
        }
      } finally {
        if (active) setTrendsLoading(false);
      }
    }

    loadBackgroundTrends();
    return () => {
      active = false;
    };
  }, [profile]);

  // Copy to clipboard helper
  const handleCopy = async (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Post copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Copy to clipboard failed.');
    }
  };

  const recentItems = suggestions.slice(0, 3);

  // Quick action definition
  const actions = [
    {
      label: 'Generate Content',
      id: 'suggest' as const,
      desc: 'Create fresh AI suggestions',
      icon: Sparkles,
      color: 'bg-card border-border-accent/50 hover:border-accent/40 text-text-main',
    },
    {
      label: 'View Live Trends',
      id: 'trends' as const,
      desc: 'Browse search-grounded topics',
      icon: TrendingUp,
      color: 'bg-card border-border-accent/50 hover:border-accent/40 text-text-main',
    },
    {
      label: 'Manage Calendar',
      id: 'calendar' as const,
      desc: 'Schedule and coordinate posts',
      icon: Calendar,
      color: 'bg-card border-border-accent/50 hover:border-accent/40 text-text-main',
    },
    {
      label: 'Ask Pulsr AI',
      id: 'chat' as const,
      desc: 'Brainstorm with chatbot',
      icon: MessageSquare,
      color: 'bg-card border-border-accent/50 hover:border-accent/40 text-text-main',
    },
  ];

  return (
    <div className="space-y-7 pb-20 md:pb-8 select-none">
      {/* 1. AI Welcome Greetings Card */}
      <h2 className="hidden" id="dashboardHeading">Dashboard Overview</h2>
      <Card
        glow
        className="border-accent/20 bg-gradient-to-r from-card/85 to-surface/95 relative before:opacity-10"
      >
        {welcomeLoading ? (
          <div className="space-y-4 py-2 animate-pulse">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full bg-accent/30" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
            <div className="pt-2">
              <Skeleton className="h-3.5 w-48" />
            </div>
          </div>
        ) : (
          <div className="space-y-2 select-text">
            <span className="text-[10px] tracking-wider uppercase font-mono text-accent font-extrabold flex items-center gap-1">
              <Sparkles className="h-3 w-3 animate-pulse" /> Pulsr Strategic Advice
            </span>
            <p className="font-sans text-md md:text-lg text-text-main leading-relaxed font-semibold">
              "{welcomeMsg}"
            </p>
            <p className="text-xs text-muted font-mono pt-1">
              PROFILESYNCED: {profile?.name.toUpperCase()} / {profile?.niche.toUpperCase()}
            </p>
          </div>
        )}
      </Card>

      {/* 2. Trending in Niche horizontal chip row */}
      {(!trendsLoading || trendChips.length > 0) && (
        <div className="space-y-2 select-none">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-[#22C55E]">
              Trending in: <span className="text-text-main dark:text-[#E8F5E9] font-bold">{profile?.niche}</span>
            </h3>
          </div>

          {trendsLoading ? (
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none animate-pulse">
              <Skeleton className="h-8 w-28 rounded-full shrink-0" />
              <Skeleton className="h-8 w-36 rounded-full shrink-0" />
              <Skeleton className="h-8 w-24 rounded-full shrink-0" />
              <Skeleton className="h-8 w-32 rounded-full shrink-0" />
              <Skeleton className="h-8 w-28 rounded-full shrink-0" />
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none select-none scroll-smooth">
              {trendChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate('suggest', chip)}
                  className="flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-border-accent bg-surface hover:border-accent text-xs font-mono font-medium text-muted hover:text-bright transition-all active:scale-95"
                >
                  <Sparkles className="h-3 w-3 text-accent" /> {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progressive Web App Installer Callout Banner */}
      {!isStandalone && onInstallApp && (
        <Card className="bg-gradient-to-r from-accent/15 via-accent/5 to-surface border-accent/25 p-5 flex flex-col md:flex-row items-center justify-between gap-4 select-none animate-fade-in relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none group-hover:bg-accent/10 transition-all duration-300" />
          <div className="space-y-1.5 text-left z-10">
            <span className="text-[10px] uppercase font-mono font-extrabold text-accent flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5 animate-bounce" /> Install Pulsr Web App
            </span>
            <h4 className="font-syne font-bold text-text-main text-sm sm:text-base leading-tight">
              Get the native desktop or mobile workspace
            </h4>
            <p className="text-xs text-muted max-w-xl leading-relaxed">
              Add Pulsr directly to your home screen or desktop. Runs inside its own sleek hardware window with offline resilience, gesture slide sheets, and optimized load performance.
            </p>
          </div>
          <Button
            onClick={onInstallApp}
            variant="primary"
            size="sm"
            className="w-full md:w-auto font-mono font-bold text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 justify-center py-2 px-4 shadow-[0_4px_20px_rgba(0,212,170,0.15)] hover:shadow-[0_4px_25px_rgba(0,212,170,0.25)] transition-all cursor-pointer z-10 active:scale-95 text-white"
          >
            <Download className="h-3.5 w-3.5" /> Install App
          </Button>
        </Card>
      )}

      {/* Direct Platform Drafting Section */}
      <div className="space-y-3 select-none">
        <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-muted px-1">
          Select Platform to Auto-Draft
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Twitter/X', label: 'X (Twitter)', icon: Twitter, color: 'text-sky-400 border-sky-500/20 bg-sky-950/10 hover:border-sky-500/40' },
            { name: 'LinkedIn', label: 'LinkedIn', icon: Linkedin, color: 'text-indigo-400 border-indigo-500/20 bg-indigo-950/10 hover:border-indigo-500/40' },
            { name: 'Facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-400 border-blue-500/20 bg-blue-950/10 hover:border-blue-500/40' },
            { name: 'Instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400 border-pink-500/20 bg-pink-950/10 hover:border-pink-500/40' },
          ].map((plat) => {
            const PlatIcon = plat.icon;
            return (
              <button
                key={plat.name}
                onClick={() => {
                  toast.success(`Drafting tailored content for ${plat.label}...`);
                  onNavigate('suggest', undefined, plat.name);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-95 group hover:shadow-md ${plat.color}`}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-current/10 mb-2">
                  <PlatIcon className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono font-bold text-text-main group-hover:text-bright transition-colors">
                  {plat.label}
                </span>
                <span className="text-[9px] text-muted font-mono mt-1">
                  Draft with AI
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Quick Actions 4-tile layout */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-muted px-1">
          Quick Action Matrix
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => onNavigate(act.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left outline-none relative group cursor-pointer active:scale-95 ${act.color}`}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent/10 text-accent mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-syne font-bold text-sm text-text-main group-hover:text-bright leading-tight">
                  {act.label}
                </h4>
                <p className="text-[11px] text-muted leading-snug mt-1 max-w-[90%] md:max-w-none group-hover:text-text-main/70">
                  {act.desc}
                </p>
                <ArrowRight className="absolute bottom-4 right-4 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Content from store */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-muted">
            Recently Generated
          </h3>
          {suggestions.length > 3 && (
            <button
              onClick={() => onNavigate('suggest')}
              className="text-xs font-mono text-accent hover:text-bright flex items-center"
            >
              See All ({suggestions.length}) <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          )}
        </div>

        {recentItems.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-border-accent/30 bg-surface/15">
            <div className="h-11 w-11 rounded-full bg-surface border border-border-accent/30 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-5 w-5 text-muted" />
            </div>
            <p className="text-sm font-medium text-text-main">No generated items stored</p>
            <p className="text-xs text-muted font-mono mt-1 mb-4">Start by asking AI to suggest something special</p>
            <Button variant="primary" size="md" onClick={() => onNavigate('suggest')} className="font-bold">
              Generate Your First Post
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentItems.map((item) => {
              const fullText = `${item.engagementHook}\n\n${item.content}`;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => onNavigate('suggest')}
                  className="rounded-2xl border border-border-accent bg-card/45 p-4 flex flex-col justify-between hover:border-accent/25 transition-all h-full cursor-pointer relative group"
                >
                  <div className="space-y-2 flex-grow">
                    <div className="flex justify-between items-center select-none mb-1">
                      <Badge variant="accent">{item.platform}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleCopy(e, item.id, `${fullText}\n\n${item.hashtags.join(' ')}`)}
                        className="h-8 w-8 min-w-[32px] p-1.5 text-muted hover:text-accent hover:bg-surface rounded-lg"
                        title="Copy to clipboard"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>

                    <h4 className="font-syne font-bold text-text-main text-sm truncate">
                      {item.engagementHook}
                    </h4>
                    <p className="text-xs text-text-main/80 line-clamp-3 leading-relaxed font-sans select-text">
                      {item.content}
                    </p>
                  </div>

                  <div className="border-t border-border-accent/30 pt-2.5 mt-3 flex justify-between items-center select-none text-[10px] font-mono text-muted">
                    <span>{item.format}</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
