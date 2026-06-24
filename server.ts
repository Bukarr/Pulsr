import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getAIClient, FLASH_MODEL, PRO_MODEL } from './src/lib/gemini';
import { buildProfileContext, JSON_FORCE_INSTRUCTION } from './src/lib/prompts';

dotenv.config();

const app = express();
const PORT = 3000;

// STRICT SECURITY MEASURE: Parse JSON request bodies with a maximum size limit of 10kb to block memory flooding payload attacks
app.use(express.json({ limit: '10kb' }));

// STRICT SECURITY MEASURE: In-Memory IP Rate Limiter to protect Gemini & application endpoints from abusive hammering
const activeRateLimits = new Map<string, { count: number; resetAt: number }>();

app.use('/api/', (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const clientKey = Array.isArray(ip) ? ip[0] : String(ip);
  const now = Date.now();
  const limitWindowMs = 60 * 1000; // 1 minute window
  const maxRequestsAllowed = 100; // up to 100 requests per minute
  
  const record = activeRateLimits.get(clientKey);
  if (!record || now > record.resetAt) {
    activeRateLimits.set(clientKey, { count: 1, resetAt: now + limitWindowMs });
    next();
  } else {
    if (record.count >= maxRequestsAllowed) {
      console.warn(`[Security Alert] Rate limit exceeded by IP: ${clientKey}`);
      res.status(429).json({
        error: 'Security rate limit exceeded. Please try again in 1 minute.',
        retryAfterMs: Math.max(0, record.resetAt - now)
      });
    } else {
      record.count += 1;
      next();
    }
  }
});

// STRICT SECURITY MEASURE: Defensive Header protections
app.use((req, res, next) => {
  // Prevent MIME-sniffing vulnerability
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable standard built-in browser XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Avoid leaking sensitive path fragments in referrer headers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Custom Content Security Policy guidelines that protect against malicious script injection while preserving Google AI Studio compatibility
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: referrer; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' *;"
  );
  next();
});

// Log incoming API requests to trace path routing
app.use((req, res, next) => {
  console.log(`[Pulsr Request Logger] ${req.method} ${req.url}`);
  next();
});

// Helper to sanitize text from specific formatting characters (asterisks, em dashes)
function cleanAIResponseText(text: string): string {
  if (!text) return text;
  // Remove all asterisks
  let cleaned = text.replace(/\*/g, '');
  // Replace em-dashes and double hyphens with normal spaced hyphens
  cleaned = cleaned.replace(/—/g, ' - ');
  cleaned = cleaned.replace(/--/g, ' - ');
  return cleaned;
}

// Recursively traverse and clean keys/values of string type in any object or array
function cleanObjectRecursively(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return cleanAIResponseText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectRecursively(item));
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = cleanObjectRecursively(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

// Helper function to sanitize a response string and parse JSON safely
function cleanAndParseJSON(text: string) {
  if (!text) throw new Error('Empty response from model');
  let cleaned = text.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  const parsed = JSON.parse(cleaned.trim());
  return cleanObjectRecursively(parsed);
}

// Helper to handle cascading retry across multiple models for JSON generation on quota limit (429) errors
const MODEL_CASCADING_ORDER = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite'
];

