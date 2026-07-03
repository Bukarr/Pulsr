import { Settings, Sun, Moon } from 'lucide-react';
import { useProfileStore } from '../../store/profileStore';
import { useThemeStore } from '../../store/themeStore';
import { Button } from '../ui/Button';
import { TabType } from './MobileNav';

interface TopBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function TopBar({ activeTab, setActiveTab }: TopBarProps) {
  const { profile } = useProfileStore();
  const { theme, toggleTheme } = useThemeStore();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Dashboard';
      case 'suggest':
        return 'Content Generation';
      case 'trends':
        return 'Live Industry Trends';
      case 'calendar':
        return 'Content Schedule';
      case 'chat':
        return 'Pulsr AI Assistant';
      case 'settings':
        return 'System Settings';
      default:
        return 'Pulsr';
    }
  };

  const getInitials = () => {
    if (!profile?.name) return 'PL';
    return profile.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 bg-bg/75 backdrop-blur-md border-b border-border-accent/40 px-4 md:px-8">
      {/* Mobile Bar Design */}
      <div className="flex md:hidden items-center justify-between w-full">
        {/* Placeholder spacer */}
        <div className="w-8" />

        {/* Brand Logo Centered */}
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab('home')}>
          <span className="font-syne font-extrabold text-accent select-none text-xl tracking-tight">
            Pulsr<span className="text-text-main">.</span>
          </span>
        </div>

        {/* Action Controls right */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full min-w-[36px] min-h-[36px] p-1.5 hover:bg-surface text-muted hover:text-text-main"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-warning" /> : <Moon className="h-4.5 w-4.5 text-accent" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab('settings')}
            className="rounded-full min-w-[36px] min-h-[36px] p-1.5 hover:bg-surface text-muted hover:text-text-main"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Bar Design */}
      <div className="hidden md:flex items-center justify-between w-full">
        {/* Left Side title */}
        <h1 className="font-syne font-bold text-xl text-text-main tracking-tight select-none">
          {getPageTitle()}
        </h1>

        {/* Right Side Controls & Avatar */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full min-w-[36px] min-h-[36px] p-1.5 hover:bg-surface text-muted hover:text-text-main transition-all"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-warning" /> : <Moon className="h-5 w-5 text-accent" />}
          </Button>

          {profile && (
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 outline-none select-none group"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent/20 border border-accent/40 font-mono text-xs font-bold text-accent group-hover:bg-accent/30 transition-all select-none animate-fade-in">
                {getInitials()}
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
