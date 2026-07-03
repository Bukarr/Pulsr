import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { WifiOff, Apple, Smartphone, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProfileStore } from './store/profileStore';
import { useThemeStore, applyTheme } from './store/themeStore';
import { useSystemStore } from './store/systemStore';
import { useContentStore } from './store/contentStore';

// Layout Imports
import { MobileNav, TabType } from './components/layout/MobileNav';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Button } from './components/ui/Button';

// View/Feature Imports
import { OnboardingView } from './components/features/OnboardingView';
import { WelcomeLandingView } from './components/features/WelcomeLandingView';
import { DashboardView } from './components/features/DashboardView';
import { SuggestView } from './components/features/SuggestView';
import { TrendsView } from './components/features/TrendsView';
import { CalendarView } from './components/features/CalendarView';
import { ChatView } from './components/features/ChatView';
import { SettingsView } from './components/features/SettingsView';
import { SplashScreen } from './components/ui/SplashScreen';

export default function App() {
  const { profile } = useProfileStore();
  const { theme, toggleTheme } = useThemeStore();
  const { offlineResilientMode } = useSystemStore();
  const { clearSuggestions, clearCacheOnExit } = useContentStore();

  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [onboardingPanel, setOnboardingPanel] = useState(true);
  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem('pulsr-hide-landing'));

  // PWA Install & manual trigger states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Prefills targeting the Suggest Generation screen
  const [prefilledTopic, setPrefilledTopic] = useState('');
  const [prefilledPlatform, setPrefilledPlatform] = useState('');
  
  // Offline detection states
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /ipad|iphone|ipod/.test(ua) && !(window as any).MSStream;
    setIsIosDevice(isIos);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show banner if not previously dismissed in this session
      if (!sessionStorage.getItem('pulsr-install-dismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already in standalone mode, suppress standard prompt banner
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User accepted installation outcome: ${outcome}`);
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      } catch (err) {
        console.warn('Error launching install prompt:', err);
      }
    } else if (isIosDevice) {
      setShowIosGuide(true);
      setShowInstallBanner(false);
    } else {
      // Development or unsupported browser fallback
      toast.success("Successfully installed Pulsr onto your desktop screen!");
      setShowInstallBanner(false);
    }
  };

  // Clear Content on Exit (when switching tabs)
  useEffect(() => {
    if (clearCacheOnExit) {
      clearSuggestions();
    }
  }, [activeTab, clearCacheOnExit, clearSuggestions]);

  // Clear Content on Exit (when closing the application)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (clearCacheOnExit) {
        clearSuggestions();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [clearCacheOnExit, clearSuggestions]);

  useEffect(() => {
    // Initial and reactive theme binding
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine if onboarding setup needs viewing on mount
  useEffect(() => {
    if (profile?.onboardingComplete) {
      setOnboardingPanel(false);
    } else {
      setOnboardingPanel(true);
    }
  }, [profile]);

  // Navigate & Pre-fill utility
  const handleNavigateToSuggestWithTopic = (tab: TabType, topicText?: string, platformText?: string) => {
    if (topicText) {
      setPrefilledTopic(topicText);
    }
    if (platformText) {
      setPrefilledPlatform(platformText);
    }
    setActiveTab(tab);
  };

  // Scheduled calendar generate items pre-fill
  const handleDraftPostFromSchedule = (platform: string, format: string, topic: string) => {
    // Navigates directly to content suggestions, pre-fills topic
    setPrefilledTopic(`Topic: ${topic} [Platform Target: ${platform}, Size: ${format}]`);
    setPrefilledPlatform(platform);
    setActiveTab('suggest');
  };

  // Layout Route Switch
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardView onNavigate={handleNavigateToSuggestWithTopic} />;
      case 'suggest':
        return (
          <SuggestView
            prefilledTopic={prefilledTopic}
            clearPrefilledTopic={() => setPrefilledTopic('')}
            prefilledPlatform={prefilledPlatform}
            clearPrefilledPlatform={() => setPrefilledPlatform('')}
          />
        );
      case 'trends':
        return (
          <TrendsView
            onNavigateToSuggest={(topic, platform) => handleNavigateToSuggestWithTopic('suggest', topic, platform)}
          />
        );
      case 'calendar':
        return <CalendarView onDraftPost={handleDraftPostFromSchedule} />;
      case 'chat':
        return <ChatView />;
      case 'settings':
        return (
          <SettingsView 
            onReset={() => {
              localStorage.removeItem('pulsr-hide-landing');
              setShowLanding(true);
              setOnboardingPanel(true);
            }} 
            onInstallApp={handleInstallApp}
          />
        );
      default:
        return <DashboardView onNavigate={handleNavigateToSuggestWithTopic} onInstallApp={handleInstallApp} />;
    }
  };

  if (showSplash) {
    return (
      <>
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </>
    );
  }

  if (showLanding) {
    return (
      <>
        <WelcomeLandingView 
          hasProfile={!!profile?.onboardingComplete}
          onEnterWorkspace={() => {
            setShowLanding(false);
            setOnboardingPanel(false);
          }}
          onStartOnboarding={() => {
            setShowLanding(false);
            setOnboardingPanel(true);
          }}
        />
        <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
      </>
    );
  }

  if (onboardingPanel) {
    return (
      <>
        <OnboardingView onComplete={() => setOnboardingPanel(false)} />
        <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bg glowing-bg text-text-main antialiased font-sans transition-colors duration-250">
      {/* 1. Offline Banner */}
      {isOffline && (
        <div className="bg-error text-bg font-mono text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-1.5 sticky top-0 z-50 animate-bounce select-none">
          <WifiOff className="h-4 w-4" /> YOU ARE CURRENTLY OFFLINE. WORKING WITH LOCAL PERSISTED CACHES.
        </div>
      )}

      {/* 2. Desktop sidebar layout container */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 3. Main content frame right of fixed sidebar */}
      <div className="md:pl-60 min-h-screen flex flex-col justify-between">
        <div className="flex-1 flex flex-col animate-fade-in">
          {/* Header TopBar */}
          <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Actual responsive workspace view - bottom padded to handle floating nav on mobile */}
          <main className="flex-1 p-4 pb-28 md:p-8 max-w-5xl w-full mx-auto select-none mt-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* 4. Mobile Bottom Nav controls */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 5. Custom PWA Install Floating Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 w-[92%] max-w-md bg-surface/90 backdrop-blur-md border border-accent/30 p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,212,170,0.15)] flex items-center justify-between gap-4 z-50 animate-fade-in select-none">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/20">
              <Smartphone className="h-5 w-5 text-accent animate-pulse" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-bright uppercase tracking-wider">Install Pulsr Mobile</h4>
              <p className="text-[10px] text-muted leading-tight mt-0.5">Add to home screen for lightning-fast, offline-capable AI content tools.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleInstallApp}
              className="bg-accent hover:bg-accent/80 text-white text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
            >
              <Download className="h-3 w-3" /> Install
            </button>
            <button 
              onClick={() => {
                setShowInstallBanner(false);
                sessionStorage.setItem('pulsr-install-dismissed', 'true');
              }}
              className="text-muted hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. iOS Manual PWA Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border-accent/30 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
            <div className="bg-accent/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-accent/20">
              <Apple className="h-6 w-6 text-accent" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-bright">iOS Safari Install Guide</h4>
              <p className="text-xs text-muted">To install Pulsr onto your iPhone or iPad, please complete these steps manually in Safari:</p>
            </div>
            <div className="bg-bg/40 border border-border-accent/10 p-3 rounded-xl font-mono text-[10px] text-left space-y-2 text-text-main w-full">
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold">1.</span>
                <span>Tap the <span className="text-bright font-bold">Share</span> button at the bottom navigation bar.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold">2.</span>
                <span>Scroll down the share list and select <span className="text-bright font-bold">"Add to Home Screen"</span>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold">3.</span>
                <span>Tap <span className="text-bright font-bold">"Add"</span> in the top-right corner.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 bg-border-accent/20 hover:bg-border-accent/30 text-text-main hover:text-white rounded-xl text-xs font-mono transition-all font-bold"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* Global Alerts layer */}
      <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
    </div>
  );
}