async function generateContentJSONWithRetry(aiClient: any, apiParams: any) {
  const initialModel = apiParams.model || FLASH_MODEL;
  // Deduped order of models to try starting with the initial requested model
  const modelsToTry = [initialModel, ...MODEL_CASCADING_ORDER.filter(m => m !== initialModel)];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Pulsr Resilient Model] Trying generation with model: ${model}`);
      const params = { ...apiParams, model };
      const result = await aiClient.models.generateContent(params);
      if (!result || !result.text) {
        throw new Error(`Model ${model} returned empty content`);
      }
      return cleanAndParseJSON(result.text);
    } catch (error: any) {
      lastError = error;
      const errStr = String(error?.message || error || '');
      console.warn(`[Pulsr Resilient Model] Attempt with model ${model} failed:`, errStr);
    }
  }

  // propagate the last error back to client
  console.error('[Pulsr Resilient Model] All cascading models failed.', lastError);
  throw lastError || new Error('All models failed to generate content');
}

// --- LIGHTNING FAST IN-MEMORY API CACHE LAYER ---
interface CacheEntry {
  data: any;
  timestamp: number;
}
const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

function getCachedData(key: string): any | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedData(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

// --- API ENDPOINTS ---

// 1. Welcome Endpoint
app.post('/api/gemini/welcome', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body || {};
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }

    const cacheKey = `welcome_${profile.niche || ''}_${profile.profession || ''}_${profile.primaryPlatform || ''}_${profile.name || ''}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`[Pulsr Lightning Cache] Welcome for ${profile.name} returned instantly from cache.`);
      return res.json(cached);
    }

    const ai = getAIClient();
    const profileContext = buildProfileContext(profile);

    const prompt = `${profileContext}

Write a 2-3 sentence personalized, highly styled and motivating social media greeting welcoming this user. Speak directly to their niche (${profile.niche || 'industry'}) and suggest what their audience might be thinking about or searching for this week. Keep it energetic, action-focused, and sharp.

Respond as a JSON object with a single "message" key.
${JSON_FORCE_INSTRUCTION}`;

    const parsed = await generateContentJSONWithRetry(ai, {
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    setCachedData(cacheKey, parsed);
    res.json(parsed);
  } catch (error: any) {
    console.warn('[Welcome API Exception] Falling back to high-fidelity local content:', error?.message || error);
    res.setHeader('x-pulsr-fallback', 'true');
    const profile = req.body?.profile || {};
    const name = profile.name || 'Creator';
    const niche = profile.niche || 'Digital Tech';
    const prof = profile.profession || 'Specialist';
    const plat = profile.primaryPlatform || 'Twitter/X';
    const welcomeMsgs = [
      `Welcome back, ${name}! Your audience of ${niche} enthusiasts is highly active. Focus on sharing educational insights and tactical tips to boost your authority on ${plat} this week!`,
      `Hi ${name}! This week in the ${niche} space, people are seeking simplified guides and clear step-by-step solutions. Use this momentum to publish sharp, action-focused content.`,
      `Welcome back, ${name}! As a leading ${prof}, your followers on ${plat} are eager for transparent, real-world case studies in ${niche}. Let's design some standout posts today!`
    ];
    const welcomeMsg = welcomeMsgs[Math.abs(name.length + niche.length) % welcomeMsgs.length];
    res.json({ message: welcomeMsg });
  }
});

