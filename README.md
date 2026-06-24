# Pulsr AI - Secure Creator Content Strategy Workspace

Pulsr AI is a production-grade content strategy and planning application designed specifically for creators, writers, and digital strategist networks. By leveraging a local-first zero-trust methodology coupled with defensive backend security layers, it enables users to secure high-signal industry analysis, draft engaging multi-platform campaigns, manage publications through an interactive visual scheduler, and chat securely with an adaptive AI mentor.

---

## 🚀 Vision and Concept

Unlike typical social analytics dashboards that broadcast user keys and inputs to unknown tracking APIs, **Pulsr AI** encapsulates all processes within your secure browser local-storage sandboxes and server-side defensive proxies.

Genome AI empowers you to:
- **Build Core Personas**: Set up your professional background, platform choice, voice style, and content goal parameters.
- **Formulate Campaigns**: Select customized templates covering **Twitter/X**, **LinkedIn**, **Instagram**, **Facebook**, **Threads**, and **TikTok**.
- **Harness High-Signal Signals**: Scan system-verified current industry trends and instantly spin them into customized ready-to-use drafts.
- **Verify with Security Controls**: Stay protected behind robust in-memory rate-limit blocks, defensive payload size-restrictions, and custom Content Security Policy (CSP) headers.

---

## 🎨 Creative Theme & Aesthetic Selection

Genome AI is polished using custom typographic design foundations:
- **Primary Typography**: **Geist** paired with **Inter** (sans-serif) is selected for clean general UI controls and forms to ensure high aesthetic rhythm and legible density.
- **Display Typography**: **Syne** (sans-serif) provides sophisticated weight, geometric appeal, and balanced tracking for high-impact headlines and main segment branding.
- **Technical Readouts**: **Geist Mono** is utilized for metadata outputs, logs, timeline indicators, and status badges.
- **Aesthetic Tone**: Framed within an eye-safe dark slate surface theme with glowing accent shadows (`emerald` and `violet`), maintaining massive negative space and strict alignment.

---

## 🛡️ Critical Security Infrastructure

To address the high-security requirements of enterprise and high-profile creators, Genome AI implements multiple server-side runtime layers:

1. **Payload Flooding Protection**: Express body parsers limit incoming state updates and parameters to a strict limit of `10kb`, completely blocking brute JSON buffer overflow vector attacks.
2. **Defensive Rate-Limiting**: An active in-memory IP tracker limits access to `/api/*` endpoints to `100 requests per minute` per client, gracefully resetting limits or sending HTTP HTTP `429 Too Many Requests`.
3. **Advanced HTTP Security Header Injectors**:
   - `X-Content-Type-Options: nosniff`: Enforces rigorous asset MIME verification.
   - `X-XSS-Protection: 1; mode=block`: Instructs browsers to immediately block script-injection triggers.
   - `Referrer-Policy: strict-origin-when-cross-origin`: Restricts sensitive path leaks under cross-domain references.
   - `Content-Security-Policy`: A robust CSP profile restricting third-party imports to trusted Google font domains and local self-contained scripts.
4. **Data Privacy**: No user cookies or profile definitions are stored on external backends. A total zero-knowledge browser data store is used for state persistency.

---

## 🛠️ Main Workspace Features

- **Welcome Landing & Overview Panel**: Describes overall platform scope, lists compliance parameters, and features an interactive onboarding entry button.
- **Onboarding Setup Wizard**: A seamless multi-step onboarding flow designed to calibrate your personal creator profile, target platforms (including **Facebook**), branding style, and schedule slots.
- **Workspace Dashboard**: Centered widgets displaying a secure greeting, system synchronization indicators, active platform tags, and recent drafts.
- **Predictive Drafting Workspace**: Offers real-time customizable presets tailored specifically to your target niche. Easily configure platforms and format constraints.
- **Trend Intelligence Analyzer**: Displays critical news updates and industry highlights with immediate draft-conversion capabilities.
- **Unified Visual Scheduler (Calendar)**: Manage social slots on a complete interactive calendar grid. Modify states, reschedule items, and download customized local feeds.
- **AI Content Strategist (Secure Chat)**: Direct real-time terminal styled chat interface where you can calibrate voice templates or request thread structures.
- **Settings & Debugging Console**:
  - Profile customization panel to adjust name, платформу, или voice style.
  - Active metric overview charts indicating session counts and performance.
  - Interactive Action Logs to trace live activities.
  - Core recovery wiping utilities.

---

## 📂 Project Architecture

```bash
├── server.ts                  # Secure Express server with rate-limiting, CSP headers, and API proxy routing
├── src/
│   ├── App.tsx                # Context controller handling active screens, onboarding, and portal rendering
│   ├── main.tsx               # Main DOM entrypoint
│   ├── index.css              # Custom TailwindCSS configurations and brand typography loaders
│   ├── types/
│   │   └── index.ts           # Unified TypeScript definitions (UserProfile, ContentDraft, activity logs)
│   ├── store/
│   │   ├── profileStore.ts    # Secure Zustand local persistence hook for creator branding
│   │   ├── contentStore.ts    # Secure Zustand local persistence hook for draft campaigns
│   │   ├── calendarStore.ts   # Secure Zustand calendar scheduler actions
│   │   └── analyticsStore.ts  # Secure Zustand activity log trackers
│   └── components/
│       ├── ui/                # Highly reusable core visual controls (Buttons, Badges, Modals)
│       ├── layout/            # Navigation structures (Sidebar, MobileNav, TopBar)
│       └── features/          # Deep workspace modules (WelcomeLandingView, OnboardingView, DashboardView, SuggestView, TrendsView, CalendarView, ChatView, SettingsView)
```

---

## 🏃‍♂️ Setup & Local Execution

### Prerequisites
- Node.js (v18 or above recommended)
- npm package manager

### Steps
1. Install project dependencies:
   ```bash
   npm install
   ```
2. Initiate development server:
   ```bash
   npm run dev
   ```
   *The Express controller will spin up and listen on port `3000`*.

3. Build production bundle:
   ```bash
   npm run build
   ```

4. Launch production server:
   ```bash
   npm run start
   ```

---

## 📜 Standard Compliance
Genome AI conforms to zero-telemetry display mandates: no distracting pseudo-technical logging lines, simulated infrastructure indicators, or server ping labels are present in any viewport. All layouts remain extremely clean, polished, and purposeful.
