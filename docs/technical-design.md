# Echo Language Learning POC - Technical Design

## Overview

This document outlines the technical architecture for Echo's Language Learning POC. The goal is to build a distributable, offline-first iPhone app that helps users activate their accumulated materials for language expression.

## Core Vision

Help users truly use language to express their feelings and ideas by activating and understanding their language skills deeply.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   UI Layer    │  │   UI Layer    │  │   UI Layer   │ │
│  │  (Screens)    │  │ (Components)  │  │ (Navigation) │ │
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘ │
│          └──────────────────┼─────────────────┘         │
│                             ▼                            │
│  ┌──────────────────────────────────────────────────────┐
│  │              Core Module (TypeScript)                 │
│  │  ┌────────────┐ ┌────────────┐ ┌───────────────┐     │
│  │  │ Materials  │ │ Activation │ │ Echo Session  │     │
│  │  │  Service   │ │  Service   │ │   Service     │     │
│  │  └────────────┘ └────────────┘ └───────────────┘     │
│  │  ┌────────────┐ ┌────────────┐ ┌───────────────┐     │
│  │  │  Insight   │ │    AI      │ │    Sync       │     │
│  │  │  Service   │ │  Service   │ │   Service     │     │
│  │  └────────────┘ └────────────┘ └───────────────┘     │
│  └──────────────────────┬───────────────────────────────┘
│                         ▼                                │
│  ┌──────────────────────────────────────────────────────┐
│  │           Local Data Layer (SQLite)                   │
│  │  • Raw Materials  • Activation Cards  • Sessions     │
│  │  • Embeddings Cache  • User Preferences              │
│  └──────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
                            │
                            ▼ (when online)
              ┌─────────────────────────────────┐
              │      Backend Service            │
              │  • AI Orchestration (LLM)       │
              │  • Embedding Generation         │
              │  • Vector Search (FAISS)        │
              └─────────────────────────────────┘
```

## Design Principles

### 1. Offline-First
The app must be fully functional for core features without network connectivity.

| Feature | Offline | Online |
|---------|---------|--------|
| Browse Raw Library | Full access | Sync new items |
| View cached Activation Cards | Yes | Generate new ones |
| Echo Session (writing) | Save locally | AI feedback when connected |
| Insight | Cached data | Refresh analytics |

### 2. Reusable Core Module
Business logic lives in a pure TypeScript package (`@echo/core`) with:
- No React Native dependencies
- Clean interfaces that can be reimplemented in Swift
- Domain models shared across layers

### 3. Future Swift Migration Path
- SQLite database format compatible with Swift (Core Data / GRDB)
- Backend API remains the same
- Core interfaces documented for reimplementation

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| App Framework | React Native + Expo | Fast development, TypeScript, good iOS support |
| Language | TypeScript | Type safety, reusable logic |
| UI Components | Tamagui or NativeWind | Native feel, good DX |
| Local DB | expo-sqlite + Drizzle ORM | Offline-first, Swift-compatible |
| State Management | Zustand + React Query | Simple, performant |
| Backend | Node.js + Hono | Lightweight, TypeScript |
| AI | OpenAI API (GPT-4-mini + embeddings) | Quality + cost balance |
| Vector Store | FAISS | Fast similarity search |
| Deployment | Expo EAS → TestFlight | Streamlined iOS distribution |

## Project Structure

```
echo/
├── apps/
│   └── mobile/          # React Native Expo app
│       ├── app/         # Screens (Expo Router)
│       ├── components/  # UI components
│       ├── hooks/       # React hooks
│       └── assets/      # Images, fonts
├── packages/
│   └── core/            # Shared business logic
│       ├── services/    # Domain services
│       ├── models/      # Data models
│       ├── agents/      # AI agents & prompt templates
│       └── db/          # Database schema & queries
├── server/              # Backend API
│   ├── routes/          # API endpoints
│   ├── services/        # AI orchestration
│   └── vector/          # FAISS integration
└── docs/                # Documentation
```

## Data Models (Core)

### RawMaterial
```typescript
interface RawMaterial {
  id: string;
  content: string;
  note?: string;           // User's annotation
  source: 'manual' | 'import' | 'chat';
  createdAt: Date;
  embedding?: number[];    // Cached embedding vector
}
```

### ActivationCard
```typescript
interface ActivationCard {
  id: string;
  emotionalAnchor: string;    // Layer 1: Pull user back
  livedExperience: string;    // Layer 2: User's own words
  expressions: string[];      // Layer 3: Language chunks
  invitation: string;         // Layer 4: Gentle prompt
  materialIds: string[];      // Linked raw materials
  generatedAt: Date;
}
```

### EchoSession
```typescript
interface EchoSession {
  id: string;
  activationCardId?: string;
  messages: SessionMessage[];
  finalExpression?: string;   // User's claimed output
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  completedAt?: Date;
}

interface SessionMessage {
  role: 'user' | 'echo';
  content: string;
  timestamp: Date;
}
```

## API Endpoints (Backend)

```
POST /api/materials/embed     # Generate embeddings for materials
POST /api/activation/generate # Generate activation card from materials
POST /api/session/feedback    # Get AI feedback during session
GET  /api/insights/themes     # Get user's theme analysis
POST /api/sync                # Sync offline changes
```

## Offline Sync Strategy

1. **Local-first writes**: All user actions write to SQLite immediately
2. **Background sync**: When online, queue syncs to backend
3. **Conflict resolution**: Last-write-wins for simple POC
4. **Embedding cache**: Store embeddings locally after generation

## Next Steps

1. Initialize monorepo structure (apps/, packages/, server/)
2. Set up Expo project with basic navigation
3. Implement SQLite schema and Drizzle ORM
4. Build Raw Library screen (capture + display)
5. Implement backend AI endpoints
6. Build Activation Flow
7. Build Echo Session
8. Build Insight screen