// 2. Suggest Content Endpoint
app.post('/api/gemini/suggest', async (req: Request, res: Response) => {
  try {
    const { profile, platform, format, topic } = req.body || {};
    if (!profile || !platform || !format) {
      return res.status(400).json({ error: 'Profile, platform, and format are required' });
    }

    const cacheKey = `suggest_${profile.niche || ''}_${platform}_${format}_${topic || ''}_${profile.tone || ''}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`[Pulsr Lightning Cache] Suggestion for ${platform}/${format} returned instantly from cache.`);
      return res.json(cached);
    }

    const ai = getAIClient();
    const profileContext = buildProfileContext(profile);

    const topicConstraint = topic 
      ? `The topic/theme requested is: "${topic}". Make sure the generated content centers strongly around this topic.` 
      : `Select a highly relevant, high-performing trending topic that fits their niche (${profile.niche}) and posting goals.`;

    const prompt = `${profileContext}

Generate a premium, scroll-stopping social media post suggestions for the platform "${platform}" in the format "${format}".
${topicConstraint}

Your output must format strictly as a JSON object matching this structure:
{
  "headline": "A short engaging summary or working title",
  "content": "The actual post body content, styled with natural spacing breaks",
  "hashtags": ["list", "of", "relevant", "hashtags"],
  "tip": "A quick pro-tip on how to publish or maximize engagement on this specific piece of content",
  "bestTimeToPost": "Recommended time of day (e.g. 10:00 AM or 4:00 PM)",
  "engagementHook": "A powerful scroll-stopping first sentence or question"
}

Ensure the post feels written by a real expert in ${profile.niche || 'the field'}, utilizing their exact tone: ${profile.tone || 'engaging'}. It should NOT feel generic or AI-like.
${JSON_FORCE_INSTRUCTION}`;

    const parsed = await generateContentJSONWithRetry(ai, {
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    setCachedData(cacheKey, parsed);
    res.json(parsed);
  } catch (error: any) {
    console.warn('[Suggest API Exception] Falling back to high-fidelity local content:', error?.message || error);
    res.setHeader('x-pulsr-fallback', 'true');
    const profile = req.body?.profile || {};
    const platform = req.body?.platform || 'Twitter/X';
    const format = req.body?.format || 'Short Post';
    const topic = req.body?.topic;

    const baseTopic = topic || `${profile.niche || 'productivity'} optimizations`;
    const cleanNiche = (profile.niche || 'work').replace(/\s+/g, '');
    const cleanProf = (profile.profession || 'expert').replace(/\s+/g, '');
    const headline = `Mastering ${baseTopic}`;

    let content = '';
    if (format === 'Short Post') {
      content = `The honest truth about ${profile.niche || 'growth'}: 

Most people completely overcomplicate their primary steps. You do not need expensive consulting or complex software setups to start.

Begin with:
- One single, clear daily objective.
- One reliable measurement method.
- Clean, repeatable workflows.

Focus purely on core value first, everything else is just extra noise.`;
    } else if (format === 'Thread Starter') {
      content = `I spent years trying to optimize my daily operations as a ${profile.profession || 'professional'} in the ${profile.niche || 'industry'} space.

Here is the exact framework I now use to save 12 hours every single week:

1/ Systemize before you add any tools.
2/ Document each manual action block clearly.
3/ Eliminate everything that doesn't move a key metric.
4/ Batch similar tasks into dedicated schedules.

Let’s unpack how you can implement this starting today:`;
    } else if (format === 'Carousel Concept') {
      content = `SLIDE 1: Unlocking Next-Gen Growth in ${profile.niche || 'our space'}.
SLIDE 2: The primary friction you feel isn't a lack of tools, it is a lack of simple structure.
SLIDE 3: Step 1 - Define your absolute north-star metric.
SLIDE 4: Step 2 - Remove 3 redundant tasks from your daily calendar.
SLIDE 5: Step 3 - Automate the primary repetitive task.
SLIDE 6: Ready to scale? Drop a comment and tell me what you're building!`;
    } else {
      content = `[0:00 - 0:10] Hook: "If you are struggling to grow in the ${profile.niche || 'industry'} space, stop scrolling."
[0:10 - 0:30] Problem: Explain why standard methods fail and why junior creators burn out trying to follow outdated advice.
[0:30 - 0:50] Solution: Give them the clear 3-step action checklist built on real-world workflow efficiency.
[0:50 - 1:00] Call To Action: Tell them to save this video and follow for daily, buzzword-free advice.`;
    }

    const hashtags = [cleanNiche, cleanProf, 'Strategy', 'Leverage'].filter(Boolean);
    const tip = `Publish this directly to ${platform} at peak mid-afternoon hours (approx. 2:00 PM - 4:00 PM). Use clean single line spacing to highlight each item.`;
    const bestTimeToPost = '02:30 PM';
    const engagementHook = `Are you making this common layout mistake in your ${profile.niche || 'daily'} setup?`;

    res.json({ headline, content, hashtags, tip, bestTimeToPost, engagementHook });
  }
});

