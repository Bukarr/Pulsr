import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, HelpCircle, History, MessageSquare, Plus } from 'lucide-react';
import { useProfileStore } from '../../store/profileStore';
import { useContentStore } from '../../store/contentStore';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { ContentSuggestion } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Chip } from '../ui/Chip';
import { ContentCard } from './ContentCard';
import { ContentEditor } from './ContentEditor';
import { ContentCardSkeleton } from '../ui/Skeleton';
import { BottomSheet } from '../ui/BottomSheet';
import { PublishExportModal } from './PublishExportModal';
import { pulsrFetch } from '../../lib/utils';
import toast from 'react-hot-toast';

interface SuggestViewProps {
  prefilledTopic?: string;
  clearPrefilledTopic: () => void;
}

export function SuggestView({ prefilledTopic, clearPrefilledTopic }: SuggestViewProps) {
  const { profile } = useProfileStore();
  const { suggestions, addSuggestion, updateSuggestion, deleteSuggestion } = useContentStore();
  const { trackEvent } = useAnalyticsStore();

  const [platform, setPlatform] = useState('Twitter/X');
  const [format, setFormat] = useState('Single Tweet');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  // Editor states
  const [editingSuggestion, setEditingSuggestion] = useState<ContentSuggestion | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Publish/Export modal states
  const [publishingItem, setPublishingItem] = useState<ContentSuggestion | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // If prefilled topic is passed from Dashboard/Trends, consume and populate it
  useEffect(() => {
    if (prefilledTopic) {
      setTopic(prefilledTopic);
      // Clean up the parameter in the parent so it does not repeat if they toggle tabs
      clearPrefilledTopic();
    }
  }, [prefilledTopic]);

  // Handle formats based on selected platform
  const getFormatOptions = (plat: string) => {
    switch (plat.toLowerCase()) {
      case 'twitter/x':
      case 'x':
      case 'twitter':
        return ['Single Tweet', 'Thread Starter', 'Quote Hook', 'Poll Idea'];
      case 'linkedin':
        return ['Short Post', 'Story Post', 'Insight', 'Carousel Concept', 'Newsletter Intro'];
      case 'instagram':
        return ['Caption', 'Story Text', 'Reel Hook', 'Carousel Intro'];
      case 'threads':
        return ['Single Post', 'Thread'];
      case 'tiktok':
        return ['Video Hook', 'Script Outline', 'Caption'];
      case 'all platforms':
      case 'all':
      default:
        return ['Short Post', 'Thread', 'Long-form Hook'];
    }
  };

  // Adjust default format whenever platform toggles
  const handlePlatformChange = (plat: string) => {
    setPlatform(plat);
    const formats = getFormatOptions(plat);
    setFormat(formats[0]);
  };

  // 3. Generation Logic (calls POST /api/gemini/suggest)
  const handleGenerateContent = async (customTopic?: string, customPlatform?: string, customFormat?: string) => {
    if (!profile) {
      toast.error('Profile metrics not found. Recalibrate in Settings.');
      return;
    }

    const targetPlatform = customPlatform || platform;
    const targetFormat = customFormat || format;
    const targetTopic = customTopic !== undefined ? customTopic : topic;

    setLoading(true);
    const toastId = toast.loading('Pulsr is channeling Gemini AI...');

    try {
      const response = await pulsrFetch('/api/gemini/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          platform: targetPlatform,
          format: targetFormat,
          topic: targetTopic,
        }),
      });

      if (!response.ok) {
        const errDetails = await response.json();
        throw new Error(errDetails?.error || 'Content generation failed');
      }

      const postData = await response.json();

      if (postData && postData.content) {
        // Create full ContentSuggestion node
        const newSuggestion: ContentSuggestion = {
          id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          headline: postData.headline || 'Generated Suggestion',
          content: postData.content,
          hashtags: Array.isArray(postData.hashtags) ? postData.hashtags : [],
          tip: postData.tip || '',
          bestTimeToPost: postData.bestTimeToPost || 'Peak engagement times',
          engagementHook: postData.engagementHook || '',
          platform: targetPlatform,
          format: targetFormat,
          createdAt: new Date().toISOString(),
        };

        addSuggestion(newSuggestion);
        trackEvent(
          'content_generation',
          `Generated ${targetPlatform} ${targetFormat} post about "${targetTopic || 'auto-selected topic'}"`,
          { platform: targetPlatform, format: targetFormat, topic: targetTopic }
        );
        toast.success(`Fresh ${targetPlatform} post draft ready!`, { id: toastId });
        
        // Clear topic field back to original
        setTopic('');
      } else {
        throw new Error('Received incomplete response data structure.');
      }
    } catch (error: any) {
      console.error('Suggest Error:', error);
      toast.error(error?.message || 'Failed to generate suggested post. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Regenerate button event
  const handleRegenerate = (item: ContentSuggestion) => {
    handleGenerateContent(item.headline, item.platform, item.format);
  };

  // Toggle editor opening
  const handleOpenEditor = (item: ContentSuggestion) => {
    setEditingSuggestion(item);
    setIsEditorOpen(true);
  };

  // Write edited values back to store
  const handleSaveEdit = (id: string, updatedContent: string, updatedHook?: string) => {
    updateSuggestion(id, {
      content: updatedContent,
      engagementHook: updatedHook || '',
    });
    setIsEditorOpen(false);
    setEditingSuggestion(null);
  };

  const platforms = ['Twitter/X', 'LinkedIn', 'Instagram', 'Threads', 'TikTok', 'All platforms'];
  const formattedOptionsList = getFormatOptions(platform);

  return (
    <div className="space-y-6 select-none pb-20 md:pb-8">
      {/* Dynamic Cockpit generating panel */}
      <h2 className="hidden" id="suggestHeading">Content Suggestion Engine</h2>
      <Card className="sticky top-14 z-20 bg-surface/90 backdrop-blur-md border-border-accent/80 p-5 space-y-4 shadow-lg select-none">
        {/* 1. Platform chips row */}
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">Aimed Platform</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {platforms.map((plat) => (
              <button
                key={plat}
                type="button"
                onClick={() => handlePlatformChange(plat)}
                className={`text-xs px-3.5 py-2 rounded-xl border font-mono transition-all font-medium whitespace-nowrap active:scale-95 ${
                  platform === plat
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-bg border-border-accent/40 text-muted hover:text-text-main'
                }`}
              >
                {plat}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Format options depending on layout */}
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted col-span-2">Desired Post Format</label>
          <div className="flex flex-wrap gap-1.5 leading-relaxed bg-bg/40 p-1.5 rounded-xl border border-border-accent/20">
            {formattedOptionsList.map((form) => (
              <button
                key={form}
                type="button"
                onClick={() => setFormat(form)}
                className={`text-[11px] px-3.5 py-1.5 rounded-lg border font-mono transition-all font-semibold active:scale-95 ${
                  format === form
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-transparent border-transparent text-muted hover:text-text-main'
                }`}
              >
                {form}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Short Keyword search input */}
        <div className="space-y-1.5 flex flex-col">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">Focused Topic / Context</label>
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. '3 React lifehacks', 'My workspace tour', or leave blank to auto-decide..."
              className="flex-1"
              disabled={loading}
            />
            <Button
              variant="primary"
              size="md"
              onClick={() => handleGenerateContent(topic, platform, format)}
              loading={loading}
              disabled={loading}
              className="px-5 font-bold flex gap-1.5 shadow-[0_4px_12px_rgba(34,197,94,0.15)] select-none text-bg"
            >
              <Sparkles className="h-4 w-4 text-bg font-bold animate-pulse" /> Generate
            </Button>
          </div>
        </div>
      </Card>

      {/* Suggestion content results column */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-muted px-1 flex items-center gap-1.5 select-none">
          <History className="h-4 w-4 text-accent" /> Draft History Inventory
        </h3>

        {/* Real-time Loading Placeholder placement */}
        <AnimatePresence mode="popLayout">
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <ContentCardSkeleton />
              <ContentCardSkeleton />
            </motion.div>
          )}

          {suggestions.length === 0 && !loading ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border-accent/30 bg-surface/10">
              <Sparkles className="h-10 w-10 text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-main leading-snug">No drafts produced yet</p>
              <p className="text-xs text-muted font-mono mt-1 max-w-xs mx-auto text-center leading-relaxed">
                Add a focused keyword and click "Generate" above to create unique drafts driven by Gemini AI!
              </p>
            </div>
          ) : (
            suggestions.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: 'spring', duration: 0.4 }}
              >
                <ContentCard
                  suggestion={item}
                  onEdit={handleOpenEditor}
                  onRegenerate={handleRegenerate}
                  onSave={() => {
                    toast.success('Draft persists on clipboard automatically.');
                  }}
                  isSaved={true}
                  onPublish={(itm) => {
                    setPublishingItem(itm);
                    setIsPublishModalOpen(true);
                  }}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Mobile-responsive Bottom Drawer Editor panel */}
      <BottomSheet
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="Polish Post Draft"
      >
        {editingSuggestion && (
          <ContentEditor
            suggestion={editingSuggestion}
            onSave={handleSaveEdit}
            onClose={() => setIsEditorOpen(false)}
          />
        )}
      </BottomSheet>

      <PublishExportModal
        isOpen={isPublishModalOpen}
        onClose={() => {
          setIsPublishModalOpen(false);
          setPublishingItem(null);
        }}
        suggestion={publishingItem}
      />
    </div>
  );
}
