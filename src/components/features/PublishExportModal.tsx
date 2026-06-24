import React, { useState, useEffect } from 'react';
import { useContentStore } from '../../store/contentStore';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { ContentSuggestion } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { 
  Download, 
  Clock, 
  Sparkles, 
  Send, 
  Check, 
  Twitter, 
  Linkedin, 
  FileJson, 
  FileSpreadsheet, 
  Globe,
  Share2,
  Facebook,
  Instagram,
  Copy,
  ExternalLink,
  Smartphone,
  Mail,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PublishExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: ContentSuggestion | null;
}

export function PublishExportModal({ isOpen, onClose, suggestion }: PublishExportModalProps) {
  const { suggestions } = useContentStore();
  const { trackEvent } = useAnalyticsStore();

  const [draftText, setDraftText] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Initial form calibration
  useEffect(() => {
    if (suggestion) {
      const formattedText = `${suggestion.engagementHook}\n\n${suggestion.content}\n\n${suggestion.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`;
      setDraftText(formattedText);
    }
  }, [suggestion]);

  if (!suggestion) return null;

  // Real-world Web Share API / Native Device sharing integration
  const handleDirectShareAPI = async () => {
    if (!suggestion) return;
    const shareText = draftText || `${suggestion.engagementHook}\n\n${suggestion.content}\n\n${suggestion.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pulsr AI Draft: ${suggestion.headline}`,
          text: shareText,
          url: window.location.origin
        });
        trackEvent('calendar_interaction', 'Shared draft via Device Share API', { suggestionId: suggestion.id });
        toast.success('Successfully opened device sharing options!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Web Share API error:', err);
          toast.error('Sharing was cancelled or unsupported.');
        }
      }
    } else {
      // Fallback: Copy to Clipboard and prompt
      navigator.clipboard.writeText(shareText);
      trackEvent('calendar_interaction', 'Copied draft as fallback for Share API', { suggestionId: suggestion.id });
      toast.success('Full draft text copied to clipboard!');
    }
  };

  // Specific Social Media direct links / intent APIs
  const handleShareToPlatform = (target: string) => {
    if (!suggestion) return;
    const fullText = draftText || `${suggestion.engagementHook}\n\n${suggestion.content}\n\n${suggestion.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`;
    
    // Auto-copy to clipboard first to ensure maximum convenience
    navigator.clipboard.writeText(fullText);

    let url = '';
    let successMsg = 'Caption copied! Opening creation portal...';

    switch (target.toLowerCase()) {
      case 'twitter':
      case 'x':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
        successMsg = 'Draft copied! Opening X / Twitter composer...';
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(fullText)}`;
        successMsg = 'Draft copied! Opening LinkedIn post section...';
        break;
      case 'facebook':
        url = 'https://www.facebook.com/';
        successMsg = 'Full post copied! Opening Facebook... Click "What\'s on your mind?" and paste.';
        break;
      case 'threads':
        url = `https://threads.net/intent/post?text=${encodeURIComponent(fullText)}`;
        successMsg = 'Draft copied! Opening Threads composer...';
        break;
      case 'instagram':
        url = 'https://www.instagram.com/';
        successMsg = 'Caption copied! Opening Instagram... Create post & paste.';
        break;
      case 'tiktok':
        url = 'https://www.tiktok.com/upload';
        successMsg = 'Caption copied! Opening TikTok upload... Paste caption.';
        break;
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
        successMsg = 'Draft copied! Opening WhatsApp chat...';
        break;
      case 'telegram':
        url = `https://t.me/share/url?text=${encodeURIComponent(fullText)}`;
        successMsg = 'Draft copied! Opening Telegram chat...';
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent("Pulsr Social Media Draft: " + suggestion.headline)}&body=${encodeURIComponent(fullText)}`;
        successMsg = 'Draft copied! Opening Email composer...';
        break;
      default:
        url = 'https://www.google.com';
        break;
    }

    trackEvent('calendar_interaction', `Shared draft to specific portal: ${target}`, { suggestionId: suggestion.id });
    toast.success(successMsg);
    
    // Open in a new tab safely
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    }, 600);
  };

  // 2. Export single suggestion JSON package
  const handleExportJSONSingle = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(suggestion, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pulsr-post-${suggestion.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    trackEvent('content_generation', `Exported content item to JSON`, { suggestionId: suggestion.id });
    toast.success('JSON feed package downloaded.');
  };

  // 3. Export all suggested drafts to single JSON package
  const handleExportJSONAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(suggestions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pulsr-all-drafts.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    trackEvent('content_generation', `Exported all ${suggestions.length} suggestions to JSON`);
    toast.success('All drafts exported collectively as JSON.');
  };

  // RFC Compliant CSV Cell Escaper helper
  const escapeCSV = (text: string) => {
    if (!text) return '""';
    const cleanText = text.replace(/"/g, '""');
    return `"${cleanText}"`;
  };

  // 4. Export single suggestion to CSV format
  const handleExportCSVSingle = () => {
    const headers = ['ID', 'Topic/Headline', 'Platform', 'Format', 'Hook/Headline', 'Content Body', 'Hashtags', 'Best Time To Post', 'Insight Tip', 'Created At'];
    const row = [
      suggestion.id,
      suggestion.headline,
      suggestion.platform,
      suggestion.format,
      suggestion.engagementHook,
      suggestion.content,
      suggestion.hashtags.join(' '),
      suggestion.bestTimeToPost,
      suggestion.tip,
      suggestion.createdAt
    ];

    const csvContent = [
      headers.map(escapeCSV).join(','),
      row.map(escapeCSV).join(',')
    ].join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataUri);
    downloadAnchor.setAttribute('download', `pulsr-post-${suggestion.id}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    trackEvent('content_generation', `Exported content item to CSV`, { suggestionId: suggestion.id });
    toast.success('CSV Content row downloaded successfully.');
  };

  // 5. Export all suggestions to bulk CSV template file
  const handleExportCSVAll = () => {
    if (suggestions.length === 0) {
      toast.error('No inventory drafts found to bulk export.');
      return;
    }

    const headers = ['ID', 'Topic/Headline', 'Platform', 'Format', 'Hook/Headline', 'Content Body', 'Hashtags', 'Best Time To Post', 'Insight Tip', 'Created At'];
    
    const rows = suggestions.map(item => [
      item.id,
      item.headline,
      item.platform,
      item.format,
      item.engagementHook,
      item.content,
      item.hashtags.join(' '),
      item.bestTimeToPost,
      item.tip,
      item.createdAt
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataUri);
    downloadAnchor.setAttribute('download', `pulsr-bulk-marketing-feed.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    trackEvent('content_generation', `Exported all ${suggestions.length} suggestions to CSV`);
    toast.success(`Bulk CSV Feed generated for ${suggestions.length} posts!`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish & Export Optimization Hub">
      <div className="space-y-6 select-none">
        {/* Suggestion Summary Header */}
        <div className="bg-emerald-50/50 dark:bg-[#0A1A0D] border border-emerald-500/10 dark:border-[#22C55E]/20 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#4A7A52] dark:text-emerald-400">Active Selection Draft</span>
            <Badge variant="accent">{suggestion.platform} • {suggestion.format}</Badge>
          </div>
          <p className="text-sm font-semibold text-bright italic line-clamp-1">"{suggestion.engagementHook || suggestion.headline}"</p>
          <div className="flex items-center gap-2 text-xs font-mono text-muted pt-1 border-t border-dashed border-emerald-500/10 dark:border-[#132B18]">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span>Optimal Publishing window: <strong className="text-text-main font-mono">{suggestion.bestTimeToPost}</strong></span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Interactive Draft Caption Tweak Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-accent flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent animate-pulse" /> Live Caption Tweak Area
              </label>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(draftText);
                  setCopiedText(true);
                  toast.success('Formatted post copied to clipboard!');
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="text-[10px] font-mono text-accent hover:text-bright flex items-center gap-1 transition-colors bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-md cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="h-3 w-3 text-[#22C55E]" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy Full Draft
                  </>
                )}
              </button>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full h-32 text-xs font-sans rounded-xl bg-surface border border-border-accent/40 text-text-main p-3 focus:outline-none focus:border-accent/80 select-text resize-none leading-relaxed"
              placeholder="Formulating caption..."
            />
            <p className="text-[10px] text-muted leading-tight">
              💡 Clicking any platform below will <strong className="text-accent">automatically copy</strong> this live caption and launch the platform's composer with the text pre-filled.
            </p>
          </div>

          {/* Real-time Social Media Share API & Brand Integrations */}
          <div className="pt-4 border-t border-border-accent/35 space-y-3">
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#22C55E]">Option A: Instant Social App Launcher</h4>
            <p className="text-[11px] leading-relaxed text-muted font-sans">
              Open your native device share sheets or launch optimized, pre-filled composer interfaces directly in your browser.
            </p>

            {/* Native browser share API */}
            <Button 
              variant="primary" 
              onClick={handleDirectShareAPI}
              className="w-full text-white font-bold flex gap-1.5 h-11 bg-gradient-to-r from-accent to-emerald-500 hover:opacity-90 border-0 shadow-lg shadow-accent/10"
            >
              <Share2 className="h-4 w-4 text-white" /> Share via Device System Sheet
            </Button>

            {/* Quick Launch Icons Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleShareToPlatform('x')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Twitter className="h-5 w-5 text-bright group-hover:text-accent transition-colors" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">X / Twitter</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('linkedin')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Linkedin className="h-5 w-5 text-[#0A66C2] group-hover:opacity-80 transition-opacity" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">LinkedIn</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('facebook')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Facebook className="h-5 w-5 text-[#1877F2] group-hover:opacity-80 transition-opacity" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('threads')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Globe className="h-5 w-5 text-bright group-hover:text-accent transition-colors" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">Threads</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('instagram')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Instagram className="h-5 w-5 text-[#E1306C] group-hover:opacity-80 transition-opacity" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">Instagram</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('tiktok')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Smartphone className="h-5 w-5 text-[#FE2C55] group-hover:opacity-80 transition-opacity" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">TikTok</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('whatsapp')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <MessageSquare className="h-5 w-5 text-[#25D366] group-hover:opacity-80 transition-opacity" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('telegram')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Send className="h-5 w-5 text-[#0088cc] group-hover:opacity-80 transition-opacity" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">Telegram</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToPlatform('email')}
                className="bg-surface hover:bg-surface-accent border border-border-accent/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <Mail className="h-5 w-5 text-accent group-hover:text-bright transition-colors" />
                <span className="text-[10px] font-mono font-bold text-text-main group-hover:text-bright transition-colors">Email</span>
              </button>
            </div>
          </div>

          {/* Offline Export utilities row */}
          <div className="pt-4 border-t border-border-accent/35 space-y-3.5">
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#22C55E]">Option B: Offline Spreadsheet / Coding Feed Import</h4>
            <p className="text-[11px] leading-relaxed text-muted font-sans">
              Download structured data modules containing high-converting copy, hashtags, optimization advice, and timing attributes to import directly into Buffer, Notion, or Hootsuite.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="secondary" 
                onClick={handleExportJSONSingle}
                className="text-xs h-10 border border-border-accent/40 font-mono text-muted hover:text-bright flex gap-1 bg-surface"
              >
                <FileJson className="h-4 w-4 text-[#A855F7]" /> Get Suggestion JSON
              </Button>

              <Button 
                variant="secondary" 
                onClick={handleExportCSVSingle}
                className="text-xs h-10 border border-border-accent/40 font-mono text-muted hover:text-bright flex gap-1 bg-surface"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#22C55E]" /> Get Suggestion CSV
              </Button>
            </div>

            <div className="border-t border-dashed border-border-accent/25 pt-3 flex items-center justify-between text-[11px]">
              <span className="text-muted font-sans font-semibold">Bulk Action Plan:</span>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportJSONAll}
                  className="text-accent hover:text-bright font-mono text-xs underline cursor-pointer"
                >
                  All Suggestions to JSON
                </button>
                <span className="text-muted select-none">|</span>
                <button 
                  onClick={handleExportCSVAll}
                  className="text-accent hover:text-bright font-mono text-xs underline cursor-pointer"
                >
                  All Suggestions to CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