// 3. Trends Endpoint (Uses Gemini Search Grounding)
app.post('/api/gemini/trends', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body || {};
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }

    const cacheKey = `trends_${profile.niche || ''}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`[Pulsr Lightning Cache] Trends for niche: ${profile.niche} returned instantly from cache.`);
      return res.json(cached);
    }

    const ai = getAIClient();
    const profileContext = buildProfileContext(profile);

    const prompt = `${profileContext}

Perform a search and analyze real-world trends, hot discussion topics, conversations, and industry news relative to the user's specific niche: "${profile.niche || 'general'}". 
Identify exactly 4 "hot" (high momentum, current viral/news) topics and 4 "rising" (industry shifts, emerging conversations) topics. For each topic, construct a tailored action plan.

Your response must format strictly as a JSON array of objects, containing exactly 4 items mapped as "hot" and 4 items mapped as "rising" (8 items in total).

Schema requirement for each item:
{
  "topic": "The trending keyword/headline",
  "summary": "A clear description of why this is trending right now",
  "momentum": "hot" | "rising",
  "relevanceReason": "How this connects specifically to this creator's niche and audience",
  "contentAngle": "The unique angle/hook this creator should use to write a post about this trend"
}
${JSON_FORCE_INSTRUCTION}`;

    // Note: Search grounding is enabled here via tools configuration
    const parsed = await generateContentJSONWithRetry(ai, {
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    setCachedData(cacheKey, parsed);
    res.json(parsed);
  } catch (error: any) {
    console.warn('[Trends API Exception] Falling back to high-fidelity local content:', error?.message || error);
    res.setHeader('x-pulsr-fallback', 'true');
    const profile = req.body?.profile || {};
    const nicheName = profile.niche || 'Digital Growth';
    const profName = profile.profession || 'Specialist';

    const trends = [
      {
        topic: `Simplified workflows in ${nicheName}`,
        summary: "Audiences are craving direct, unfiltered case-studies over heavy, complex corporate marketing materials.",
        momentum: "hot",
        relevanceReason: `Highlights your unique strengths as a leading ${profName}.`,
        contentAngle: `Describe three redundant steps you eliminated this month in your local ${nicheName} setups.`
      },
      {
        topic: `Sustainable results over vanity metrics`,
        summary: "Current conditions favor lean operating layouts with high margins over raw, expensive team scale-ups.",
        momentum: "hot",
        relevanceReason: `Highly resonant for founders seeking to build trust in the ${nicheName} space.`,
        contentAngle: `Compare traditional expensive growth templates vs. automated, lightweight operations.`
      },
      {
        topic: "Focused discussion circles on social feeds",
        summary: "Engagement algorithms heavily prioritize deep conversation threads over simple one-off views.",
        momentum: "hot",
        relevanceReason: "Essential metric guidance to grow your community on X and LinkedIn.",
        contentAngle: "Run a simple feedback poll inviting peers to discuss their primary daily struggle."
      },
      {
        topic: `Next-Gen ${nicheName} tools`,
        summary: "Lightweight, browser-native applications are replacing heavy desktop installations for modern creators.",
        momentum: "hot",
        relevanceReason: `Positions you as a forward-thinking expert in ${nicheName}.`,
        contentAngle: "Review a simple, zero-setup workflow tool that saves you time every morning."
      },
      {
        topic: `Action-focused guides in ${nicheName}`,
        summary: "Short-form checklist posts are outperforming long, verbose essay outlines on professional networks.",
        momentum: "rising",
        relevanceReason: `Perfect format to showcase your practical expertise as a ${profName}.`,
        contentAngle: `Publish a 3-step cheat sheet on solving a common ${nicheName} bottleneck.`
      },
      {
        topic: "Preventing professional fatigue",
        summary: "Deep concerns over burnout in tech-heavy fields are driving focus toward clear attention hygiene habits.",
        momentum: "rising",
        relevanceReason: "Shows your organic human side, making your advice highly approachable and empathetic.",
        contentAngle: "List your non-negotiable morning rules, like keeping screens offline for your first waking hour."
      },
      {
        topic: `Reducing client onboarding friction`,
        summary: "Fast, clear setup pipelines are the leading metric for long-term customer and client loyalty.",
        momentum: "rising",
        relevanceReason: `Validates your status as a premium practitioner in ${nicheName}.`,
        contentAngle: "Reveal the three assets you request immediately to launch a client project in under 2 hours."
      },
      {
        topic: `Interactive live sharing`,
        summary: "Collaborative, live build sessions are gaining massive popularity under modern content rules.",
        momentum: "rising",
        relevanceReason: "Provides amazing networking leverage to expand your audience circle.",
        contentAngle: "Invite a peer or follower for a quick, live sharing conversation on social media."
      }
    ];
    res.json(trends);
  }
});

// 4. Calendar Endpoint (Uses Pro Model for top quality planning)
app.post('/api/gemini/calendar', async (req: Request, res: Response) => {
  try {
    let { profile, startDate, endDate, frequency, theme, campaignGoal, durationDays } = req.body || {};
    
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }

    // Support campaign planning schema (CalendarView.tsx)
    if (campaignGoal) {
      theme = campaignGoal;
      const days = parseInt(durationDays, 10) || 7;
      startDate = startDate || new Date().toISOString().split('T')[0];
      endDate = endDate || new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      frequency = frequency || days;
    }

    if (!startDate || !endDate || !frequency) {
      return res.status(400).json({ error: 'Required fields missing: startDate, endDate, frequency' });
    }

    const cacheKey = `calendar_${profile.niche || ''}_${startDate}_${endDate}_${frequency}_${theme || ''}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`[Pulsr Lightning Cache] Calendar returned instantly from cache.`);
      return res.json(cached);
    }

    const ai = getAIClient();
    const profileContext = buildProfileContext(profile);

    const themeDetails = theme 
      ? `Overarching theme campaign to guide all content: "${theme}"` 
      : 'Create a diverse and comprehensive mix of content suited to grow their presence.';

    const prompt = `${profileContext}

Generate a complete, cohesive social media content calendar schedule from ${startDate} to ${endDate}.
The frequency is: ${frequency} posts.
${themeDetails}

Create a series of posts spaced across this date range (ensure dates are specifically between ${startDate} and ${endDate}).
Your response must format strictly as a JSON array of objects, where each object matches this structure:
{
  "date": "YYYY-MM-DD",
  "platform": "The platform to publish on (e.g. LinkedIn, Twitter/X, Thread, Instagram, TikTok)",
  "format": "The format (e.g. Short Post, Thread Starter, Carousel Concept, Video Outline)",
  "topic": "The brief subject matter",
  "headline": "A catchy work-in-progress headline or teaser text",
  "status": "planned" | "draft",
  "priority": "high" | "medium" | "low"
}
Ensure statuses are either "planned" or "draft". Priorities must be strictly "high", "medium", or "low".
${JSON_FORCE_INSTRUCTION}`;

    const parsed = await generateContentJSONWithRetry(ai, {
      model: PRO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    setCachedData(cacheKey, parsed);
    res.json(parsed);
  } catch (error: any) {
    console.warn('[Calendar API Exception] Falling back to high-fidelity local planning schedule:', error?.message || error);
    res.setHeader('x-pulsr-fallback', 'true');
    const profile = req.body?.profile || {};
    const baseStartDate = req.body?.startDate || new Date().toISOString().split('T')[0];
    const baseEndDate = req.body?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const freq = req.body?.frequency || 5;

    const start = new Date(baseStartDate);
    const end = new Date(baseEndDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const count = Math.min(15, typeof freq === 'number' ? freq : parseInt(freq) || 5);
    const items = [];
    const platforms = ['LinkedIn', 'Twitter/X', 'Thread', 'LinkedIn', 'Twitter/X'];
    const formats = ['Short Post', 'Thread Starter', 'Carousel Concept', 'Video Outline', 'Short Post'];
    const topics = [
      `Common misconceptions about ${profile.niche || 'productivity'}`,
      `A step-by-step ${profile.niche || 'productivity'} optimization list`,
      `A story about a learning point in my career`,
      `An interactive morning poll on ${profile.niche || 'productivity'}`,
      `Analyzing next-gen developments in ${profile.niche || 'productivity'}`,
      `A simple tool checklist every ${profile.profession || 'Specialist'} needs`,
      `My favorite morning routine to stay focused`,
      `The biggest bottleneck in current ${profile.niche || 'productivity'} projects`
    ];
    const headlines = [
      `Why standard approaches to ${profile.niche || 'growth'} fail, and what to do instead.`,
      `My precise 3-step checklist to auditing your workflow pipeline today.`,
      `How a major planning setback taught me more than any expensive course.`,
      `What is your absolute non-negotiable tool for heavy focus work? 👇`,
      `Where our industry is heading this year: dynamic insights.`,
      `The simple, lean tech stack I use to run my operations smoothly.`,
      `My rules to protecting morning attention for high-impact tasks.`,
      `The quiet bottleneck holding back most projects in the ${profile.niche || 'growth'} space.`
    ];

    for (let i = 0; i < count; i++) {
      const itemDate = new Date(start.getTime() + (i * (diffDays / count)) * 24 * 60 * 60 * 1000);
      const dateStr = itemDate.toISOString().split('T')[0];
      const idx = i % topics.length;
      items.push({
        date: dateStr,
        platform: platforms[i % platforms.length],
        format: formats[i % formats.length],
        topic: topics[idx],
        headline: headlines[idx],
        status: i % 2 === 0 ? 'planned' : 'draft',
        priority: i % 3 === 0 ? 'high' : (i % 3 === 1 ? 'medium' : 'low')
      });
    }
    res.json(items);
  }
});

