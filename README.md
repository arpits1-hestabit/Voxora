# Voxora: Voice Agent Platform

**Build, manage, and analyze voice AI agents at scale.**

Voxora is a complete platform for creating and managing conversational voice agents. Use pre-built templates, customize behavior, and gain instant insights from call analytics.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org)

---

## Features

- **Voice Conversations**: Real-time voice interactions with AI agents using LiveKit and ElevenLabs
- **Agent Templates**: 20+ pre-built templates for common use cases (Support, Sales, HR, etc.)
- **Call Analytics**: Automatic sentiment analysis, quality scoring, topic extraction
- **Transcripts**: Full conversation transcripts with automatic normalization
- **Call History**: searchable, filterable call database with detailed metadata
- **Multi-tenant**: Built-in Row-Level Security for secure multi-user support
- **Real-time**: WebSocket streaming for low-latency voice processing
- **Export**: Download call data and analytics as JSON/CSV
- **Modern UI**: Dark glassmorphic design with responsive layout
- **Production-ready**: Deployed on Vercel with Supabase backend

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Voxora Platform (Next.js 16.1.6)               │
│                                                         │
│  Pages:              Components:         API Routes:    │
│  • /agents          • AgentList         • /agents       │
│  • /calls           • CallDetail        • /calls        │
│  • /analytics       • VoicePlayer       • /analyze      │
│  • /templates       • ExportButton      • /voice        │
└─────────────────────────────────────┬───────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────┐
         ↓                            ↓                        ↓
    ┌─────────────┐          ┌──────────────┐         ┌─────────────┐
    │  Supabase   │          │  ElevenLabs  │         │ Groq LLM    │
    │             │          │              │         │             │
    │ PostgreSQL  │          │ Voice Gen    │         │ Sentiment   │
    │ + RLS       │          │ (6 voices)   │         │ Analysis    │
    │ + Auth      │          │              │         │ (8B model)  │
    └─────────────┘          └──────────────┘         └─────────────┘

    ┌──────────────────┐     ┌────────────────┐
    │   LiveKit        │     │    Vercel      │
    │                  │     │                │
    │ Real-time Voice  │     │ Hosting + CI/CD│
    │ (WebRTC)         │     │ + Analytics    │
    └──────────────────┘     └────────────────┘
```

---

## Tech Stack

| Layer               | Technology                  | Purpose                             |
| ------------------- | --------------------------- | ----------------------------------- |
| **Frontend**        | Next.js 16.1.6 (Turbopack)  | Full-stack SSR with TypeScript      |
| **Styling**         | Tailwind CSS                | Responsive dark theme               |
| **Database**        | Supabase (PostgreSQL 15+)   | Multi-tenant with RLS               |
| **Authentication**  | Supabase Auth               | Email/password + sessions           |
| **Real-time Voice** | LiveKit                     | WebRTC streaming, sub-100ms latency |
| **Voice Synthesis** | ElevenLabs API              | 6 natural-sounding voices           |
| **LLM**             | Groq (llama-3.1-8b-instant) | Fast inference, free tier available |
| **Hosting**         | Vercel                      | Edge functions, CI/CD, analytics    |

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- API keys: Groq, ElevenLabs, LiveKit

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/voice-agent-platform.git
cd voice-agent-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Configure your API keys:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# ELEVENLABS_API_KEY
# GROQ_API_KEY
# LIVEKIT_URL
# LIVEKIT_API_KEY
# LIVEKIT_API_SECRET
```

### Development

```bash
# Start dev server
npm run dev

# Open http://localhost:3000
```

### Production Deployment

