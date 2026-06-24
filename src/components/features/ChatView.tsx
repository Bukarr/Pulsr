import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, MessageSquare, Trash2, HelpCircle } from 'lucide-react';
import { useProfileStore } from '../../store/profileStore';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { ChatMessage } from '../../types';
import { ChatBubble, TypingIndicator } from './ChatBubble';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { pulsrFetch } from '../../lib/utils';
import toast from 'react-hot-toast';

export function ChatView() {
  const { profile } = useProfileStore();
  const { trackEvent } = useAnalyticsStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, waitingForResponse]);

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Load chat history from localStorage on mounting
  useEffect(() => {
    const historical = localStorage.getItem('pulsr-chat-history');
    if (historical) {
      try {
        setMessages(JSON.parse(historical));
      } catch (e) {
        console.error('Failed to parse historical chat:', e);
      }
    } else {
      // Add first friendly welcome assistant message tailored to user
      if (profile) {
        setMessages([
          {
            role: 'model',
            content: `Hello! I am Pulsr AI, your dedicated content strategist. I understand you are focused on **${profile.niche}** on **${profile.primaryPlatform}**, seeking to *${profile.postingGoals.join(', ').toLowerCase()}*.\n\nAsk me to brainstorm hooks, rewrite posts, outline threads, or draft caption reels. What are we planning today?`,
          },
        ]);
      }
    }
  }, [profile]);

  // Sync to local storage
  const syncChatState = (history: ChatMessage[]) => {
    setMessages(history);
    localStorage.setItem('pulsr-chat-history', JSON.stringify(history));
  };

  // Clear Chat history
  const handleClearHistory = () => {
    if (profile) {
      const resetList: ChatMessage[] = [
        {
          role: 'model',
          content: `Hello! Conversational memory cleared. Let's draft something fresh for your **${profile.niche}** audience today!`,
        },
      ];
      syncChatState(resetList);
      setIsConfirmingClear(false);
      toast.success('Chat history cleared!');
    }
  };

  // 1. Core Streaming Submissions API
  const handleSendMessage = async (textToSend?: string) => {
    const chatText = (textToSend || inputText).trim();
    if (!chatText) return;

    if (!profile) {
      toast.error('Onboarding metrics missing.');
      return;
    }

    // Capture and set User message node
    const userMsg: ChatMessage = { role: 'user', content: chatText };
    const updatedHistory = [...messages, userMsg];
    trackEvent('chat_usage', `Asked strategist AI: "${chatText.slice(0, 70)}${chatText.length > 70 ? '...' : ''}"`, { textLength: chatText.length });
    syncChatState(updatedHistory);
    setInputText('');
    setWaitingForResponse(true);
    setStreamingContent('');

    try {
      const response = await pulsrFetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          messages: updatedHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Network issue or stream rejected by server');
      }

      // Stream Reader consumption loop with ultra-responsive queue-based rendering!
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      
      if (!reader) {
        throw new Error('Response body stream reader not accessible.');
      }

      setWaitingForResponse(false); // Switch typing indicator to streaming cursor!
      let accumulatedOutput = '';
      let renderedOutput = '';
      let renderQueue: string[] = [];
      let isRendering = false;

      // High-performance scheduler to drain the stream characters fluidly
      const processQueue = () => {
        if (renderQueue.length === 0) {
          isRendering = false;
          return;
        }
        isRendering = true;
        // Dynamically scale flow speed. If backlog is large (e.g. from a slow network burst), speed up to empty fast.
        const drainCount = Math.max(1, Math.floor(renderQueue.length / 4));
        const nextChars = renderQueue.splice(0, drainCount).join('');
        renderedOutput += nextChars;
        setStreamingContent(renderedOutput);
        
        // Fluid scheduling using standard requestAnimationFrame
        requestAnimationFrame(processQueue);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decodedChunk = decoder.decode(value, { stream: true });
        accumulatedOutput += decodedChunk;
        
        // Push raw characters into rendering pipeline
        renderQueue.push(...decodedChunk.split(''));
        if (!isRendering) {
          processQueue();
        }
      }

      // Final flushing to guarantee everything is printed
      if (renderQueue.length > 0) {
        renderedOutput += renderQueue.join('');
        setStreamingContent(renderedOutput);
      }

      // Once finished completely, merge active stream to history state
      const modelFinishedMsg: ChatMessage = {
        role: 'model',
        content: accumulatedOutput || 'Pulsr was unable to summarize a response.',
      };
      
      syncChatState([...updatedHistory, modelFinishedMsg]);
      setStreamingContent('');
    } catch (err: any) {
      console.error('Chat Streaming pipeline failed:', err);
      toast.error('Failed to communicate with AI chat stream. Please retry.');
      
      setWaitingForResponse(false);
      setStreamingContent('');
    }
  };

  // Handle hot chips click
  const handleChipClick = (msgText: string) => {
    handleSendMessage(msgText);
  };

  const quickChips = [
    'Suggest a viral post concept',
    `Write a witty hook describing ${profile?.niche || 'my niche'}`,
    `Optimize my hook for ${profile?.primaryPlatform || 'Twitter'}`,
    'Give me 3 content theme ideas',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-175px)] md:h-[calc(100vh-120px)] select-text">
      {/* 1. Header controls */}
      <h2 className="hidden" id="chatHeading">Conversational Strategist Arena</h2>
      <div className="flex justify-between items-center bg-bg/25 border border-border-accent/40 rounded-2xl p-3 mb-4 select-none flex-shrink-0 animate-fade-in">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4.5 w-4.5 text-accent" />
          <span className="text-xs uppercase font-mono font-bold tracking-wider text-muted">
            Direct Board Chat Session
          </span>
        </div>
        
        {messages.length > 1 && (
          <div className="flex items-center gap-1.5 animate-fade-in">
            {isConfirmingClear ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingClear(false)}
                  className="h-8 py-1.5 px-2 px-2.5 text-xs font-mono text-muted hover:text-text-main bg-surface/30 hover:bg-surface"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="h-8 py-1.5 px-2.5 text-xs font-mono text-error border border-error/30 bg-error/15 hover:bg-error/25 flex gap-1"
                >
                  Confirm Purge!
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingClear(true)}
                className="h-8 py-1.5 px-2.5 text-xs font-mono text-muted hover:text-error flex gap-1 bg-surface/40 hover:bg-surface"
              >
                <Trash2 className="h-3.5 w-3.5" /> Purge Chat
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 2. Messages lists container */}
      <div className="flex-1 overflow-y-auto px-1 md:px-4 space-y-4 pb-4 select-text scrollbar-thin min-h-0">
        {messages.map((msg, idx) => (
          <ChatBubble key={idx} message={msg} />
        ))}

        {/* Dynamic Wait Typing state */}
        {waitingForResponse && <TypingIndicator />}

        {/* Dynamic active stream rendering */}
        {streamingContent && (
          <ChatBubble message={{ role: 'model', content: streamingContent }} isStreaming={true} />
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 3. Quick Chips & Input Footer cockpit */}
      <div className="pt-3 pb-1 select-none space-y-3 flex-shrink-0">
        {/* Horizontally scrollable short prompt chips */}
        {messages.length <= 1 && !waitingForResponse && !streamingContent && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none scroll-smooth">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border-accent bg-surface hover:border-accent text-xs font-sans text-muted hover:text-bright transition-all active:scale-95"
              >
                <Sparkles className="h-3 w-3 text-accent" /> {chip}
              </button>
            ))}
          </div>
        )}

        {/* Message Input line */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message about branding, outline request, etc..."
            className="flex-1 focus:ring-accent/20 min-h-[44px]"
            disabled={waitingForResponse || !!streamingContent}
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={!inputText.trim() || waitingForResponse || !!streamingContent}
            className="h-11 w-11 p-2 bg-accent hover:bg-neon text-white flex items-center justify-center font-bold"
          >
            <Send className="h-4.5 w-4.5 text-white font-bold" />
          </Button>
        </form>
      </div>
    </div>
  );
}
export default ChatView;