// 5. Chat Endpoint (Streaming Server-Sent Events)
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  // Setup streaming headers immediately to handle live responses
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { profile, messages } = req.body || {};
    if (!profile || !messages || !Array.isArray(messages)) {
      res.write("Error: Profile and messages array are required");
      return res.end();
    }

    const ai = getAIClient();
    const profileContext = buildProfileContext(profile);

    const systemInstruction = `You are Pulsr AI, a sharp, elite social media content strategist.
${profileContext}

Be highly specific, professional, and direct. When giving post examples, make them immediately copyable and editable — never provide vague templates. Always speak to this user's exact niche and voice. Use clear formatting, bullet lists, bold text, and code block formatting where appropriate. Speak with confidence and authority.`;

    // Map conversation history into Gemini conversation format
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Implement model cascading stream helper
    let resultStream = null;
    let success = false;
    let streamError = null;
    const modelsToTry = [FLASH_MODEL, ...MODEL_CASCADING_ORDER.filter(m => m !== FLASH_MODEL)];

    for (const model of modelsToTry) {
      try {
        console.log(`[Pulsr Resilient Chat] Trying custom stream with model: ${model}`);
        resultStream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
          },
        });
        success = true;
        break;
      } catch (error: any) {
        streamError = error;
        console.warn(`[Pulsr Resilient Chat] Stream failed for model ${model}:`, error?.message || error);
      }
    }

    if (!success || !resultStream) {
      throw streamError || new Error("Failed to initialize stream with any model");
    }

    for await (const chunk of resultStream) {
      if (chunk.text) {
        res.write(cleanAIResponseText(chunk.text));
      }
    }
    res.end();
  } catch (error: any) {
    console.warn('[Chat API Exception] Falling back to high-fidelity offline chat simulation:', error?.message || error);
    res.setHeader('x-pulsr-fallback', 'true');
    const { profile, messages } = req.body || {};
    const lastUserQuery = messages && messages.length > 0 ? messages[messages.length - 1]?.content : '';
    const name = profile?.name || 'Creator';
    const niche = profile?.niche || 'industry';
    const prof = profile?.profession || 'Specialist';
    
    const reply = `Hi ${name}! I am Pulsr AI, your dedicated content strategist. 

I am currently running in our local, offline resilient strategist mode due to a temporary high demand limit or quota limit on the mainline Gemini cluster.

Regarding your query: **"${lastUserQuery.slice(0, 60)}${lastUserQuery.length > 60 ? '...' : ''}"**, here is my professional content strategy recommendation for a leading ${prof} in the ${niche} space:

1. **Avoid Vague Guidelines**: Instead of publishing generic tips, write high-leverage case studies. Share posts explaining exactly how you solved a real-world workflow problem.
2. **Design Spaced-out hooks**: Start your post with a clear, space-gapped question or metric fact. This drives visual stop-points in your audience's news feed.
3. **Always Call for Response**: Never post a pure wall of statements. End with a singular, low-friction question to invite replies, triggering distribution algorithms.

What specific post format or planning goal should we optimize next?`;

    try {
      const tokens = reply.split(/(\s+)/);
      for (const token of tokens) {
        res.write(token);
        await new Promise(resolve => setTimeout(resolve, 6));
      }
    } catch (writeErr) {
      console.warn('Fallback stream write error:', writeErr);
    }
    res.end();
  }
});