```bash
# Deploy to Vercel
vercel deploy --prod

# Or use Git integration
git push origin main
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for full production setup guide.

---

## Documentation

Quick reference to all documentation:

| Document                                                     | Purpose                       | For                     |
| ------------------------------------------------------------ | ----------------------------- | ----------------------- |
| **[GETTING_STARTED.md](./GETTING_STARTED.md)**               | Quick start + key concepts    | New developers          |
| **[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)**     | System overview + data flow   | Want to understand flow |
| **[docs/VOICE_CALLS.md](./docs/VOICE_CALLS.md)**             | Voice system architecture     | Voice features          |
| **[docs/ANALYTICS.md](./docs/ANALYTICS.md)**                 | Analysis pipeline + sentiment | Analytics features      |
| **[docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md)**       | Auth flow + RLS policies      | Auth/security           |
| **[docs/TEMPLATES_LIBRARY.md](./docs/TEMPLATES_LIBRARY.md)** | Templates system              | Templates feature       |
| **[docs/API_ROUTES.md](./docs/API_ROUTES.md)**               | Complete API reference        | Building API clients    |
| **[docs/DATABASE.md](./docs/DATABASE.md)**                   | Schema + data model           | Database developers     |
| **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**               | Production setup guide        | Deployment              |

---

## Project Structure

```
voice-agent-platform/
│
├── src/
│   ├── app/                          # Next.js app directory
│   │   ├── (auth)/                  # Auth pages (login/signup)
│   │   ├── agents/                  # Agent management
│   │   │   ├── page.tsx            # Agent list
│   │   │   ├── new/                # Create agent
│   │   │   ├── [id]/               # Agent detail
│   │   │   └── [id]/call/          # Live call interface
│   │   │
│   │   ├── calls/                   # Call history
│   │   │   ├── page.tsx            # Call list
│   │   │   └── [id]/               # Call detail with transcript
│   │   │
│   │   ├── analytics/               # Dashboard
│   │   │   └── page.tsx            # Metrics + charts
│   │   │
│   │   └── api/                     # API routes
│   │       ├── call/analyze/        # Call analysis
│   │       ├── voice/generate/      # Voice synthesis
│   │       └── [other routes]
│   │
│   ├── components/                  # React components
│   │   ├── call/                   # Call UI
│   │   ├── agent/                  # Agent UI
│   │   └── ui/                     # Reusable components
│   │
│   ├── utils/                       # Utilities
│   │   ├── supabase/               # DB clients
│   │   └── hooks/                  # Custom hooks
│   │
│   └── actions/                     # Server actions
│
├── docs/                            # Detailed documentation
│   ├── VOICE_CALLS.md
│   ├── ANALYTICS.md
│   ├── AUTHENTICATION.md
│   ├── TEMPLATES_LIBRARY.md
│   ├── API_ROUTES.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
│
├── supabase/
│   ├── migrations/                  # SQL migrations
│   └── seed.sql                    # Sample data
│
├── public/                          # Static assets
├── vercel.json                      # Vercel config
├── next.config.js                  # Next.js config
├── tailwind.config.js              # Tailwind config
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies
```

---

## Key Concepts

### Agents

AI assistants configured for voice conversations. Each agent has:

- Name + description
- System instructions (behavior)
- Voice (6 ElevenLabs options)
- LLM model (llama-3.1-8b-instant)
- Temperature (creativity level)

### Templates

Pre-built agent configurations for quick setup:

- Customer Service (Support, Technical, Billing)
- Sales (Demo, Pricing, Feature Inquiry)
- HR (Recruitment, Onboarding, Benefits)
- Other (FAQ, Appointments, Feedback)

### Calls

Recorded voice conversations between user and agent:

- Raw transcript
- Normalized transcript
- Call duration
- Status (active, completed, abandoned)
- Auto-generated analytics

### Analytics

Automatic insights extracted from calls:

- **Sentiment**: positive, neutral, negative
- **Quality Score**: 1-10 rating
- **Topics**: Key subjects (3-5)
- **Summary**: 2-3 line overview
- **Key Points**: Main takeaways

---

## Roadmap

### Completed

-  Voice conversation system
-  Call analytics (sentiment, quality)
-  Agent templates library
-  Call history & filtering
-  Authentication with remember-me
-  Export call data

### Upcoming

-  Advanced analytics dashboard
-  Webhook support
-  Knowledge base integration
-  Multi-language support
-  Advanced agent customization
-  Team collaboration features

---

## Links

- **Live Demo**: https://voxora.arpweb.in
- **Documentation**: [docs/](./docs/)
- **GitHub Issues**: https://github.com/your-repo/issues
- **API Reference**: [docs/API_ROUTES.md](./docs/API_ROUTES.md)
- **Database Schema**: [docs/DATABASE.md](./docs/DATABASE.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