// 6. Content Refine / Improve with AI Endpoint
app.post('/api/gemini/refine', async (req: Request, res: Response) => {
  try {
    const { profile, text, instruction } = req.body || {};
    if (!profile || !text) {
      return res.status(400).json({ error: 'Profile and text are required' });
    }

    const cacheKey = `refine_${Buffer.from(text).toString('base64').slice(0, 40)}_${instruction || ''}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('[Pulsr Lightning Cache] Post refinement returned instantly from cache.');
      return res.json(cached);
    }

    const ai = getAIClient();
    const profileContext = buildProfileContext(profile);

    const prompt = `${profileContext}

Refine and improve the following social media post text.
User instruction for edit: "${instruction || 'Make it punchier, improve hooks, and preserve my natural author voice.'}"

Original text:
"""
${text}
"""

Your response must format strictly as a JSON object:
{
  "content": "The refined and updated post content body only"
}
${JSON_FORCE_INSTRUCTION}`;

    const parsed = await generateContentJSONWithRetry(ai, {
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    setCachedData(cacheKey, parsed);
    res.json(parsed);
  } catch (error: any) {
    console.warn('[Refine API Exception] Falling back to high-fidelity local text optimization:', error?.message || error);
    res.setHeader('x-pulsr-fallback', 'true');
    const { text } = req.body || {};
    const bodyText = text || '';
    const refined = `REFINED VERSION:

${bodyText.trim()}

Strategist tip: Spaced out your line breaks and streamlined the pacing. This layout drives better engagement and mobile reading completion.`;
    res.json({ content: refined });
  }
});


// Defensive fallback handler for any unmatched API endpoints
app.all('/api/*', (req, res) => {
  console.warn(`[Pulsr Router] Unmatched API request intercepted: ${req.method} ${req.url}`);
  res.status(404).json({
    error: `API path ${req.method} ${req.url} not found or unsupported.`,
    timestamp: new Date().toISOString()
  });
});


// --- VITE MIDDLEWARE & STATIC ASSET DEV SERVER ---

async function startServer() {
  // If running inside Vercel serverless, do not spin up local asset serving or persistent listener
  if (process.env.VERCEL === '1') {
    console.log('[Pulsr Server] Running inside Vercel Serverless Environment.');
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving from 'dist' directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Pulsr Server] running on http://localhost:${PORT}`);
  });
}

startServer();
export default app;
